//Performs a 2D-FFT on one colour channel of an image
var CpuFFT = (function() {
    //Core operations
    var _x = 0, //FFT size
        _y = 0;
    var init = function(width, height) {
        if (width !== 0 || height !== 0) {
            _x = width;
            _y = height;
        } else {
            //throw new Error("init: invalid size");
        }
    };

    //2D-FFT
    var fft2d = function(re, im) {
        var x_tre = new Float64Array(_x),
            x_tim = new Float64Array(_x),
            i = 0;

        //X-axis
        for (var y = 0; y < _y; y++) {
            i = y * _x;
            for (var x1 = 0; x1 < _x; x1++) {
                x_tre[x1] = re[x1 + i];
                x_tim[x1] = im[x1 + i];
            }
            transform(x_tre, x_tim);
            for (var x2 = 0; x2 < _x; x2++) {
                re[x2 + i] = x_tre[x2];
                im[x2 + i] = x_tim[x2];
            }
        }
        //Y-axis
        var y_tre = new Float64Array(_y),
            y_tim = new Float64Array(_y);
        for (var x = 0; x < _x; x++) {
            for (var y1 = 0; y1 < _y; y1++) {
                i = x + y1 * _x;
                y_tre[y1] = re[i];
                y_tim[y1] = im[i];
            }
            transform(y_tre, y_tim);
            for (var y2 = 0; y2 < _y; y2++) {
                i = x + y2 * _x;
                re[i] = y_tre[y2];
                im[i] = y_tim[y2];
            }
        }
    };

    //2D-IFFT
    var ifft2d = function(re, im) {
        var x_tre = new Float64Array(_x),
            x_tim = new Float64Array(_x),
            i = 0;
        //X-axis
        for (var y = 0; y < _y; y++) {
            i = y * _x;
            for (var x1 = 0; x1 < _x; x1++) {
                x_tre[x1] = re[x1 + i];
                x_tim[x1] = im[x1 + i];
            }
            inverseTransformScaled(x_tre, x_tim);
            for (var x2 = 0; x2 < _x; x2++) {
                re[x2 + i] = x_tre[x2];
                im[x2 + i] = x_tim[x2];
            }
        }
        //Y-axis
        var y_tre = new Float64Array(_y),
            y_tim = new Float64Array(_y);
        for (var x = 0; x < _x; x++) {
            for (var y1 = 0; y1 < _y; y1++) {
                i = x + y1 * _x;
                y_tre[y1] = re[i];
                y_tim[y1] = im[i];
            }
            inverseTransformScaled(y_tre, y_tim);
            for (var y2 = 0; y2 < _y; y2++) {
                i = x + y2 * _x;
                re[i] = y_tre[y2];
                im[i] = y_tim[y2];
            }
        }
    };

    return {
        init: init,
        fft2d: fft2d,
        ifft2d: ifft2d
    }
})();

