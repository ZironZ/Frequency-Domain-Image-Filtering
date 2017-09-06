function bindHandlersGPU() {
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

    $('#FilterTypeGPU').change(function (event) {
        if (event.target.value === 'Curve') {
            curve.triggerChartListener();
            $('#EditorWrapper').show();
        } else {
            $('#EditorWrapper').hide();
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

            filterer.filter(filterArray, false);
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

            filterer.filter(filterArray, false);
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

    $('.Slider').slider({
        change: function (event, ui) {
            if ($('input[name=ftype]:checked').val() !== 'Notch') {
                filterer.filter(filterArray, false);
            }
        }
    });

    curve.chartListener = (function () {
        filterArray = new Float32Array(CURVE_CANVAS_WIDTH);

        curve.iterate(0, CURVE_CANVAS_WIDTH - 1, 1, function (x, y) {
            filterArray[x] = Math.max(0.0, y / CURVE_CANVAS_HEIGHT_HALF);
        });

        filterer.filter(filterArray, false);
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
        filterer.filter(filterArray, false);
    });

    /* This event handler deals with changes to the spectrum display type.
     * It obviously redraws the spectrum after every change.
     */
    $('#ViewTypeGPU').change(function (event) {
        filterer.filter(filterArray, false);
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
        $("#ResultGPU").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#ResultGPUWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
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
        $("#ResultGPU").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
        $("#ResultGPUWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
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
        $("#ResultGPUWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});

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
        filterer.filter(filterArray, false);
    });

    /* This event handler deals with the save spectrum button.
     * It opens a new window that contains the spectrum.
     */
    $('#SaveSpec').click(function () {
        filterer.filter(filterArray, false);

        var win = window.open();
        win.document.write('<img src="' + document.querySelector('#Spectrum').toDataURL("image/png", 1) + '"/>');
        win.document.close();
    });

    /* This event handler deals with the save result button.
     * It opens a new window that contains the filtered image.
     */
    $('#SaveResult').click(function () {
        filterer.filter(filterArray, false);

        var win = window.open();
        win.document.write('<img src="' + document.querySelector('#ResultGPU').toDataURL("image/png", 1) + '"/>');
        win.document.close();
    });
}

/* This is works like the lock resolution button
 * but without the state assignments.
 */
function initalLockRezGPU() {
    $("#OrigWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
    $("#ResultGPUWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});

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

//Take the chosen image, bind all the handlers, and process it
var processImageGPU = function(anImage, isDicom) {
    /* Setup the application after loading the image.
     */
    $(anImage).on('load', function () {
        filterer.cleanupImage();
        setImageAttributes(anImage, isDicom);

        notchSpec.notchMouseUp = function (event) {
            this.isDrawing = false;

            var filterArray = new Float32Array(CURVE_CANVAS_WIDTH);

            curve.iterate(0, CURVE_CANVAS_WIDTH - 1, 1, function (x, y) {
                filterArray[x] = Math.max(0.0, y / CURVE_CANVAS_HEIGHT_HALF);
            });

            filterer.filter(filterArray, false);
        };

        $('#ResultWrapper').hide();
        $('#ResultGPUWrapper').show();
        $('#ApplyFilterHider').hide();
        $('#FilterTypeWrapper').hide();
        $('#FilterTypeGPUWrapper').show();
        $('#SpectrumWrapper').hide();
        $('#SpectrumGPUWrapper').show();
        $('#SaveSpecHider').show();
        $('#SaveResultHider').show();
        setupUI();

        filterer.setupImage();
        filterer.setImage(anImage);
        filterer.filter(filterArray, true);
        bindHandlersGPU();

        curve.triggerChartListener();
        curve.setupListeners();

        $('#BandSliderHider').hide();
        $('#SharpSliderHider').hide();
        $('#FilterStyleHider').hide();
        $('#RadiusSliderHider').hide();
        $('#ButterSliderHider').hide();
        $('#MeasInfoHider').show();
        $('#WipeMeasureHider').show();
        $('#MeasureGPU').prop("checked", true).change();

        initalLockRezGPU();
    });
};