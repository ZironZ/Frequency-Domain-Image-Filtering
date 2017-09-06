function bindHandlers() {
    $('#Pipe').change(function (event) {
        if (event.target.value === 'PipeCPU') {
            $('#BlueWrapper').show();
        } else {
            $('#BlueWrapper').hide();
        }
        event.stopImmediatePropagation();
        loadFile(files);
    });

    $('#Hann').change(function (event) {
        event.stopImmediatePropagation();
        loadFile(files);
    });

    $('#Blue').change(function (event) {
        event.stopImmediatePropagation();
        loadFile(files);
    });

    $('#FilterType').change(function (event) {
        if (event.target.value === 'Curve') {
            curve.triggerChartListener();
            $('#FilterStyleHider').hide();
            $('#RadiusSliderHider').hide();
            $('#ButterSliderHider').hide();
            $('#EditorWrapper').show();
        } else {
            $('#EditorWrapper').hide();
        }

        if (event.target.value === 'HighPass' || event.target.value === 'LowPass') {
            $('#FilterStyleHider').show();
            $('#RadiusSliderHider').show();
            if ($('input[name=fstyle]:checked').val() == 'Butter') {
                $('#ButterSliderHider').show();
            }

            applySpec(event.target.value);
            aFFT.deepCopy(savedFFT);
        }

        if (event.target.value === 'BandPass' || event.target.value === 'BandStop') {
            $('#BandSliderHider').show();

            $('#FilterStyleHider').show();
            $('#RadiusSliderHider').show();
            if ($('input[name=fstyle]:checked').val() == 'Butter') {
                $('#ButterSliderHider').show();
            }

            applySpec(event.target.value);
            aFFT.deepCopy(savedFFT);
        } else {
            $('#BandSliderHider').hide();
        }

        if (event.target.value === 'Sharpen') {
            $('#SharpSliderHider').show();

            $('#FilterStyleHider').show();
            $('#RadiusSliderHider').show();
            if ($('input[name=fstyle]:checked').val() == 'Butter') {
                $('#ButterSliderHider').show();
            }

            applySpec(event.target.value);
            aFFT.deepCopy(savedFFT);
        } else {
            $('#SharpSliderHider').hide();
        }

        /* For the notch and measurement filters we need to bind/unbind
         * a number of custom event handlers relating the mouse movement
         * over the (notch)spectrum display.
         */
        if (event.target.value === 'Notch') {
            $('#FilterStyleHider').hide();
            $('#RadiusSliderHider').hide();
            $('#ButterSliderHider').hide();
            $('#NotchSliderHider').show();
            $('#WipeNotchHider').show();
            $("#NotchSpec").on("mousemove", notchSpec.notchMouseMove);
            $("#NotchSpec").on("mousedown", notchSpec.notchMouseDown);
            $("#NotchSpec").on("mouseup", notchSpec.notchMouseUp);
            $("#NotchSpec").on("touchmove", notchSpec.notchMouseMove);
            $("#NotchSpec").on("touchstart", notchSpec.notchMouseDown);
            $("#NotchSpec").on("touchend", notchSpec.notchMouseUp);
            $("#NotchSpec").css("z-index", 10000);

            applySpec('no filter');
            aFFT.deepCopy(savedFFT);
        } else {
            $('#NotchSliderHider').hide();
            $('#WipeNotchHider').hide();
            $("#NotchSpec").off("mousemove", notchSpec.notchMouseMove);
            $("#NotchSpec").off("mousedown", notchSpec.notchMouseDown);
            $("#NotchSpec").off("mouseup", notchSpec.notchMouseUp);
            $("#NotchSpec").off("touchmove", notchSpec.notchMouseMove);
            $("#NotchSpec").off("touchstart", notchSpec.notchMouseDown);
            $("#NotchSpec").off("touchend", notchSpec.notchMouseUp);
            $("#NotchSpec").css("z-index", -1);
        }

        if (event.target.value === 'Measure') {
            $('#FilterStyleHider').hide();
            $('#RadiusSliderHider').hide();
            $('#ButterSliderHider').hide();
            $('#MeasInfoHider').show();
            $('#WipeMeasureHider').show();
            $("#MeasureSpec").on("mousemove", measureSpec.measMouseMove);
            $("#MeasureSpec").on("mousedown", measureSpec.measMouseDown);
            $("#MeasureSpec").on("mouseup", measureSpec.measMouseUp);
            $("#MeasureSpec").on("touchmove", measureSpec.measMouseMove);
            $("#MeasureSpec").on("touchstart", measureSpec.measMouseDown);
            $("#MeasureSpec").on("touchend", measureSpec.measMouseUp);
            $("#MeasureSpec").css("z-index", 10000);

            applySpec('no filter');
            aFFT.deepCopy(savedFFT);
            if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
                measureSpec.drawBox();
            }
        } else {
            $('#MeasInfoHider').hide();
            $('#WipeMeasureHider').hide();
            $("#MeasureSpec").off("mousemove", measureSpec.measMouseMove);
            $("#MeasureSpec").off("mousedown", measureSpec.measMouseDown);
            $("#MeasureSpec").off("mouseup", measureSpec.measMouseUp);
            $("#MeasureSpec").off("touchmove", measureSpec.measMouseMove);
            $("#MeasureSpec").off("touchstart", measureSpec.measMouseDown);
            $("#MeasureSpec").off("touchend", measureSpec.measMouseUp);
            $("#MeasureSpec").css("z-index", -1);
            measureSpec.clearRect(0, 0, measureSpec.canvas.width, measureSpec.canvas.height);
        }
    });

    $('#FilterStyle').change(function (event) {
        if (event.target.value === 'Butter') {
            $('#ButterSliderHider').show();
        } else {
            $('#ButterSliderHider').hide();
        }
        applySpec($('input[name=ftype]:checked').val());
        deepCopy(savedFFT, aFFT);
    });

    /* This event handler deals with changes to all the sliders
     * except the notch brush size slider.
     * It redraws the spectrum after every change.
     */
    $('.Slider').slider({
        change: function (event, ui) {
            if ($('input[name=ftype]:checked').val() !== 'Notch') {
                applySpec($('input[name=ftype]:checked').val());
                aFFT.deepCopy(savedFFT);
            }
        }
    });

    curve.chartListener = (function () {
        filterArray = new Float32Array(CURVE_CANVAS_WIDTH);

        curve.iterate(0, CURVE_CANVAS_WIDTH - 1, 1, function (x, y) {
            filterArray[x] = Math.max(0.0, y / CURVE_CANVAS_HEIGHT_HALF);
        });

        applySpec('Curve');
        aFFT.deepCopy(savedFFT);
    });
    curve.setupListeners();

    /* This event handler deals with wiping away the measure spectrum.
     */
    $('#WipeMeasure').click(function () {
        measureSpec.clearRect(0, 0, measureSpec.canvas.width, measureSpec.canvas.height);
        rect = {};
        $("#MeasInfo").html("");
    });

    /* This event handler deals with wiping away the notch spectrum.
     */
    $('#WipeNotch').click(function () {
        notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
        applySpec($('input[name=ftype]:checked').val());
        applyChanges();
    });

    /* This event handler deals with changes to the spectrum display type.
     * It obviously redraws the spectrum after every change.
     */
    $('#ViewType').change(function (event) {
        applySpec($('input[name=ftype]:checked').val());
        aFFT.deepCopy(savedFFT);
    });

    /* This event handler deals with the zoom in button.
     */
    $('#ZoomIn').click(function () {
        zoomImgWidth = zoomImgWidth << 1;
        zoomImgHeight = zoomImgHeight << 1;
        zoomSpecWidth = zoomSpecWidth << 1;
        zoomSpecHeight = zoomSpecHeight << 1;
        zoomLevel = zoomLevel / 2;

        $("#Original").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#Result").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#ResultWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        if (lockedToRez == true) {
            $("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#MeasureSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        } else {
            $("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#MeasureSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
        }

        if ($('input[name=ftype]:checked').val() === 'Measure') {
            if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
                measureSpec.clearRect(0, 0, measureSpec.canvas.width, measureSpec.canvas.height);
                measureSpec.drawBox();
            }
        }
    });

    /* This event handler deals with the zoom out button.
     */
    $('#ZoomOut').click(function () {
        if (zoomImgWidth > 32) {
            zoomImgWidth = zoomImgWidth >> 1;
            zoomImgHeight = zoomImgHeight >> 1;
            zoomSpecWidth = zoomSpecWidth >> 1;
            zoomSpecHeight = zoomSpecHeight >> 1;
            zoomLevel = zoomLevel * 2;
        }

        $("#Original").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#Result").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#ResultWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        if (lockedToRez == true) {
            $("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#MeasureSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        } else {
            $("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#MeasureSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
        }

        if ($('input[name=ftype]:checked').val() === 'Measure') {
            if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
                measureSpec.clearRect(0, 0, measureSpec.canvas.width, measureSpec.canvas.height);
                measureSpec.drawBox();
            }
        }
    });

    /* This event handler deals with locking the image.
     */
    $('#LockToImageRez').click(function () {
        $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#ResultWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});

        if (lockedToRez == true) {
            lockedToRez = false;
            $("#LockToImageRez").button("option", "label", "Lock to Image Resolution");
            $("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#MeasureSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
        } else {
            lockedToRez = true;
            $("#LockToImageRez").button("option", "label", "Unlock from Image Resolution");
            $("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#MeasureSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        }
    });

    /* This event handler deals with the apply filter button.
     * It redraws the spectrum and draws out the filtered image.
     */
    $('#ApplyFilter').click(function () {
        if ($('input[name=ftype]:checked').val() === 'Curve') {
            filterArray = new Float32Array(CURVE_CANVAS_WIDTH);

            curve.iterate(0, CURVE_CANVAS_WIDTH - 1, 1, function (x, y) {
                filterArray[x] = Math.max(0.0, y / CURVE_CANVAS_HEIGHT_HALF);
            });

            applySpec('Curve');
            applyChanges();
        } else {
            applySpec($('input[name=ftype]:checked').val())
            applyChanges();
        }
    });

    /* This event handler deals with the save spectrum button.
     * It opens a new window that contains the spectrum.
     */
    $('#SaveSpec').click(function () {
        var win = window.open();
        win.document.write('<img src="' + document.querySelector('#Spectrum').toDataURL() + '"/>');
        win.document.close();
    });

    /* This event handler deals with the save result button.
     * It opens a new window that contains the filtered image.
     */
    $('#SaveResult').click(function () {
        var win = window.open();
        win.document.write('<img src="' + document.querySelector('#Result').toDataURL() + '"/>');
        win.document.close();
    });
}

/* This is works like the lock resolution button
 * but without the state assignments.
 */
function initalLockRez() {
    $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
    $("#ResultWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});

    if (first === true) {
        lockedToRez = true;
        $("#LockToImageRez").button("option", "label", "Unlock from Image Resolution");
        $("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#MeasureSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        first = false;
    } else {
        if (lockedToRez === true) {
            $("#LockToImageRez").button("option", "label", "Unlock from Image Resolution");
            $("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
            $("#MeasureSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        } else {
            $("#LockToImageRez").button("option", "label", "Lock to Image Resolution");
            $("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
            $("#MeasureSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
        }
    }
}

/* This function performs filtering on the image's FFT
 * and draws out the result to the spectrum canvas.
 */
function applySpec(filterType) {
    var radius = $('#RadiusSlider').slider('option', 'value'),
        bandwidth = $('#BandSlider').slider('option', 'value'),
        sharpness = $('#SharpSlider').slider('option', 'value'),
        butterOrder = $('#ButterSlider').slider('option', 'value'),
        filterStyle = $('input[name=fstyle]:checked').val();

    aFFT.Filtering.shiftQuads();

    if (filterType === 'HighPass') {
        aFFT.Filtering.highPass(radius, filterStyle, butterOrder);
    } else if (filterType === 'LowPass') {
        aFFT.Filtering.lowPass(radius, filterStyle, butterOrder);
    } else if (filterType === 'BandPass') {
        aFFT.Filtering.bandPass( radius, filterStyle, butterOrder, bandwidth);
    } else if (filterType === 'BandStop') {
        aFFT.Filtering.bandStop(radius, filterStyle, butterOrder, bandwidth);
    } else if (filterType === 'Sharpen') {
        aFFT.Filtering.sharpen(radius, filterStyle, butterOrder, sharpness);
    } else if (filterType === 'Curve') {
        aFFT.Filtering.filter(filterArray);
    } //else if (filterType === 'Notch') {
        var notchSrc = notchSpec.getImageData(0, 0, specWidth, specHeight),
            notchData = notchSrc.data;
        aFFT.Filtering.notch(notchData);
    //}

    aFFT.Spectrum.create($('input[name=view]:checked').val());
    aFFT.Filtering.shiftQuads();
    $('#SaveSpecHider').show();
}

/* This function performs the inverse FFT and draws
 * out the filtered result to the result canvas.
 */
function applyChanges() {
    var src = spectrum.getImageData(0, 0, specWidth, specHeight),
        data = src.data,
        i = 0,
        rgb = [0, 0, 0],
        point = 0;

    aFFT.FFT.ifft2d();

    for (var y = 0; y < specHeight; y++) {
        i = y * specWidth;
        for (var x = 0; x < specWidth; x++) {
            point = (i << 2) + (x << 2);
            for (var z = 0; z < 3; z++) {
                rgb[z] = aFFT.rgbReal[z][i + x];
                rgb[z] = rgb[z] > 255 ? 255 : rgb[z] < 0 ? 0 : rgb[z];
                data[point + z] = rgb[z];
            }
        }
    }

    result.putImageData(src, 0, 0);
    aFFT.deepCopy(savedFFT);
    $('#SaveResultHider').show();
}

//Take the chosen image, bind all the handlers, and process it
var processImageCPU = function(anImage, isDicom) {
    /* Setup the application after loading the image.
     */
    $(anImage).on('load', function () {
        aFFT = null;
        savedFFT = null;

        setImageAttributes(anImage, isDicom);

        if ($('input[name=bluestein]:checked').val() === 'BlueOn') {
            //Although the bluestein algorithm can handle arbitrary sizes,
            //it simplifies things if we limit it to be divisible by 2
            specWidth = Math.ceil(anImage.width/2)*2;
            specHeight = Math.ceil(anImage.height/2)*2;
            zoomSpecWidth = specWidth;
            zoomSpecHeight = specHeight;
        }

        notchSpec.notchMouseUp = function (event) {
            this.isDrawing = false;
        };

        $('#ResultGPUWrapper').hide();
        $('#ResultWrapper').show();
        $('#FilterTypeGPUWrapper').hide();
        $('#FilterTypeWrapper').show();
        $('#ApplyFilterHider').show();
        $('#SpectrumGPUWrapper').hide();
        $('#SpectrumWrapper').show();
        $('#SaveSpecHider').hide();
        $('#SaveResultHider').hide();
        setupUI();

        $('#RadiusSlider').slider({step: 1, min: 0, max: specWidth / 2, value: 0});
        $('#ButterSlider').slider({step: 1, min: 0, max: specWidth / 32, value: 0});
        $('#BandSlider').slider({step: 1, min: 0, max: specWidth / 2, value: 0});
        $('#SharpSlider').slider({step: 0.05, min: 0, max: 2, value: 0});

        //Initalize the backend objects
        aFFT = new Transform(specWidth * specHeight);
        savedFFT = new Transform(specWidth * specHeight);
        aFFT.FFT.init(specWidth, specHeight);
        aFFT.Filtering.init(specWidth, specHeight, imgWidth, imgHeight);
        aFFT.Spectrum.init(spectrum);

        //Window the input if the user requested it
        if ($('input[name=winhann]:checked').val() === 'HannOn') {
            var hannCanvas = document.createElement('canvas');
            hannCanvas.width = imgWidth;
            hannCanvas.height = imgHeight;
            hannCanvas.getContext('2d').drawImage(anImage, 0, 0);

            var hannSrc = hannCanvas.getContext('2d').getImageData(0, 0, imgWidth, imgHeight),
                hannData = hannSrc.data;

            aFFT.Filtering.hannWindow(hannData);
            spectrum.putImageData(hannSrc, 0, 0, 0, 0, imgWidth, imgHeight);
        } else {
            spectrum.drawImage(anImage, 0, 0, imgWidth, imgHeight);
        }

        //Retrieve the zero padded data
        var src = spectrum.getImageData(0, 0, specWidth, specHeight),
            data = src.data,
            i = 0;

        for (var y = 0; y < specHeight; y++) {
            i = y * specWidth;
            for (var x = 0; x < specWidth; x++) {
                for (var z = 0; z < 3; z++) {
                    aFFT.rgbReal[z][i + x] = data[(i << 2) + (x << 2) + z];
                    aFFT.rgbImag[z][i + x] = 0.0;
                }
            }
        }

        //Perform the 2D FFT
        aFFT.FFT.fft2d();

        //Draw out the initial spectrum
        savedFFT.deepCopy(aFFT);
        applySpec($('input[name=ftype]:checked').val());
        aFFT.deepCopy(savedFFT);

        bindHandlers();

        $('#BandSliderHider').hide();
        $('#SharpSliderHider').hide();
        $('#FilterStyleHider').hide();
        $('#RadiusSliderHider').hide();
        $('#ButterSliderHider').hide();
        $('#MeasInfoHider').show();
        $('#WipeMeasureHider').show();
        $('#Measure').prop("checked", true).change();

        initalLockRez();
    });
};