//Performs frequency domain filtering on a single color channel of a 2D-FFT
var CpuFiltering = (function() {
    var _specWidth = 0,         //Spectrum width
        _specHeight = 0,        //Spectrum height
        _specWidthHalf = 0,     //Half the spectrum's width
        _specHeightHalf = 0,    //Half the spectrum's height
        _specSizeSq = 0,        //The spectrum's size squared
        _imgWidth = 0,          //The image's width
        _imgHeight = 0;         //The image's height

    var init = function(specWidth, specHeight,  imgWidth, imgHeight) {
        _specWidth = specWidth;
        _specHeight = specHeight;
        _specWidthHalf = Math.floor(specWidth / 2);
        _specHeightHalf = Math.floor(specHeight / 2);
        _specSizeSq = specWidth * specHeight;
        _imgWidth = imgWidth;
        _imgHeight = imgHeight;
    };

    //hift around the quadrants of the FFT, bringing the corners to the middle
    var shiftQuads = function(real, imag) {
        var xNum, yNum, i, j, k, l, temp;
        for (var y = 0; y < _specHeightHalf; y++) {
            yNum = y + _specHeightHalf;
            for (var x = 0; x < _specWidthHalf; x++) {
                xNum = x + _specWidthHalf;
                i = x + y * _specWidth;
                j = xNum + yNum * _specWidth;
                k = x + yNum * _specWidth;
                l = xNum + y * _specWidth;
                temp = real[i];
                real[i] = real[j];
                real[j] = temp;
                temp = real[k];
                real[k] = real[l];
                real[l] = temp;
                temp = imag[i];
                imag[i] = imag[j];
                imag[j] = temp;
                temp = imag[k];
                imag[k] = imag[l];
                imag[l] = temp;
            }
        }
    };

    //Per channel low-pass filter
    var lowPass = function(real, imag, radius, style, order) {
        var i = 0,
            point = 0,
            radiusXY = 0.0;

        for (var y = -_specHeightHalf; y < _specHeightHalf + 1; y++) {
            i = _specWidthHalf + (y + _specHeightHalf) * _specWidth;
            for (var x = -_specWidthHalf; x < _specWidthHalf; x++) {
                radiusXY = Math.sqrt(x * x + y * y);
                point = x + i;
                if (style === 'Ideal') {
                    if (radiusXY > radius) {
                        real[point] = imag[point] = 0;
                    }
                } else {
                    real[point] = real[point] * (1 / (1 + Math.pow(radiusXY / radius, 2 * order)));
                    imag[point] = imag[point] * (1 / (1 + Math.pow(radiusXY / radius, 2 * order)));
                }
            }
        }
    };

    //Per channel high-pass filter
    var highPass = function(real, imag, radius, style, order) {
        var i = 0,
            point = 0,
            radiusXY = 0.0;

        for (var y = -_specHeightHalf; y < _specHeightHalf + 1; y++) {
            i = _specWidthHalf + (y + _specHeightHalf) * _specWidth;
            for (var x = -_specWidthHalf; x < _specWidthHalf; x++) {
                radiusXY = Math.sqrt(x * x + y * y);
                point = x + i;
                if (style === 'Ideal') {
                    if (radiusXY < radius) {
                        real[point] = imag[point] = 0;
                    }
                } else {
                    real[point] = real[point] * (1 / (1 + Math.pow(radius / radiusXY, 2 * order)));
                    imag[point] = imag[point] * (1 / (1 + Math.pow(radius / radiusXY, 2 * order)));
                }
            }
        }
    };

    //Per channel band-pass filter
    var bandPass = function(real, imag, radius, style, order, bandwidth) {
        var i = 0,
            point = 0,
            radiusXY = 0.0;

        for (var y = -_specHeightHalf; y < _specHeightHalf + 1; y++) {
            i = _specWidthHalf + (y + _specHeightHalf) * _specWidth;
            for (var x = -_specWidthHalf; x < _specWidthHalf; x++) {
                radiusXY = Math.sqrt(x * x + y * y);
                point = x + i;
                if (style === 'Ideal') {
                    if (radiusXY < radius || radiusXY > (radius + bandwidth)) {
                        real[point] = imag[point] = 0;
                    }
                } else {
                    real[point] = real[point] * (1 - (1 / (1 + Math.pow(radiusXY * bandwidth / (radiusXY * radiusXY - radius * radius), 2 * order))));
                    imag[point] = imag[point] * (1 - (1 / (1 + Math.pow(radiusXY * bandwidth / (radiusXY * radiusXY - radius * radius), 2 * order))));
                }
            }
        }
    };

    //Per channel band-stop filter
    var bandStop = function(real, imag, radius, style, order, bandwidth) {
        var i = 0,
            point = 0,
            radiusXY = 0.0;

        for (var y = -_specHeightHalf; y < _specHeightHalf + 1; y++) {
            i = _specWidthHalf + (y + _specHeightHalf) * _specWidth;
            for (var x = -_specWidthHalf; x < _specWidthHalf; x++) {
                radiusXY = Math.sqrt(x * x + y * y);
                point = x + i;
                if (style === 'Ideal') {
                    if (radiusXY > radius && radiusXY < (radius + bandwidth)) {
                        real[point] = imag[point] = 0;
                    }
                } else {
                    real[point] = real[point] * (1 / (1 + Math.pow(radiusXY * bandwidth / (radiusXY * radiusXY - radius * radius), 2 * order)));
                    imag[point] = imag[point] * (1 / (1 + Math.pow(radiusXY * bandwidth / (radiusXY * radiusXY - radius * radius), 2 * order)));
                }
            }
        }
    };

    //Per channel sharpening filter
    var sharpen = function(real, imag, radius, ideal, order, strength) {
        var realSharp = new Float64Array(_specSizeSq),
            imagSharp = new Float64Array(_specSizeSq);

        deepCopySingle(real, realSharp);
        deepCopySingle(imag, imagSharp);
        highPass(realSharp, imagSharp, radius, ideal, order);

        for (var i = 0; i < _specSizeSq; i++) {
            real[i] = real[i] + (strength * realSharp[i]);
            imag[i] = imag[i] + (strength * imagSharp[i]);
        }
    };

    var filter  = function(real, imag, filterArray) {
        var maxFrequency = Math.sqrt(_specWidthHalf * _specWidthHalf + _specHeightHalf * _specHeightHalf);

        var interpolateGain = function(a, b, frac)
        {
            var start, end;

            a = Math.floor((CURVE_CANVAS_WIDTH - 1) * Math.min(a, maxFrequency) / maxFrequency);
            b = Math.floor((CURVE_CANVAS_WIDTH - 1) * Math.min(b, maxFrequency) / maxFrequency);
            start = filterArray[a];
            end = filterArray[b];

            return start + frac * (end - start);
        };

        for (var y = -_specHeightHalf; y < _specHeightHalf + 1; y++) {
            i = _specWidthHalf + (y + _specHeightHalf) * _specWidth;
            for (var x = -_specWidthHalf; x < _specWidthHalf; x++) {
                var frequency  = Math.sqrt(x * x + y * y);

                var gain = interpolateGain(Math.floor((frequency/maxFrequency) * maxFrequency),
                    Math.ceil((frequency/maxFrequency) * maxFrequency),
                    ((frequency/maxFrequency) * maxFrequency) % 1);

                real[x + i] = real[x + i] * gain;
                imag[x + i] = imag[x + i] * gain;
            }
        }
    };

    //Notch filter
    var notch = function(real, imag, paintData) {
        var point = 0;

        for (var y = 0; y < _specHeight; y++) {
            i = y * _specWidth;
            for (var x = 0; x < _specWidth; x++) {
                point = (i << 2) + (x << 2);
                if (paintData[point + 3] !== 0) {
                    real[x + i] = imag[x + i] = 0;
                }
            }
        }
    };

    //2D hanning window applied to an image
    var hannWindow = function(data) {
        var i = 0,
            point = 0,
            radiusX = 0.0,
            radiusY = 0.0,
            radiusXY = 0.0,
            windowXY = 0.0,
            pi = Math.PI;

        for (var y = 0; y < _imgHeight; y++) {
            i = y * _imgWidth;
            for (var x = 0; x < _imgWidth; x++) {
                radiusX = 2 * x / _imgWidth - 1;
                radiusY = 2 * y / _imgHeight - 1;
                radiusXY = Math.sqrt(radiusX * radiusX + radiusY * radiusY);
                windowXY = 0.5 * (Math.cos(pi * radiusXY) + 1);
                point = (i << 2) + (x << 2);
                if (radiusXY >= 0 && radiusXY < 1) {
                    data[point] = data[point] * windowXY;
                    data[point + 1] = data[point + 1] * windowXY;
                    data[point + 2] = data[point + 2] * windowXY;
                } else {
                    data[point] = 0;
                    data[point + 1] = 0;
                    data[point + 2] = 0;
                }
            }
        }
    };

    return {
        init: init,
        shiftQuads: shiftQuads,
        highPass: highPass,
        lowPass: lowPass,
        bandPass: bandPass,
        bandStop: bandStop,
        sharpen: sharpen,
        filter: filter,
        notch: notch,
        hannWindow: hannWindow
    }
})();

