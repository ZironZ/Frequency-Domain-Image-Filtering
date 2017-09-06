var FULLSCREEN_VERTEX_SOURCE = [
    'attribute vec2 a_position;',
    'varying vec2 v_coordinates;',

    'void main (void) {',
    'v_coordinates = a_position * 0.5 + 0.5;',
    'gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
].join('\n');

//This implementation is based on the paper "Fast Computation of General Fourier Transforms on GPUs" by Microsoft Research
var SUBTRANSFORM_FRAGMENT_SOURCE = [
    'precision highp float;',

    'const float PI = 3.14159265;',

    'uniform sampler2D u_input;',

    'uniform float u_resolution;',
    'uniform float u_subtransformSize;',

    'uniform bool u_horizontal;',
    'uniform bool u_forward;',
    'uniform bool u_normalize;',

    'vec2 multiplyComplex (vec2 a, vec2 b) {',
    'return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);',
    '}',

    'void main (void) {',

    'float index = 0.0;',
    'if (u_horizontal) {',
    'index = gl_FragCoord.x - 0.5;',
    '} else {',
    'index = gl_FragCoord.y - 0.5;',
    '}',

    'float evenIndex = floor(index / u_subtransformSize) * (u_subtransformSize / 2.0) + mod(index, u_subtransformSize / 2.0);',

    'vec4 even = vec4(0.0), odd = vec4(0.0);',

    'if (u_horizontal) {',
    'even = texture2D(u_input, vec2(evenIndex + 0.5, gl_FragCoord.y) / u_resolution);',
    'odd = texture2D(u_input, vec2(evenIndex + u_resolution * 0.5 + 0.5, gl_FragCoord.y) / u_resolution);',
    '} else {',
    'even = texture2D(u_input, vec2(gl_FragCoord.x, evenIndex + 0.5) / u_resolution);',
    'odd = texture2D(u_input, vec2(gl_FragCoord.x, evenIndex + u_resolution * 0.5 + 0.5) / u_resolution);',
    '}',

    //normalisation
    'if (u_normalize) {',
    'even /= (u_resolution * u_resolution);',
    'odd /= (u_resolution * u_resolution);',
    '}',

    'float twiddleArgument = 0.0;',
    'if (u_forward) {',
    'twiddleArgument = 2.0 * PI * (index / u_subtransformSize);',
    '} else {',
    'twiddleArgument = -2.0 * PI * (index / u_subtransformSize);',
    '}',
    'vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));',

    'vec2 outputA = even.rg + multiplyComplex(twiddle, odd.rg);',
    'vec2 outputB = even.ba + multiplyComplex(twiddle, odd.ba);',

    'gl_FragColor = vec4(outputA, outputB);',
    '}'
].join('\n');

var FILTER_FRAGMENT_SOURCE = [
    'precision highp float;',

    'uniform sampler2D u_input;',
    'uniform float u_resolution;',

    'uniform sampler2D u_notch;',
    'uniform float u_maxEditFrequency;',

    'uniform sampler2D u_filter;',

    'float or(float x, float y) {',
    'return min(x + y, 1.0);',
    '}',

    'float not(float x) {',
    'return 1.0 - x;',
    '}',

    'void main (void) {',
    'vec2 coordinates = gl_FragCoord.xy - 0.5;',
    'float xFrequency = (coordinates.x < u_resolution * 0.5) ? coordinates.x : coordinates.x - u_resolution;',
    'float yFrequency = (coordinates.y < u_resolution * 0.5) ? coordinates.y : coordinates.y - u_resolution;',

    'float frequency = sqrt(xFrequency * xFrequency + yFrequency * yFrequency);',

    'float gain = texture2D(u_filter, vec2(frequency / u_maxEditFrequency, 0.5)).r;',
    'vec4 originalPower = texture2D(u_input, coordinates/u_resolution);',

    'float notch = texture2D(u_notch, vec2((coordinates/u_resolution) - 0.5)).a;',
    'notch = not(notch);',

    'gl_FragColor = originalPower * gain * notch;',
    '}',
].join('\n');

