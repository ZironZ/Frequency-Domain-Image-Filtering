/* This file is concerned with the back-end calculations that underpin 
 * the javascript application. 
 * 
 * It contains functions and objects that transform the input images.
 */

/* This function creates an object that contains three real and three
 * imaginary arrays that can be used to store 2D image FFTs.
 */
function Transform(size) {
    this.rReal = new Float64Array(size),
        this.gReal = new Float64Array(size),
        this.bReal = new Float64Array(size),
        this.rImag = new Float64Array(size),
        this.gImag = new Float64Array(size),
        this.bImag = new Float64Array(size);
}

/* This takes in two transforms and copies the old transform
 * into the new transform.
 */
function deepCopy(oldTrans, newTrans) {
    deepCopySingle(oldTrans.rReal, newTrans.rReal);
    deepCopySingle(oldTrans.gReal, newTrans.gReal);
    deepCopySingle(oldTrans.bReal, newTrans.bReal);
    deepCopySingle(oldTrans.rImag, newTrans.rImag);
    deepCopySingle(oldTrans.gImag, newTrans.gImag);
    deepCopySingle(oldTrans.bImag, newTrans.bImag);
}

/* This is a helper function that copies one channel of the 
 * old transform into one channel of the new transform.
 */
function deepCopySingle(oldChan, newChan) {
    for (var i = 0; i < oldChan.length; i++) {
        newChan[i] = oldChan[i];
    }
}

/* This function abstracts away most of the calls made to the 
 * individual colour channels that comprise an image FFT.
 */
function operate(aFFT, operation, valueA, valueB, valueC, valueD) {
    switch (arguments.length) {
        case 2:
            operation(aFFT.rReal, aFFT.rImag);
            operation(aFFT.gReal, aFFT.gImag);
            operation(aFFT.bReal, aFFT.bImag);
            break;
        case 3:
            operation(aFFT.rReal, aFFT.rImag, valueA);
            operation(aFFT.gReal, aFFT.gImag, valueA);
            operation(aFFT.bReal, aFFT.bImag, valueA);
            break;
        case 4:
            operation(aFFT.rReal, aFFT.rImag, valueA, valueB);
            operation(aFFT.gReal, aFFT.gImag, valueA, valueB);
            operation(aFFT.bReal, aFFT.bImag, valueA, valueB);
            break;
        case 5:
            operation(aFFT.rReal, aFFT.rImag, valueA, valueB, valueC);
            operation(aFFT.gReal, aFFT.gImag, valueA, valueB, valueC);
            operation(aFFT.bReal, aFFT.bImag, valueA, valueB, valueC);
            break;
        case 6:
            operation(aFFT.rReal, aFFT.rImag, valueA, valueB, valueC, valueD);
            operation(aFFT.gReal, aFFT.gImag, valueA, valueB, valueC, valueD);
            operation(aFFT.bReal, aFFT.bImag, valueA, valueB, valueC, valueD);
            break;
        default:
            //throw new Error("invalid call to operate function");
            break;
    }
}

/* This object's main purpose is to perform a 2D FFT on one colour channel of an image.
 */
(function () {
    var FFT;           //Top-level namespace
    var _root = this;  //Reference to 'window' or 'global'

    FFT = _root.FFT = {};

    var version = {
        release: '0.2.2',
        date: '07/17/2016'
    };
    FFT.toString = function () {
        return "version " + version.release + ", released " + version.date;
    };

    //Core operations
    var _x = 0, //FFT size
        _y = 0;
    var core = {
        init: function (width, height) {
            if (width !== 0 || height !== 0) {
                _x = width;
                _y = height;
            } else {
                //throw new Error("init: invalid size");
            }
        },

        //2D-FFT
        fft2d: function (re, im) {
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
        },

        //2D-IFFT
        ifft2d: function (re, im) {
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
        }
    };

    //These are the public function names
    var apis = ['init', 'fft2d', 'ifft2d'];
    for (var i = 0; i < apis.length; i++) {
        FFT[apis[i]] = core[apis[i]];
    }
}).call(this);

/* This object performs frequency domain filtering on a single color
 * channel of a 2D FFT. Most of the filters will be called three 
 * times, once for each colour channel, with the exceptions being the 
 * swapQuads and window functions. The layout of this object copies 
 * from the way the FFT object is laid out.
 */