//Used to create the spectrum of a 2D-FFT of a image.
var CpuSpectrum = (function() {
    var _context = null, //The context of the spectrum canvas
        _width = 0,		 //Size of the spectrum
        _height = 0,
        _sizeSq = 0,	 //Size of the spectrum squared
        _img = null,	 //The image data from the spectrum
        _data = null;	 //The raw pixel array

    var init = function(context) {
        _context = context;
        _width = context.canvas.width;
        _height = context.canvas.height;
        _sizeSq = _width * _height;
        _img = context.getImageData(0, 0, _width, _height);
        _data = _img.data;
    };

    var basic = function(aFFT) {
        var spec = {};
        spec.rgbSpec = [new Float64Array(_sizeSq), new Float64Array(_sizeSq), new Float64Array(_sizeSq)];

        for (var i = 0; i < 3; i++) {
            var max = 1.0, iMax = 0.0;

            for (var j = 0; j < _sizeSq; j++) {
                spec.rgbSpec[i][j] = Math.sqrt(aFFT.rgbReal[i][j] * aFFT.rgbReal[i][j] + aFFT.rgbImag[i][j] * aFFT.rgbImag[i][j]);
                spec.rgbSpec[i][j] = Math.log(spec.rgbSpec[i][j]);

                if (spec.rgbSpec[i][j] > max) {
                    max = spec.rgbSpec[i][j];
                }
            }

            iMax = 1 / max;
            for (var j = 0; j < _sizeSq; j++) {
                spec.rgbSpec[i][j] = spec.rgbSpec[i][j] * 255 * iMax;
            }
        }

        _draw(spec);
        _context.putImageData(_img, 0, 0);
    };

    var dampen = function(aFFT) {
        var spec = {};
        spec.rgbSpec = [new Float64Array(_sizeSq), new Float64Array(_sizeSq), new Float64Array(_sizeSq)];

        //A deep copy of the FFT needs to be made for the dampened scaling
        spec.copiedFFT = new Transform(_sizeSq);
        spec.copiedFFT.deepCopy(aFFT);

        //These are the ntsc grayscale r,g,b values
        var strength = [0.298839, 0.586811, 0.114350],
            gray = 0;

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < _sizeSq; j++) {
                spec.copiedFFT.rgbReal[i][j] = spec.copiedFFT.rgbReal[i][j] / _sizeSq;
                spec.copiedFFT.rgbImag[i][j] = spec.copiedFFT.rgbImag[i][j] / _sizeSq;
                spec.rgbSpec[i][j] = Math.sqrt(spec.copiedFFT.rgbReal[i][j] * spec.copiedFFT.rgbReal[i][j]
                    + spec.copiedFFT.rgbImag[i][j] * spec.copiedFFT.rgbImag[i][j]);

                //Determine the average gray level for the dampened scaling
                spec.rgbSpec[i][j] = spec.rgbSpec[i][j] * 65535;
                spec.rgbSpec[i][j] = spec.rgbSpec[i][j] >= 65535 ? 65535 : spec.rgbSpec[i][j] <= 0 ? 0 : spec.rgbSpec[i][j];
                spec.rgbSpec[i][j] = Math.floor(spec.rgbSpec[i][j]);
                gray += spec.rgbSpec[i][j] * strength[i];
            }
        }

        gray = gray / _sizeSq;
        gray = gray / 65535;
        var scale = Math.exp((Math.log(gray) / Math.LN10) / (Math.log(0.5) / Math.LN10));

        //Perform the actual dampened scaling based on the average gray level
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < _sizeSq; j++) {
                spec.rgbSpec[i][j] = 65535 * (Math.log((1 / 65535) * scale * spec.rgbSpec[i][j] + 1.0) / (Math.log(scale + 1.0)));
                spec.rgbSpec[i][j] = Math.round((spec.rgbSpec[i][j] + 127) / 257);
            }
        }

        _draw(spec);
        _context.putImageData(_img, 0, 0);
    };

    var phase = function(aFFT) {
        var spec = {};
        spec.rgbSpec = [new Float64Array(_sizeSq), new Float64Array(_sizeSq), new Float64Array(_sizeSq)];

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < _sizeSq; j++) {
                spec.rgbSpec[i][j] = Math.atan2(aFFT.rgbImag[i][j], aFFT.rgbReal[i][j]);
                spec.rgbSpec[i][j] = spec.rgbSpec[i][j] * 255;
            }
        }

        _draw(spec);
        _context.putImageData(_img, 0, 0);
    };

    var none = function(aFFT) {
        var spec = {};
        spec.rgbSpec = [new Float64Array(_sizeSq), new Float64Array(_sizeSq), new Float64Array(_sizeSq)];

        for (var i = 0; i < 3; i++) {
            var max = 1.0, iMax = 0.0;

            for (var j = 0; j < _sizeSq; j++) {
                spec.rgbSpec[i][j] = Math.sqrt(aFFT.rgbReal[i][j] * aFFT.rgbReal[i][j] + aFFT.rgbImag[i][j] * aFFT.rgbImag[i][j]);

                if (spec.rgbSpec[i][j] > max) {
                    max = spec.rgbSpec[i][j];
                }
            }

            iMax = 1 / max;
            for (var j = 0; j < _sizeSq; j++) {
                spec.rgbSpec[i][j] = spec.rgbSpec[i][j] * 255 * iMax;
            }
        }

        _draw(spec);
        _context.putImageData(_img, 0, 0);
    };

    //This draws out the given FFT spectrum on to the spectrum canvas
    var _draw = function(spec) {
        var point = 0;

        for (var y = 0; y < _height; y++) {
            i = y * _width;
            for (var x = 0; x < _width; x++) {
                point = (i << 2) + (x << 2);
                for (var z = 0; z < 3; z++) {
                    _data[point + z] = spec.rgbSpec[z][i + x];
                }
            }
        }
    };

    return {
        init: init,
        basic: basic,
        dampen: dampen,
        phase: phase,
        none: none
    }
})();

