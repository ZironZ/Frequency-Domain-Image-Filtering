var orig = null;
var origWrapper = document.getElementById("OrigWrapper");
var spectrum = document.getElementById("Spectrum").getContext("2d");
var measureSpec = document.getElementById("MeasureSpec").getContext("2d");
var notchSpec = document.getElementById("NotchSpec").getContext("2d");
var result = document.getElementById("Result").getContext("2d");
var curve = new Curve(document.getElementById('Editor'), {
    pointSize: 6,
    pointColor: 'black',
    selectionRadius: 20,
    addDistance: 20,
    overPointCursor: 'move',
    overCurveCursor: 'crosshair',
    defaultCursor: 'default',
    curveColor: 'black',
    backgroundColor: 'rgb(221, 221, 221)',
    minSpacing: 5
});
var filterArray = null;

var rect = {},
    first = true,
    lockedToRez = false,
    mouseX,
    mouseY,
    ratioX,
    ratioY,
    scaleX = 1.0,
    scaleY = 1.0,
    closeEnough = 10,
    zoomLevel = 1,
    dragTL = false,
    dragBL = false,
    dragTR = false,
    dragBR = false;

var imgWidth,
    imgHeight,
    largestSide,
    resolution2,
    specWidth,
    specHeight,
    zoomImgWidth,
    zoomImgHeight,
    zoomSpecWidth,
    zoomSpecHeight;

var PING_TEXTURE_UNIT = 0,
    PONG_TEXTURE_UNIT = 1,
    FILTER_TEXTURE_UNIT = 2,
    ORIGINAL_SPECTRUM_TEXTURE_UNIT = 3,
    FILTERED_SPECTRUM_TEXTURE_UNIT = 4,
    IMAGE_TEXTURE_UNIT = 5,
    FILTERED_IMAGE_TEXTURE_UNIT = 6,
    READOUT_SPEC_TEXTURE_UNIT = 7,
    NOTCH_TEXTURE_UNIT = 8;

var FORWARD = 0,
    INVERSE = 1;

var CURVE_CANVAS_WIDTH = 750.0;
var CURVE_CANVAS_HEIGHT_HALF = 75.0;

var log2 = function (x) {
    return Math.log(x) / Math.log(2);
};

var buildShader = function (gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    console.log(gl.getShaderInfoLog(shader));
    return shader;
};

var buildProgramWrapper = function (gl, vertexShader, fragmentShader, attributeLocations) {
    var programWrapper = {};

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    for (var attributeName in attributeLocations) {
        gl.bindAttribLocation(program, attributeLocations[attributeName], attributeName);
    }
    gl.linkProgram(program);
    var uniformLocations = {};
    var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < numberOfUniforms; i += 1) {
        var activeUniform = gl.getActiveUniform(program, i),
            uniformLocation = gl.getUniformLocation(program, activeUniform.name);
        uniformLocations[activeUniform.name] = uniformLocation;
    }

    programWrapper.program = program;
    programWrapper.uniformLocations = uniformLocations;

    return programWrapper;
};

var buildTexture = function (gl, unit, internalFormat, format, type, width, height, data, wrapS, wrapT, minFilter, magFilter) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    return texture;
};

var buildFramebuffer = function (gl) {
    var framebuffer = gl.createFramebuffer();
    return framebuffer;
};

var assignFramebuffer = function (gl, framebuffer, attachment) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, attachment, 0);
    return framebuffer;
};

var getMousePosition = function (event, element) {
    var boundingRect = element.getBoundingClientRect();
    return {
        x: event.clientX - boundingRect.left,
        y: event.clientY - boundingRect.top
    };
};

var clamp = function (x, min, max) {
    return Math.min(Math.max(x, min), max);
};

var hasWebGLSupportWithExtensions = function (extensions) {
    var canvas = document.createElement('canvas');
    var gl = null;
    try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
        return false;
    }
    if (gl === null) {
        return false;
    }

    for (var i = 0; i < extensions.length; ++i) {
        if (gl.getExtension(extensions[i]) === null) {
            return false
        }
    }

    return true;
};

measureSpec.measMouseMove = function (event) {
    scaleX = measureSpec.canvas.width / $('#MeasureSpec').outerWidth();
    scaleY = measureSpec.canvas.height / $('#MeasureSpec').outerHeight();
    mouseX = (event.pageX - this.offsetParent.offsetLeft) * scaleX;
    mouseY = (event.pageY - this.offsetParent.offsetTop) * scaleY;

    if (dragTL) {
        rect.w += rect.startX - mouseX;
        rect.h += rect.startY - mouseY;
        rect.startX = mouseX;
        rect.startY = mouseY;
    } else if (dragTR) {
        rect.w = mouseX - rect.startX;
        rect.h += rect.startY - mouseY;
        rect.startY = mouseY;
    } else if (dragBL) {
        rect.w += rect.startX - mouseX;
        rect.h = mouseY - rect.startY;
        rect.startX = mouseX;
    } else if (dragBR) {
        rect.w = mouseX - rect.startX;
        rect.h = mouseY - rect.startY;
    }
    measureSpec.clearRect(0, 0, measureSpec.canvas.width, measureSpec.canvas.height);
    measureSpec.drawBox();
};