(function () {
    var Filtering;  	//Top-level namespace
    var _root = this;	//Reference to 'window' or 'global'

    Filtering = _root.Filtering = {};

    var _specWidth = 0,         //Spectrum width
        _specHeight = 0,        //Spectrum height
        _specWidthHalf = 0,     //Half the spectrum's width
        _specHeightHalf = 0,    //Half the spectrum's height
        _specSizeSq = 0,        //The spectrum's size squared
        _imgWidth = 0,          //The image's width
        _imgHeight = 0;         //The image's height

    var core = {
        init: function (specWidth, specHeight,  imgWidth, imgHeight) {
            _specWidth = specWidth;
            _specHeight = specHeight;
            _specWidthHalf = Math.floor(specWidth / 2);
            _specHeightHalf = Math.floor(specHeight / 2);
            _specSizeSq = specWidth * specHeight;
            _imgWidth = imgWidth;
            _imgHeight = imgHeight;
        },

        /* This function shifts around the quadrants of the FFT.
         * It brings the corners of the FFT to the middle.
         */
        shiftQuads: function (real, imag) {
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
        },

        /* This function applies a low-pass filter to a colour channel.
         */
        lowPass: function (real, imag, radius, style, order) {
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
        },

        /* This function applies a high-pass filter to a colour channel.
         */
        highPass: function (real, imag, radius, style, order) {
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
        },

        /* This function applies a band-pass filter to a colour channel.
         */
        bandPass: function (real, imag, radius, style, order, bandwidth) {
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
        },

        /* This function applies a band-stop filter to a colour channel.
         */
        bandStop: function (real, imag, radius, style, order, bandwidth) {
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
        },

        /* This function applies a sharpening filter to a colour channel.
         */
        sharpen: function (real, imag, radius, ideal, order, strength) {
            var realSharp = new Float64Array(_specSizeSq),
                imagSharp = new Float64Array(_specSizeSq);

            deepCopySingle(real, realSharp);
            deepCopySingle(imag, imagSharp);
            core.highPass(realSharp, imagSharp, radius, ideal, order);

            for (var i = 0; i < _specSizeSq; i++) {
                real[i] = real[i] + (strength * realSharp[i]);
                imag[i] = imag[i] + (strength * imagSharp[i]);
            }
        },

        /* This function applies a notch filter to a colour channel.
         * The painted parts of the canvas are set to zero.
         */
        notch: function (real, imag, paintData) {
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
        },


        /* This function applies a 2D hanning window to the image.
         */
        hannWindow: function (data) {
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
        }
    };

    //These are the public function names
    var apis = ['init', 'shiftQuads', 'highPass', 'lowPass', 'bandPass', 'bandStop', 'sharpen', 'notch', 'hannWindow'];
    for (var i = 0; i < apis.length; i++) {
        Filtering[apis[i]] = core[apis[i]];
    }
}).call(this);

/* This object creates the spectrum of a 2D FFT of an image. It takes
 * in a Transform object and handles operating on the three colour 
 * channels internally. This object follows the same general layout
 * as the FFT and filtering objects.
 *
 * I should probably look into faster approximate algorithms for
 * some of the math functions, although it will be hard to get faster
 * than the compiled functions. There are probably some other ways I
 * could make the spectrum scaling faster anyway.
 */