var SPECTRUM_FRAGMENT_SOURCE = [
    'precision highp float;',

    'varying vec2 v_coordinates;',

    'uniform bool u_phase;',
    'uniform sampler2D u_spectrum;',
    'uniform float u_resolution;',

    'vec2 multiplyByI (vec2 z) {',
    'return vec2(-z[1], z[0]);',
    '}',

    'vec2 conjugate (vec2 z) {',
    'return vec2(z[0], -z[1]);',
    '}',

    'void main (void) {',
    'vec2 coordinates = v_coordinates - 0.5;',

    'vec4 z = texture2D(u_spectrum, coordinates);',
    'vec4 zStar = texture2D(u_spectrum, 1.0 - coordinates + 1.0 / u_resolution);',
    'zStar = vec4(conjugate(zStar.rg), conjugate(zStar.ba));',

    'vec2 r = 0.5 * (z.rg + zStar.rg);',
    'vec2 g = -0.5 * multiplyByI(z.rg - zStar.rg);',
    'vec2 b = z.ba;',

    'if (u_phase) {',
    //This appears to be a bit off compared to the CPU implementation
    'float rPower = atan(r[0], r[1]);',
    'float gPower = atan(g[0], g[1]);',
    'float bPower = atan(b[0], b[1]);',

    'gl_FragColor.r = rPower;',
    'gl_FragColor.g = gPower;',
    'gl_FragColor.b = bPower;',
    'gl_FragColor.a = 1.0;',
    '} else {',
    //Equivalent to Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    'float rPower = length(r);',
    'float gPower = length(g);',
    'float bPower = length(b);',

    //This is an arbitrary scaling factor that gives results similar to the CPU's dampened scaling
    'gl_FragColor.r = log(rPower)/ log(u_resolution * u_resolution);',
    'gl_FragColor.g = log(gPower)/ log(u_resolution * u_resolution);',
    'gl_FragColor.b = log(bPower)/ log(u_resolution * u_resolution);',
    'gl_FragColor.a = 1.0;',
    '}',
    '}',
].join('\n');

var IMAGE_FRAGMENT_SOURCE = [
    'precision highp float;',

    'varying vec2 v_coordinates;',

    'uniform vec2 u_resolution;',
    'uniform float u_resolution2;',

    'uniform sampler2D u_texture;',
    'uniform sampler2D u_spectrum;',

    'void main (void) {',
    'vec2 padding = vec2(u_resolution2 - u_resolution.xy);',
    'vec3 image = vec3(0.0, 0.0, 0.0);',
    'image = texture2D(u_texture, vec2(gl_FragCoord.x/u_resolution2, 1.0 - ((gl_FragCoord.y + padding.y)/u_resolution2))).rgb;',
    'gl_FragColor = vec4(image, 1.0);',
    '}',
].join('\n');

var WINDOW_FRAGMENT_SOURCE = [
    'precision highp float;',

    'const float PI = 3.14159265;',

    'varying vec2 v_coordinates;',

    'uniform bool u_windowed;',

    'uniform vec2 u_resolution;',
    'uniform float u_resolution2;',

    'uniform sampler2D u_texture;',
    'uniform sampler2D u_spectrum;',

    'void main (void) {',
    'vec2 padding = vec2((u_resolution2 - u_resolution.x)/(u_resolution2/u_resolution.x), (u_resolution2 - u_resolution.y)/(u_resolution2/u_resolution.y));',
    'vec3 image = vec3(0.0, 0.0, 0.0);',

    'if (gl_FragCoord.x < u_resolution.x && gl_FragCoord.y < u_resolution.y) {',
    'float windowXY = 1.0;',
    'if (u_windowed) {',
    'vec2 coordinates = gl_FragCoord.xy;',
    'float xCoor = 2.0 * (coordinates.x/ u_resolution.x) - 1.0;',
    'float yCoor = 2.0 * (coordinates.y/ u_resolution.y) - 1.0;',

    'float radiusXY = sqrt(xCoor * xCoor + yCoor * yCoor);',
    'windowXY = 0.0;',
    'if (radiusXY >= 0.0 && radiusXY < 1.0) {',
    'windowXY = 0.5 * (cos(PI * radiusXY) + 1.0);',
    '}',
    '}',

    'image = texture2D(u_texture, vec2((gl_FragCoord.xy)/u_resolution.xy)).rgb * windowXY;',
    '}',

    'gl_FragColor = vec4(image, 1.0);',
    '}',
].join('\n');

