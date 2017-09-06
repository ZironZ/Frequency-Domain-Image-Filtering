'use strict';
//Global CPU fft objects
var aFFT = null,
    savedFFT = null,
    files = null;

//Enable all the jQuery UI buttons
$('#Pipe').buttonset();
$('#Hann').buttonset();
$('#Blue').buttonset();
$('#FilterType').buttonset();
$('#FilterTypeGPU').buttonset();
$('#FilterStyle').buttonset();
$('#WipeMeasure').button();
$('#WipeNotch').button();
$('#ViewType').buttonset();
$('#ViewTypeGPU').buttonset();
$('#ApplyFilter').button();
$('#ZoomIn').button();
$('#ZoomOut').button();
$('#LockToImageRez').button();
$('#SaveSpec').button();
$('#SaveResult').button();

/* This function activates immediately and sets up a listener
 * for file uploads.
 */
window.onload = function () {
    var input = document.getElementById("input");
    input.addEventListener('change', handleFile);
    cornerstone.enable(origWrapper);
    $("#OrigWrapper").find("canvas")[0].id = "Original";
    orig = document.getElementById("Original").getContext('2d');
};

$('#Pipe').change(function (event) {
    if (event.target.value === 'PipeCPU') {
        $('#BlueWrapper').show();
    } else {
        $('#BlueWrapper').hide();
    }
});

/* This unbinds the various event handlers.
 */
function unbindHandlers() {
    $('#FilterType').off('change');
    $('#FilterTypeGPU').off('change');
    /*$('.Slider').slider({
     change: function(event, ui) {
     return false;
     }
     });*/
    if($('.Slider').hasClass("ui-slider")) {
        $('.Slider').slider('destroy');
    }
    $('#WipeButtonMeasure').off('click');
    $('#WipeButtonNotch').off('click');
    $('#ViewType').off('change');
    $('#ViewTypeGPU').off('change');
    $('#ZoomIn').off('click');
    $('#ZoomOut').off('click');
    $('#LockToImageRez').off('click');
    $('#ApplyFilter').off('click');
    $('#SaveSpec').off('click');
    $('#SaveResult').off('click');
    curve.removeListeners();
}

var setImageAttributes = function(image, isDicom) {
    imgWidth = image.width;
    imgHeight = image.height;
    largestSide = imgWidth > imgHeight ? imgWidth : imgHeight;
    specWidth = Math.pow(2, Math.ceil(Math.log(largestSide) / Math.log(2)));
    resolution2 = specHeight = specWidth;
    zoomImgWidth = imgWidth;
    zoomImgHeight = imgHeight;
    zoomSpecWidth = specWidth;
    zoomSpecHeight = specHeight;

    if (!isDicom) {
        $(origWrapper).width(imgWidth);
        $(origWrapper).height(imgHeight);
        orig.canvas.width = imgWidth;
        orig.canvas.height = imgHeight;
        orig.drawImage(image, 0, 0);
    }
};

var setupUI = function() {
    //Set every canvas to the correct size
    spectrum.canvas.width = measureSpec.canvas.width = notchSpec.canvas.width = specWidth;
    spectrum.canvas.height = measureSpec.canvas.height = notchSpec.canvas.height = specHeight;
    result.canvas.width = imgWidth;
    result.canvas.height = imgHeight;

    ratioX = specWidth / imgWidth;
    ratioY = specHeight / imgHeight;
    zoomLevel = 1;
    rect = {};

    //Needed to reset for the zoom in/out
    $("#Original").css({'width': imgWidth, 'height': imgHeight});
    $("#Result").css({'width': imgWidth, 'height': imgHeight});
    $("#ResultGPU").css({'width': imgWidth, 'height': imgHeight});
    $("#NotchWrapper").css({'width': specWidth, 'height': specHeight});
    $("#Spectrum").css({'width': specWidth, 'height': specHeight});
    $("#NotchSpec").css({'width': specWidth, 'height': specHeight});

    //Show the UI and configure the settings so that they display correctly
    $('#OrigLabel').show();
    $('#ImageHider').show();
    $('#CommandsHider').show();
    $('#Measure').attr('checked', 'Measure').button('refresh');
    $('#Basic').attr('checked', 'Basic').button('refresh');
    $('#BasicGPU').attr('checked', 'Basic').button('refresh');
    $('#Ideal').attr('checked', 'Ideal').button('refresh');

    //Clear the canvas objects
    spectrum.fillStyle = '#000000';
    spectrum.fillRect(0, 0, specWidth, specHeight);
    result.fillStyle = '#000000';
    result.fillRect(0, 0, result.canvas.width, result.canvas.height);

    //Clear old measurements
    $("#MeasInfo").html("");

    curve = new Curve(document.getElementById('Editor'), {
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

    curve.add(CURVE_CANVAS_WIDTH/2, CURVE_CANVAS_HEIGHT_HALF);
    filterArray = new Float32Array(CURVE_CANVAS_WIDTH);
    for (var i = 0; i < CURVE_CANVAS_WIDTH; i++) {
        filterArray[i] = 1;
    }
};

function loadFile(files) {
    if (first === false) {
        unbindHandlers();
    }

    var reader = new FileReader;
    var anImage = new Image;

    reader.onload = function (event) {
        var processImage = processImageCPU;
        if ($('input[name=pipeline]:checked').val() === 'PipeGPU') {
            processImage = processImageGPU;
        }

        //Check if the file is a dicom file and handle dicom differently than regular images
        var extension = files[0].name.split('.').pop().toLowerCase();
        if (extension === 'dcm') {
            var imageId = cornerstoneWADOImageLoader.fileManager.add(files[0]);
            cornerstone.loadImage(imageId).then(function (image) {
                $(origWrapper).height(image.height);
                $(origWrapper).width(image.width);
                cornerstone.resize(origWrapper, true);

                cornerstone.displayImage(origWrapper, image);
                var viewport = cornerstone.getDefaultViewportForImage(origWrapper, image);
                cornerstone.setViewport(origWrapper, viewport);

                anImage.src = orig.canvas.toDataURL("image/png");
                processImage(anImage, true);
            });
        } else {
            anImage.src = event.target.result;
            processImage(anImage, false);
        }
    };
    if (files[0]) {
        reader.readAsDataURL(files[0]);
    }
}

/* This function reads in a file.
 */
function handleFile(event) {
    //Get file list for later use
    var tgt = (event.target) || (window.event.srcElement);
    files = tgt.files;

    loadFile(files, event);
}

if (!hasWebGLSupportWithExtensions(['OES_texture_float'])) {
    $('#Pipe').buttonset( "option", "disabled", true );
    $('<div class="webglUnavailable"><p>Defaulting to CPU since WebGL is unavailable.</p></div>').insertAfter($('#PipeWrapper').children('label'));
} else {
    //
}