//Take two transforms and copy the old transform into the new transform
function deepCopy(oldTrans, newTrans) {
    for (var i = 0; i < 3; i++) {
        deepCopySingle(oldTrans.rgbReal[i], newTrans.rgbReal[i]);
        deepCopySingle(oldTrans.rgbImag[i], newTrans.rgbImag[i]);
    }
}

function deepCopySingle (oldChan, newChan) {
    for (var i = 0; i < oldChan.length; i++) {
        newChan[i] = oldChan[i];
    }
}

/* Creates an object that contains three real and three imaginary arrays that are used to store 2D-FFTs of an image.
 * It also contains functions that use the modules above to operate on the transform's arrays.
 */
var Transform = function(size) {
    var transform = {};
    transform.rgbReal = [new Float64Array(size), new Float64Array(size), new Float64Array(size)];
    transform.rgbImag = [new Float64Array(size), new Float64Array(size), new Float64Array(size)];

    transform.deepCopy = function(oldTrans) {
        deepCopy(oldTrans, transform);
    };

    transform.FFT = (function() {
        var init = function(width, height) {
            CpuFFT.init(width, height);
        };
        var fft2d = function() {
            for (var i = 0; i < 3; i++) {
                CpuFFT.fft2d(transform.rgbReal[i], transform.rgbImag[i]);
            }
        };
        var ifft2d = function() {
            for (var i = 0; i < 3; i++) {
                CpuFFT.ifft2d(transform.rgbReal[i], transform.rgbImag[i]);
            }
        };

        return {
            init: init,
            fft2d: fft2d,
            ifft2d: ifft2d
        }
    })();

    transform.Filtering = (function() {
        var init = function(specWidth, specHeight, imgWidth, imgHeight) {
            CpuFiltering.init(specWidth, specHeight, imgWidth, imgHeight);
        };
        var shiftQuads = function() {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.shiftQuads(transform.rgbReal[i], transform.rgbImag[i]);
            }
        };
        var lowPass = function(radius, style, order) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.lowPass(transform.rgbReal[i], transform.rgbImag[i], radius, style, order);
            }
        };
        var highPass = function(radius, style, order) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.highPass(transform.rgbReal[i], transform.rgbImag[i], radius, style, order);
            }
        };
        var bandPass = function(radius, style, order, bandwidth) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.bandPass(transform.rgbReal[i], transform.rgbImag[i], radius, style, order, bandwidth);
            }
        };
        var bandStop = function(radius, style, order, bandwidth) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.bandStop(transform.rgbReal[i], transform.rgbImag[i], radius, style, order, bandwidth);
            }
        };
        var sharpen = function(radius, ideal, order, strength) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.sharpen(transform.rgbReal[i], transform.rgbImag[i], radius, ideal, order, strength);
            }
        };
        var filter = function(filterArray) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.filter(transform.rgbReal[i], transform.rgbImag[i], filterArray);
            }
        };
        var notch = function(paintData) {
            for (var i = 0; i < 3; i++) {
                CpuFiltering.notch(transform.rgbReal[i], transform.rgbImag[i], paintData);
            }
        };
        var hannWindow = function(data) {
            CpuFiltering.hannWindow(data);
        };

        return {
            init: init,
            shiftQuads: shiftQuads,
            highPass: highPass,
            lowPass: lowPass,
            bandPass: bandPass,
            bandStop: bandStop,
            sharpen: sharpen,
            filter: filter,
            notch: notch,
            hannWindow: hannWindow
        }
    })();

    transform.Spectrum = (function() {
        var init = function(context) {
            CpuSpectrum.init(context);
        };
        var create = function(type) {
            if (type === 'Basic') {
                CpuSpectrum.basic(transform);
            } else if (type === 'Dampen') {
                CpuSpectrum.dampen(transform);
            } else if (type === 'Phase') {
                CpuSpectrum.phase(transform);
            } else if (type === 'None') {
                CpuSpectrum.none(transform);
            }
        };

        return {
            init: init,
            create: create
        }
    })();

    return transform;
};