var Filterer = function (canvas, spectrum, notchSpec) {
    var canvas = canvas;
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    gl.getExtension('OES_texture_float');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    var imageTexture,
        pingTexture,
        pongTexture,
        notchTexture,
        filterTexture,
        originalSpectrumTexture,
        filteredSpectrumTexture,
        filteredImageTexture,
        readoutSpecTexture;

    var pingFramebuffer = buildFramebuffer(gl),
        pongFramebuffer = buildFramebuffer(gl),
        originalSpectrumFramebuffer = buildFramebuffer(gl),
        filteredSpectrumFramebuffer = buildFramebuffer(gl),
        filteredImageFramebuffer = buildFramebuffer(gl),
        readoutSpecFramebuffer = buildFramebuffer(gl);

    var fullscreenVertexShader = buildShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX_SOURCE);

    var subtransformProgramWrapper = buildProgramWrapper(gl,
        fullscreenVertexShader,
        buildShader(gl, gl.FRAGMENT_SHADER, SUBTRANSFORM_FRAGMENT_SOURCE), {
            'a_position': 0
        });

    var spectrumReadProgram = buildProgramWrapper(gl,
        fullscreenVertexShader,
        buildShader(gl, gl.FRAGMENT_SHADER, SPECTRUM_FRAGMENT_SOURCE), {
            'a_position': 0
        });

    var imageProgram = buildProgramWrapper(gl,
        fullscreenVertexShader,
        buildShader(gl, gl.FRAGMENT_SHADER, IMAGE_FRAGMENT_SOURCE), {
            'a_position': 0
        });

    var windowProgram = buildProgramWrapper(gl,
        fullscreenVertexShader,
        buildShader(gl, gl.FRAGMENT_SHADER, WINDOW_FRAGMENT_SOURCE), {
            'a_position': 0
        });

    var filterProgram = buildProgramWrapper(gl,
        fullscreenVertexShader,
        buildShader(gl, gl.FRAGMENT_SHADER, FILTER_FRAGMENT_SOURCE), {
            'a_position': 0
        });

    var fullscreenVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var iterations = log2(resolution2) * 2;

    this.cleanupImage = function () {
        gl.deleteTexture(pingTexture);
        gl.deleteTexture(pongTexture);
        gl.deleteTexture(notchTexture);
        gl.deleteTexture(filterTexture);
        gl.deleteTexture(originalSpectrumTexture);
        gl.deleteTexture(filteredSpectrumTexture);
        gl.deleteTexture(filteredImageTexture);
        gl.deleteTexture(readoutSpecTexture);
    };

    this.setupImage = function () {
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        spectrum.width = resolution2;
        spectrum.height = resolution2;
        notchSpec.width = resolution2;
        notchSpec.height = resolution2;

        var end_edit_frequency = Math.floor(Math.sqrt((resolution2/2) * (resolution2/2) * 2));

        pingTexture = buildTexture(gl, PING_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.FLOAT, resolution2, resolution2, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);
        pongTexture = buildTexture(gl, PONG_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.FLOAT, resolution2, resolution2, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);
        notchTexture = buildTexture(gl, NOTCH_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resolution2, resolution2, null, gl.REPEAT, gl.REPEAT, gl.NEAREST, gl.NEAREST);
        filterTexture = buildTexture(gl, FILTER_TEXTURE_UNIT, gl.LUMINANCE, gl.LUMINANCE, gl.FLOAT, resolution2, 1, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);
        originalSpectrumTexture = buildTexture(gl, ORIGINAL_SPECTRUM_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.FLOAT, resolution2, resolution2, null, gl.REPEAT, gl.REPEAT, gl.NEAREST, gl.NEAREST);
        filteredSpectrumTexture = buildTexture(gl, FILTERED_SPECTRUM_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.FLOAT, resolution2, resolution2, null, gl.REPEAT, gl.REPEAT, gl.NEAREST, gl.NEAREST);
        filteredImageTexture = buildTexture(gl, FILTERED_IMAGE_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.FLOAT, resolution2, resolution2, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);
        readoutSpecTexture = buildTexture(gl, READOUT_SPEC_TEXTURE_UNIT, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resolution2, resolution2, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);

        pingFramebuffer = assignFramebuffer(gl, pingFramebuffer, pingTexture);
        pongFramebuffer = assignFramebuffer(gl, pongFramebuffer, pongTexture);
        originalSpectrumFramebuffer = assignFramebuffer(gl, originalSpectrumFramebuffer, originalSpectrumTexture);
        filteredSpectrumFramebuffer = assignFramebuffer(gl, filteredSpectrumFramebuffer, filteredSpectrumTexture);
        filteredImageFramebuffer = assignFramebuffer(gl, filteredImageFramebuffer, filteredImageTexture);
        readoutSpecFramebuffer = assignFramebuffer(gl, readoutSpecFramebuffer, readoutSpecTexture);

        gl.useProgram(subtransformProgramWrapper.program);
        gl.uniform1f(subtransformProgramWrapper.uniformLocations['u_resolution'], resolution2);

        gl.useProgram(spectrumReadProgram.program);
        gl.uniform1i(spectrumReadProgram.uniformLocations['u_spectrum'], FILTERED_SPECTRUM_TEXTURE_UNIT);
        gl.uniform1f(spectrumReadProgram.uniformLocations['u_resolution'], resolution2);

        gl.useProgram(imageProgram.program);
        gl.uniform1i(imageProgram.uniformLocations['u_texture'], FILTERED_IMAGE_TEXTURE_UNIT);
        gl.uniform2f(imageProgram.uniformLocations['u_resolution'], imgWidth, imgHeight);
        gl.uniform1f(imageProgram.uniformLocations['u_resolution2'], resolution2);

        gl.useProgram(windowProgram.program);
        gl.uniform2f(windowProgram.uniformLocations['u_resolution'], imgWidth, imgHeight);
        gl.uniform1f(windowProgram.uniformLocations['u_resolution2'], resolution2);

        gl.useProgram(filterProgram.program);
        gl.uniform1i(filterProgram.uniformLocations['u_input'], ORIGINAL_SPECTRUM_TEXTURE_UNIT);
        gl.uniform1i(filterProgram.uniformLocations['u_notch'], NOTCH_TEXTURE_UNIT);
        gl.uniform1i(filterProgram.uniformLocations['u_filter'], FILTER_TEXTURE_UNIT);
        gl.uniform1f(filterProgram.uniformLocations['u_resolution'], resolution2);
        gl.uniform1f(filterProgram.uniformLocations['u_maxEditFrequency'], end_edit_frequency);;

        iterations = log2(resolution2) * 2;
    };

    this.fft = function (inputTextureUnit, outputFramebuffer, width, height, direction) {
        gl.useProgram(subtransformProgramWrapper.program);
        gl.viewport(0, 0, width, height);
        gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_horizontal'], 1);
        gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_forward'], direction === FORWARD ? 1 : 0);
        for (var i = 0; i < iterations; i += 1) {
            if (i === 0) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pingFramebuffer);
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_input'], inputTextureUnit);
            } else if (i === iterations - 1) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_input'], PING_TEXTURE_UNIT);
            } else if (i % 2 === 1) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pongFramebuffer);
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_input'], PING_TEXTURE_UNIT);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pingFramebuffer);
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_input'], PONG_TEXTURE_UNIT);
            }

            if (direction === INVERSE && i === 0) {
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_normalize'], 1);
            } else if (direction === INVERSE && i === 1) {
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_normalize'], 0);
            }

            if (i === iterations / 2) {
                gl.uniform1i(subtransformProgramWrapper.uniformLocations['u_horizontal'], 0);
            }

            gl.uniform1f(subtransformProgramWrapper.uniformLocations['u_subtransformSize'], Math.pow(2, (i % (iterations / 2)) + 1));
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    };

    this.setImage = function (image) {
        gl.activeTexture(gl.TEXTURE0 + IMAGE_TEXTURE_UNIT);
        imageTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.activeTexture(gl.TEXTURE0 + ORIGINAL_SPECTRUM_TEXTURE_UNIT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution2, resolution2, 0, gl.RGBA, gl.FLOAT, null);

        gl.useProgram(windowProgram.program);
        gl.viewport(0, 0, resolution2, resolution2);
        gl.uniform1i(windowProgram.uniformLocations['u_texture'], IMAGE_TEXTURE_UNIT);
        if ($('input[name=winhann]:checked').val() === 'HannOn') {
            gl.uniform1i(windowProgram.uniformLocations['u_windowed'], 1);
        } else {
            gl.uniform1i(windowProgram.uniformLocations['u_windowed'], 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, pongFramebuffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.fft(PONG_TEXTURE_UNIT, originalSpectrumFramebuffer, resolution2, resolution2, FORWARD);
    };

    this.filter = function (filterArray, isInitial) {
        if (isInitial) {
            gl.useProgram(filterProgram.program);
            gl.uniform1i(filterProgram.uniformLocations['u_input'], ORIGINAL_SPECTRUM_TEXTURE_UNIT);
        }
        this.filtering(filterArray, isInitial);

        this.outputSpectrum();

        this.fft(FILTERED_SPECTRUM_TEXTURE_UNIT, filteredImageFramebuffer, resolution2, resolution2, INVERSE);

        this.outputImage();
    };

    this.outputSpectrum = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, readoutSpecFramebuffer);
        gl.useProgram(spectrumReadProgram.program);

        if ($('input[name=viewGPU]:checked').val() == 'Phase') {
            gl.uniform1i(spectrumReadProgram.uniformLocations['u_phase'], 1);
        } else {
            gl.uniform1i(spectrumReadProgram.uniformLocations['u_phase'], 0);
        }

        gl.viewport(0, 0, resolution2, resolution2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        var specPixels = new Uint8Array(resolution2 * resolution2 * 4);
        gl.readPixels(0, 0, resolution2, resolution2, gl.RGBA, gl.UNSIGNED_BYTE, specPixels);

        var imgData = document.getElementById("Spectrum").getContext("2d").createImageData(resolution2, resolution2); // width x height
        imgData.data.set(specPixels);
        document.getElementById("Spectrum").getContext("2d").putImageData(imgData, 0, 0);
    };

    this.filtering = function (filterArray, isInitial) {
        gl.activeTexture(gl.TEXTURE0 + FILTER_TEXTURE_UNIT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, filterArray.length, 1, 0, gl.LUMINANCE, gl.FLOAT, filterArray);

        gl.activeTexture(gl.TEXTURE0 + NOTCH_TEXTURE_UNIT);
        if (isInitial) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution2, resolution2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, document.getElementById("NotchSpec"));
        }

        gl.useProgram(filterProgram.program);

        gl.bindFramebuffer(gl.FRAMEBUFFER, filteredSpectrumFramebuffer);
        gl.viewport(0, 0, resolution2, resolution2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    this.outputImage = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(0, 0, imgWidth, imgHeight);
        gl.useProgram(imageProgram.program);
        gl.uniform2f(imageProgram.uniformLocations['u_resolution'], imgWidth, imgHeight);
        gl.uniform1f(imageProgram.uniformLocations['u_resolution2'], resolution2);
        gl.uniform1i(imageProgram.uniformLocations['u_texture'], FILTERED_IMAGE_TEXTURE_UNIT);
        gl.uniform1i(imageProgram.uniformLocations['u_spectrum'], FILTERED_SPECTRUM_TEXTURE_UNIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
};