(function () {
    var SpecMaker;		//Top-level namespace
    var _root = this;	//Reference to 'window' or 'global'

    SpecMaker = _root.SpecMaker = {};

    var _context = null, //The context of the spectrum canvas
        _width = 0,		 //Size of the spectrum
        _height = 0,
        _sizeSq = 0,	 //Size of the spectrum squared
        _img = null,	 //The image data from the spectrum
        _data = null;	 //The raw pixel array

    var core = {
        init: function (context) {
            _context = context;
            _width = context.canvas.width,
            _height = context.canvas.height,
            _sizeSq = _width * _height;
            _img = context.getImageData(0, 0, _width, _height);
            _data = _img.data;
        },

        /* This function takes in an FFT and a type and creates the
         * type of spectrum specified by type.
         */
        create: function (aFFT, type) {
            var aSpec = {
                rSpec: new Float64Array(_sizeSq),
                gSpec: new Float64Array(_sizeSq),
                bSpec: new Float64Array(_sizeSq)
            };
            if (type == 'Dampen') {
                //A deep copy of the FFT needs to be made for the dampened scaling
                aSpec.copiedFFT = new Transform(_sizeSq);
                deepCopy(aFFT, aSpec.copiedFFT);
                var gray = {
                    value: 0
                };

                //These are the ntsc grayscale r,g,b values
                var strength = [0.298839, 0.586811, 0.114350],
                    scale = 0;
            }

            core._operateSpec(aFFT, aSpec, core._calcBaseScale, type);

            if (type == 'Dampen') {
                core._operateSpec(aFFT, aSpec, core._calcGray, type, gray, strength);
                gray.value = gray.value / _sizeSq;
                gray.value = gray.value / 65535;
                scale = Math.exp((Math.log(gray.value) / Math.LN10) / (Math.log(0.5) / Math.LN10));
                core._operateSpec(aFFT, aSpec, core._calcDampenScale, type, scale);
            }

            core._draw(aSpec);
            _context.putImageData(_img, 0, 0);
        },

        /* This is similar to the operate() function above and performs an operation 
         * on each color channel in the spectrum to be drawn.
         */
        _operateSpec: function (aFFT, aSpec, operation, type, val1, val2) {
            switch (arguments.length) {
                case 0:
                case 1:
                case 2:
                case 3:
                //throw new Error("invalid call to _operateSpec function");
                case 4:
                    if (type == 'Dampen') {
                        operation(aSpec.copiedFFT.rReal, aSpec.copiedFFT.rImag, aSpec.rSpec, type);
                        operation(aSpec.copiedFFT.gReal, aSpec.copiedFFT.gImag, aSpec.gSpec, type);
                        operation(aSpec.copiedFFT.bReal, aSpec.copiedFFT.bImag, aSpec.bSpec, type);
                    } else {
                        operation(aFFT.rReal, aFFT.rImag, aSpec.rSpec, type);
                        operation(aFFT.gReal, aFFT.gImag, aSpec.gSpec, type);
                        operation(aFFT.bReal, aFFT.bImag, aSpec.bSpec, type);
                    }
                    break;
                case 5:
                    operation(aSpec.copiedFFT.rReal, aSpec.copiedFFT.rImag, aSpec.rSpec, val1);
                    operation(aSpec.copiedFFT.gReal, aSpec.copiedFFT.gImag, aSpec.gSpec, val1);
                    operation(aSpec.copiedFFT.bReal, aSpec.copiedFFT.bImag, aSpec.bSpec, val1);
                    break;
                case 6:
                    operation(aSpec.copiedFFT.rReal, aSpec.copiedFFT.rImag, aSpec.rSpec, val1, val2[0]);
                    operation(aSpec.copiedFFT.gReal, aSpec.copiedFFT.gImag, aSpec.gSpec, val1, val2[1]);
                    operation(aSpec.copiedFFT.bReal, aSpec.copiedFFT.bImag, aSpec.bSpec, val1, val2[2]);
                    break;
                default:
                    //throw new Error("invalid call to _operateSpec function");
                    break;
            }
        },

        /* This function performs the baseline calculations for the scaling.
         */
        _calcBaseScale: function (real, imag, spec, type) {
            var max = 1.0,
                iMax = 0.0;

            for (var i = 0; i < _sizeSq; i++) {
                if (type == 'Basic') {
                    spec[i] = Math.log(real[i] * real[i] + imag[i] * imag[i]);
                } else if (type == 'Dampen') {
                    real[i] = real[i] / _sizeSq;
                    imag[i] = imag[i] / _sizeSq;
                    spec[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
                } else if (type == 'Phase') {
                    spec[i] = Math.atan2(imag[i], real[i]);
                } else {
                    spec[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
                }
                if (type != 'Dampen') {
                    if (spec[i] > max) {
                        max = spec[i];
                    }
                }
            }
            if (type != 'Dampen') {
                iMax = 1 / max;
                for (var j = 0; j < _sizeSq; j++) {
                    spec[j] = spec[j] * 255 * iMax;
                }
            }
        },

        /* This function determines the average gray level for the dampened scaling.
         */
        _calcGray: function (real, imag, spec, gray, strength) {
            for (var j = 0; j < _sizeSq; j++) {
                spec[j] = spec[j] * 65535;
                spec[j] = spec[j] >= 65535 ? 65535 : spec[j] <= 0 ? 0 : spec[j];
                spec[j] = Math.floor(spec[j]);

                gray.value += spec[j] * strength;
            }
        },

        /* This performs the actual dampened scaling based on the average gray level.
         */
        _calcDampenScale: function (real, imag, spec, scale) {
            for (var i = 0; i < _sizeSq; i++) {
                spec[i] = 65535 * (Math.log((1 / 65535) * scale * spec[i] + 1.0) / (Math.log(scale + 1.0)));
                spec[i] = Math.round((spec[i] + 127) / 257);
            }
        },

        /* This draws out the given FFT spectrum on to the spectrum canvas.
         */
        _draw: function (aSpec) {
            var point = 0;

            for (var y = 0; y < _height; y++) {
                i = y * _width;
                for (var x = 0; x < _width; x++) {
                    point = (i << 2) + (x << 2);
                    _data[point] = aSpec.rSpec[i + x];
                    _data[point + 1] = aSpec.gSpec[i + x];
                    _data[point + 2] = aSpec.bSpec[i + x];
                }
            }
        }
    };

    //These are the public function names
    SpecMaker.init = core.init;
    SpecMaker.create = core.create;
}).call(this);