measureSpec.measMouseDown = function (event) {
    scaleX = measureSpec.canvas.width / $('#MeasureSpec').outerWidth();
    scaleY = measureSpec.canvas.height / $('#MeasureSpec').outerHeight();
    mouseX = (event.pageX - this.offsetParent.offsetLeft) * scaleX;
    mouseY = (event.pageY - this.offsetParent.offsetTop) * scaleY;

    // if there isn't a rect yet
    if (typeof rect.w === "undefined" && typeof rect.h === "undefined") {
        rect.startX = mouseY;
        rect.startY = mouseX;
        dragBR = true;
    }

    // if there is, check which corner (if any) was clicked
    //
    // 4 cases:
    // 1. top left
    else if (checkCloseEnough(mouseX, rect.startX) && checkCloseEnough(mouseY, rect.startY)) {
        dragTL = true;
    }

    // 2. top right
    else if (checkCloseEnough(mouseX, rect.startX + rect.w) && checkCloseEnough(mouseY, rect.startY)) {
        dragTR = true;
    }

    // 3. bottom left
    else if (checkCloseEnough(mouseX, rect.startX) && checkCloseEnough(mouseY, rect.startY + rect.h)) {
        dragBL = true;
    }

    // 4. bottom right
    else if (checkCloseEnough(mouseX, rect.startX + rect.w) && checkCloseEnough(mouseY, rect.startY + rect.h)) {
        dragBR = true;
    }

    // (5.) none of them
    else {
        // handle not resizing
    }

    measureSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
    measureSpec.drawBox();
};

measureSpec.measMouseUp = function (event) {
    dragTL = dragTR = dragBL = dragBR = false;
};

var checkCloseEnough = function (p1, p2) {
    return Math.abs(p1 - p2) < closeEnough;
};

measureSpec.drawBox = function () {
    this.strokeStyle = "#80006A";
    this.lineWidth = 5 * zoomLevel;
    //this.lineWidth = 5;
    this.strokeRect(rect.startX, rect.startY, rect.w, rect.h);
    if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
        if (lockedToRez === true) {
            $("#MeasInfo").html("<p>Horizontal Rez: " + Math.round(Math.abs(rect.w) / ratioX) + "</br>Vertical Rez: " + Math.round(Math.abs(rect.h) / ratioY) + "</p>");
        } else {
            $("#MeasInfo").html("<p>Horizontal Rez: " + Math.round(Math.abs(rect.w) / ratioX) + "</br>Vertical Rez: " + Math.round(Math.abs(rect.h) / ratioY) + "</p>");
        }
    }
}

notchSpec.fillCircle = function (x, y) {
    var radius = $('#NotchSlider').slider("option", "value");
    this.fillStyle = "black";
    this.beginPath();
    this.moveTo(x, y);
    this.arc(x, y, radius, 0, Math.PI * 2, false);
    this.fill();
};

notchSpec.notchMouseMove = function (event) {
    if (!this.isDrawing) {
        return;
    }
    scaleX = notchSpec.canvas.width / $('#NotchSpec').outerWidth();
    scaleY = notchSpec.canvas.height / $('#NotchSpec').outerHeight();
    var x = (event.pageX - this.offsetParent.offsetLeft) * scaleX;
    var y = (event.pageY - this.offsetParent.offsetTop) * scaleY;
    notchSpec.fillCircle(x, y);

    var xStar = $('#NotchSpec').outerWidth() - (event.pageX - this.offsetParent.offsetLeft);
    xStar = xStar * scaleX;
    var yStar = $('#NotchSpec').outerHeight() - (event.pageY - this.offsetParent.offsetTop);
    yStar = yStar * scaleY;
    notchSpec.fillCircle(xStar, yStar);
};

notchSpec.notchMouseDown = function (event) {
    this.isDrawing = true;
    var x = (event.pageX - this.offsetParent.offsetLeft) * scaleX;
    var y = (event.pageY - this.offsetParent.offsetTop) * scaleY;
    notchSpec.fillCircle(x, y);

    var xStar = $('#NotchSpec').outerWidth() - (event.pageX - this.offsetParent.offsetLeft);
    xStar = xStar * scaleX;
    var yStar = $('#NotchSpec').outerHeight() - (event.pageY - this.offsetParent.offsetTop);
    yStar = yStar * scaleY
    notchSpec.fillCircle(xStar, yStar);
};

document.getElementById('gaussianFilter').onclick = function () {
    curve.setPoints([
        [11, 76],
        [56, 73],
        [187, 17],
        [314, 0]
    ]);
};

document.getElementById('sharpenFilter').onclick = function () {
    curve.setPoints([
        [173, 74],
        [252, 79],
        [416, 134],
        [521, 142]
    ]);
};

document.getElementById('edgeFilter').onclick = function () {
    curve.setPoints([
        [9, 0],
        [41, 2],
        [411, 122],
        [675, 150]
    ]);
};

document.getElementById('flatFilter').onclick = function () {
    curve.setPoints([
        [CURVE_CANVAS_WIDTH/2, CURVE_CANVAS_HEIGHT_HALF]
    ]);
};

var filterer = new Filterer(document.getElementById('ResultGPU'),
    document.getElementById('Spectrum'), document.getElementById('NotchSpec'));