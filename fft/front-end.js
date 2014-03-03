/* This file is concerned with the front-end user interface of the 
 * javascript application. It contains the logic that controls how 
 * the program interacts with the user. Overall, the application's
 * flow can generally be seen as a large nested function. First of 
 * all, the functions in this file are responsible for hiding and 
 * displaying UI elements based on the user’s actions. Then, perhaps
 * more importantly, they will also take the user's chosen settings 
 * and feed them into the objects from back-end.js objects in order
 * to generate output output to display.
 
 * Nick: ZironZ
 */
 
'use strict';
//Setup various global variables
var	rect = {},
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

	var spectrum = document.querySelector('#Spectrum').getContext('2d');
	var notchSpec = document.querySelector('#NotchSpec').getContext('2d'); 
	var result = document.querySelector('#Result').getContext('2d');
	
/* Everything is nested inside a jQuery function in order 
 * to allow for the easy usage of jQuery commands.
 */
$(function() {
	/* Functions for the Measure functionality
	 * These uses the notch spectrum just like
	 * the notch functionality.
	 */
	var measMouseMove = function(event) {
		scaleX = notchSpec.canvas.width / $('#NotchSpec').outerWidth();
		scaleY = notchSpec.canvas.height / $('#NotchSpec').outerHeight();
		mouseX = (event.pageX - this.offsetParent.offsetLeft)*scaleX;
		mouseY = (event.pageY - this.offsetParent.offsetTop)*scaleY;
		
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
		notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
		notchSpec.drawBox();
	}

	var measMouseDown = function(event) {
		scaleX = notchSpec.canvas.width / $('#NotchSpec').outerWidth();
		scaleY = notchSpec.canvas.height / $('#NotchSpec').outerHeight();
		mouseX = (event.pageX - this.offsetParent.offsetLeft)*scaleX;
		mouseY = (event.pageY - this.offsetParent.offsetTop)*scaleY;
		
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

		notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
		notchSpec.drawBox();
	}

	var measMouseUp = function(event) {
		dragTL = dragTR = dragBL = dragBR = false;
	}

	var checkCloseEnough = function(p1, p2) {
		return Math.abs(p1 - p2) < closeEnough;
	}

	notchSpec.drawBox = function()  {		
		/* Drawing individual lines like this can solve the line width
		 * issue that arises from using strokeRect with aspect ratio 
		 * changingCSS scaling.
		 * However, it requires small offsets to start and ends of
		 * the lines in order for the rectangle to look correct,
		 * and these offsets need to change depending on how the 
		 * rectangle is being dragged.
		 * Overall, it isn't really worth messing with and the program
		 * should really just use a mixed radix/bluestein algorithm
		 * to avoid the need to do this.
		 *
		 * Or I could just draw the box on a nonscaled canvas
		 * and avoid this problem...
		 */
		 
		/*
		this.beginPath();
		this.moveTo(rect.startX-2,rect.startY);
		this.lineTo(rect.startX+rect.w+2,rect.startY);
		this.stroke();

		this.lineWidth = 5;
		this.beginPath();
		this.moveTo(rect.startX+rect.w,rect.startY);
		this.lineTo(rect.startX+rect.w,rect.startY+rect.h);
		this.stroke();
		
		this.lineWidth = 5;
		this.beginPath();
		this.moveTo(rect.startX+rect.w+2,rect.startY+rect.h);
		this.lineTo(rect.startX-2,rect.startY+rect.h);
		this.stroke();
		
		this.lineWidth = 5;
		this.beginPath();
		this.moveTo(rect.startX,rect.startY+rect.h);
		this.lineTo(rect.startX,rect.startY);
		this.stroke();
		*/
		this.strokeStyle = "#80006A";
		this.lineWidth = 5*zoomLevel;
		//this.lineWidth = 5;
		this.strokeRect(rect.startX, rect.startY, rect.w, rect.h);
		if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
			if (lockedToRez === true) {
				$("#MeasInfo").html("<p>Horizontal Rez: "+Math.round(Math.abs(rect.w)/ratioX)+"</br>Vertical Rez: "+Math.round(Math.abs(rect.h)/ratioY)+"</p>");
			} else {
				$("#MeasInfo").html("<p>Horizontal Rez: "+Math.round(Math.abs(rect.w))+"</br>Vertical Rez: "+Math.round(Math.abs(rect.h))+"</p>");
			}
		}
	}

	/* The following four functions deal with canvas drawing
	 * on the notch spectrum. The three notchMouse* functions 
	 * are bound upon the notch button being clicked.
	 */
	 
	notchSpec.fillCircle = function(x, y) {
		var radius = $('#NotchSlider').slider("option", "value");
		this.fillStyle = "black";
		this.beginPath();
		this.moveTo(x, y);
		this.arc(x, y, radius, 0, Math.PI * 2, false);
		this.fill();
	}

	var notchMouseMove = function(event) {
		if (!this.isDrawing) {
		   return;
		}
		scaleX = notchSpec.canvas.width / $('#NotchSpec').outerWidth();
		scaleY = notchSpec.canvas.height / $('#NotchSpec').outerHeight();
		var x = (event.pageX - this.offsetParent.offsetLeft)*scaleX;
		var y = (event.pageY - this.offsetParent.offsetTop)*scaleY;
		notchSpec.fillCircle(x, y);
	}

	var notchMouseDown = function(event) {
		this.isDrawing = true;
		var x = (event.pageX - this.offsetParent.offsetLeft)*scaleX;
		var y = (event.pageY - this.offsetParent.offsetTop)*scaleY;
		notchSpec.fillCircle(x, y);
	}

	var notchMouseUp = function(event) {
		this.isDrawing = false;
	}

	//Enable all the jQuery UI buttons
	$('#Hann').buttonset();
	$('#FilterType').buttonset();
	$('#FilterStyle').buttonset();
	$('#WipeButton').button();
	$('#ViewType').buttonset();
	$('#ApplyFilter').button();
	$('#ZoomIn').button();
	$('#ZoomOut').button();
	$('#LockToImageRez').button();
	$('#SaveSpec').button();
	$('#SaveResult').button();
	
	//Hide most of the buttons until the user uploads an image
	$('.hider').hide();
  
	/* This function activates immediately and sets up a listener
	 * for file uploads.
	 */
	window.onload = function() {
		var input = document.getElementById('input');
		input.addEventListener('change', handleFiles);
	}
	
	/* This unbinds the various event handlers.
	 */
	function unbindHandlers() {
		$('#FilterType').off('change');
		$('#FilterStyle').off('change');
		/*$('.Slider').slider({
		  change: function(event, ui) {
			return false;
		  }
		});*/
		$('.Slider').slider('destroy');
		$('#WipeButton').off('click');
		$('#ViewType').off('change');
		$('#ZoomIn').off('click');
		$('#ZoomOut').off('click');
		$('#LockToImageRez').off('click');
		$('#ApplyFilter').off('click');
		$('#SaveSpec').off('click');
		$('#SaveResult').off('click');
	}

	/* This function reads in a file and calls the main activity 
	 * loop with the resulting image.
	 */
	function handleFiles(event) {
		if (first === false) {
			unbindHandlers();
		}
		var imgtag = document.getElementById('Original');
		var reader = new FileReader;
		reader.onload = function(event) {
			var anImage = new Image;
			anImage.src = event.target.result;
				
			/* This function is the main event loop that controls the application.
			 * I tried putting this in a separate function, but that broke the
			 * application in Firefox. Although it still worked fine in Chrome...
			 */
			$(anImage).on('load', function() {
				//Set the original image to the uploaded image
				imgtag.src = anImage.src;
				
				//Calculate various image dimensions
				var imgWidth = anImage.width,
					imgHeight = anImage.height,
					largestSide = imgWidth > imgHeight ? imgWidth : imgHeight,
					specWidth = Math.pow(2, Math.ceil(Math.log(largestSide)/Math.log(2))),
					specHeight = specWidth,
					zoomImgWidth = imgWidth,
					zoomImgHeight = imgHeight,
					zoomSpecWidth = specWidth,
					zoomSpecHeight = specHeight,
					aFFT = null,
					savedFFT = null;
					
				//Set every canvas to the correct size
				spectrum.canvas.width = notchSpec.canvas.width = specWidth;
				spectrum.canvas.height = notchSpec.canvas.height = specHeight;
				result.canvas.width = imgWidth;
				result.canvas.height = imgHeight;
				
				ratioX = specWidth/imgWidth;
				ratioY = specHeight/imgHeight;
				zoomLevel = 1;
				rect = {};
				
				//Needed to reset for the zoom in/out
				$("#Original").css({'width': imgWidth, 'height': imgHeight});
				$("#Result").css({'width': imgWidth, 'height': imgHeight});
				$("#NotchWrapper").css({'width': specWidth, 'height': specHeight});
				$("#Spectrum").css({'width': specWidth, 'height': specHeight});
				$("#NotchSpec").css({'width': specWidth, 'height': specHeight});
				
				//Configure the various sliders
				$('#RadiusSlider').slider({step: 1, min: 0, max: specWidth/2, value: 0});
				$('#ButterSlider').slider({step: 1, min: 0, max: specWidth/32, value: 0});
				$('#BandSlider').slider({step: 1, min: 0, max: specWidth/2, value: 0});
				$('#SharpSlider').slider({step: 0.05, min: 0, max: 2, value: 0});
				$('#NotchSlider').slider({step: 1, min: 1, max: 100, value: 1});
				
				//Show the UI and configure the settings so that they display correctly
				$('#ImageHider').show();
				$('#CommandsHider').show();
				$('#Ideal').attr('checked', 'Ideal').button('refresh');
				$('#Measure').attr('checked', 'Measure').button('refresh');
				$('#Dampen').attr('checked', 'Dampen').button('refresh');
				
				//Clear the canvas objects
				spectrum.fillStyle = '#000000';
				spectrum.fillRect(0, 0, specWidth, specHeight);
				result.fillStyle = '#000000';
				result.fillRect(0, 0, result.canvas.width, result.canvas.height);
				
				//Initalize the backend objects
				aFFT = new Transform(specWidth*specHeight);
				savedFFT = new Transform(specWidth*specHeight);
				FFT.init(specWidth);
				Filtering.init(specWidth, imgWidth, imgHeight);
				SpecMaker.init(spectrum);
				
				//Window the input if the user requested it
				if ($('input[name=winhann]:checked').val() === 'HannOn') {
					var hannCanvas = document.createElement('canvas');
					hannCanvas.width = imgWidth;
					hannCanvas.height = imgHeight;
					hannCanvas.getContext('2d').drawImage(anImage, 0, 0);
					
					var hannSrc = hannCanvas.getContext('2d').getImageData(0, 0, imgWidth, imgHeight),
						hannData = hannSrc.data;
		  
					Filtering.hannWindow(hannData);
					spectrum.putImageData(hannSrc, (specWidth - imgWidth) / 2, (specHeight - imgHeight) / 2, 0, 0,  imgWidth, imgHeight);
				} else {
					spectrum.drawImage(anImage, (specWidth - imgWidth) / 2, (specHeight - imgHeight) / 2, imgWidth, imgHeight);
				}
				
				//Retrieve the zero padded data
				var src = spectrum.getImageData(0, 0, specWidth, specHeight),
					data = src.data,
					i = 0;
					
				for(var y = 0; y < specHeight; y++) {
					i = y*specWidth;
					for(var x = 0; x < specWidth; x++) {
						aFFT.rReal[i + x] = data[(i << 2) + (x << 2)];
						aFFT.gReal[i + x] = data[(i << 2) + (x << 2) + 1];
						aFFT.bReal[i + x] = data[(i << 2) + (x << 2) + 2];
						aFFT.rImag[i + x] = aFFT.gImag[i + x] = aFFT.bImag[i + x] = 0.0;
					}
				}
				
				//Perform the 2D FFT
				operate(aFFT, FFT.fft2d);
				
				//Draw out the initial spectrum
				deepCopy(aFFT, savedFFT);
				applySpec($('input[name=ftype]:checked').val());
				deepCopy(savedFFT, aFFT);
				
				bindHandlers();
				
				$('#Measure').change();
				initalLockRez();
				
				/* This function binds all the various event handlers.
				 */
				function bindHandlers() {
					/* This event handler deals with changes to the filter type. 
					 * It hides/shows the correct UI elements depending on the
					 * button that was pressed.
					 *
					 * This seems to pointlessly apply the spec twice in all cases
					 * due to the else clauses after notch and measure...
					 */
					$('#FilterType').change(function(event) {
						if (event.target.value === 'HighPass' || event.target.value === 'LowPass') {
							$('#FilterStyleHider').show();
							$('#RadiusSliderHider').show();
							if ($('input[name=fstyle]:checked').val() == 'Butter') {
								$('#ButterSliderHider').show();
							}
						}
						
						if (event.target.value === 'BandPass' || event.target.value === 'BandStop') {
							$('#BandSliderHider').show();
							
							$('#FilterStyleHider').show();
							$('#RadiusSliderHider').show();
							if ($('input[name=fstyle]:checked').val() == 'Butter') {
								$('#ButterSliderHider').show();
							}
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
							$("#NotchSpec").on("mousemove", notchMouseMove);
							$("#NotchSpec").on("mousedown", notchMouseDown);
							$("#NotchSpec").on("mouseup", notchMouseUp);
							
							applySpec('no filter');
							deepCopy(savedFFT, aFFT);
						} else {
							$('#NotchSliderHider').hide();
							$("#NotchSpec").off("mousemove", notchMouseMove);
							$("#NotchSpec").off("mousedown", notchMouseDown);
							$("#NotchSpec").off("mouseup", notchMouseUp);
							notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);

							applySpec(event.target.value);
							deepCopy(savedFFT, aFFT);
						}
						
						if (event.target.value === 'Measure') {
							$('#FilterStyleHider').hide();
							$('#RadiusSliderHider').hide();
							$('#ButterSliderHider').hide();
							$('#MeasInfoHider').show();
							$('#WipeButtonHider').show();
							$("#NotchSpec").on("mousemove", measMouseMove);
							$("#NotchSpec").on("mousedown", measMouseDown);
							$("#NotchSpec").on("mouseup", measMouseUp);
							
							applySpec('no filter');
							deepCopy(savedFFT, aFFT);
							if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
								notchSpec.drawBox();
							}
						} else {
							$('#MeasInfoHider').hide();
							$('#WipeButtonHider').hide();
							$("#NotchSpec").off("mousemove", measMouseMove);
							$("#NotchSpec").off("mousedown", measMouseDown);
							$("#NotchSpec").off("mouseup", measMouseUp);
							notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);

							applySpec(event.target.value);
							deepCopy(savedFFT, aFFT);
						}
					});
					
					/* This event handler deals with changes to the filter style. 
					 * It displays/hides the butterworth slider after every change.
					 * It also redraws the spectrum after every change.
					 */
					$('#FilterStyle').change(function(event) {
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
					  change: function(event, ui) {
						if ($('input[name=ftype]:checked').val() !== 'Notch') {
							applySpec($('input[name=ftype]:checked').val());
							deepCopy(savedFFT, aFFT);
						}
					  }
					});
					
					/* This event handler deals with wiping away the notch spectrum.
					 */
					$('#WipeButton').click(function() {
						notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
						rect = {};
						$("#MeasInfo").html("");
					});
					
					/* This event handler deals with changes to the spectrum display type.
					 * It obviously redraws the spectrum after every change.
					 */
					$('#ViewType').change(function(event) {
						applySpec($('input[name=ftype]:checked').val());
						deepCopy(savedFFT, aFFT);
					});
					
					/* This event handler deals with the zoom in button.
					 */
					$('#ZoomIn').click(function() {
						zoomImgWidth = zoomImgWidth << 1;
						zoomImgHeight = zoomImgHeight << 1;
						zoomSpecWidth = zoomSpecWidth << 1;
						zoomSpecHeight = zoomSpecHeight << 1;
						zoomLevel = zoomLevel/2;
						
						/*
						if (zoomLevel > 1) {
							zoomLevel = zoomLevel >> 1;
						}
						*/
						
						$("#Original").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						$("#Result").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						if (lockedToRez == true) {
							$("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						} else {
							$("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
						}
						
						if ($('input[name=ftype]:checked').val() === 'Measure') {
							if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
								notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
								notchSpec.drawBox();
							}
						}
					});
					
					/* This event handler deals with the zoom out button.
					 */
					$('#ZoomOut').click(function() {
						if (zoomImgWidth > 32) {
							zoomImgWidth = zoomImgWidth >> 1;
							zoomImgHeight = zoomImgHeight >> 1;
							zoomSpecWidth = zoomSpecWidth >> 1;
							zoomSpecHeight = zoomSpecHeight >> 1;
							zoomLevel = zoomLevel * 2;
							//zoomLevel = zoomLevel << 1;
						}
						
						$("#Original").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						$("#Result").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						if (lockedToRez == true) {
							$("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						} else {
							$("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
						}
						
						if ($('input[name=ftype]:checked').val() === 'Measure') {
							if (typeof rect.w !== "undefined" && typeof rect.h !== "undefined") {
								notchSpec.clearRect(0, 0, notchSpec.canvas.width, notchSpec.canvas.height);
								notchSpec.drawBox();
							}
						}
					});
					
					/* This event handler deals with locking the image.
					 */
					$('#LockToImageRez').click(function() {
						if (lockedToRez == true) {
							lockedToRez = false;
							$("#LockToImageRez").button( "option", "label", "Lock to Image Resolution");
							$("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
						} else {
							lockedToRez = true;
							$("#LockToImageRez").button( "option", "label", "Unlock from Image Resolution");
							$("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						}
					});
					
					/* This event handler deals with the apply filter button.
					 * It redraws the spectrum and draws out the filtered image.
					 */
					$('#ApplyFilter').click(function() {
						applySpec($('input[name=ftype]:checked').val());
						applyChanges();
					});
					
					/* This event handler deals with the save spectrum button.
					 * It opens a new window that contains the spectrum.
					 */
					$('#SaveSpec').click(function() {
						var win= window.open();
						win.document.write('<img src="'+document.querySelector('#Spectrum').toDataURL()+'"/>');
						win.document.close();
					});
					
					/* This event handler deals with the save result button.
					 * It opens a new window that contains the filtered image.
					 */
					$('#SaveResult').click(function() {
						var win= window.open();
						win.document.write('<img src="'+document.querySelector('#Result').toDataURL()+'"/>');
						win.document.close();
					});
				}
				
				/* This function performs filtering on the image's FFT
				 * and draws out the result to the spectrum canvas.
				 */
				function applySpec(type) {
					var radius = $('#RadiusSlider').slider('option', 'value'),
						bandwidth = $('#BandSlider').slider('option', 'value'),
						sharpness = $('#SharpSlider').slider('option', 'value'),
						butterOrder = $('#ButterSlider').slider('option', 'value'),
						filterStyle = $('input[name=fstyle]:checked').val(),
						viewType = $('input[name=view]:checked').val();
						
					operate(aFFT, Filtering.shiftQuads);
					
					if (type === 'HighPass') {
						operate(aFFT, Filtering.highPass, radius, filterStyle, butterOrder);
					} else if (type === 'LowPass') {
						operate(aFFT, Filtering.lowPass, radius, filterStyle, butterOrder);
					} else if (type === 'BandPass') {
						operate(aFFT, Filtering.bandPass, radius, filterStyle, butterOrder, bandwidth);
					} else if (type === 'BandStop') {
						operate(aFFT, Filtering.bandStop, radius, filterStyle, butterOrder, bandwidth);
					} else if (type === 'Sharpen') {
						operate(aFFT, Filtering.sharpen, radius, filterStyle, butterOrder, sharpness);
					} else if (type === 'Notch') {
						var notchSrc = notchSpec.getImageData(0, 0, specWidth, specHeight),
							notchData = notchSrc.data;
						operate(aFFT, Filtering.notch, notchData);
					}
					
					SpecMaker.create(aFFT, $('input[name=view]:checked').val());
					operate(aFFT, Filtering.shiftQuads);
					$('#SaveSpecHider').show();
				}
				
				/* This function performs the inverse FFT and draws
				 * out the filtered result to the result canvas.
				 */
				function applyChanges() {
					var src = spectrum.getImageData(0, 0, specWidth, specHeight),
						data = src.data,
						i = 0,
						rVal = 0,
						gVal = 0,
						bVal = 0,
						point = 0;
						
					operate(aFFT, FFT.ifft2d);
					
					for(var y = 0; y < specHeight; y++) {
						i = y*specWidth;
						for(var x = 0; x < specWidth; x++) {
							rVal = aFFT.rReal[i + x];
							gVal = aFFT.gReal[i + x];
							bVal = aFFT.bReal[i + x];
							rVal = rVal > 255 ? 255 : rVal < 0 ? 0 : rVal;
							gVal = gVal > 255 ? 255 : gVal < 0 ? 0 : gVal;
							bVal = bVal > 255 ? 255 : bVal < 0 ? 0 : bVal;
							point = (i << 2) + (x << 2);
							data[point] = rVal;
							data[point + 1] = gVal;
							data[point + 2] = bVal;
						}
					}
					
					//This is used to get around the inability to crop with putImageData()
					var tempCanvas = document.createElement('canvas');
					tempCanvas.height = src.width;
					tempCanvas.width = src.height;
					tempCanvas.getContext('2d').putImageData(src, 0, 0);
						
					result.drawImage(tempCanvas, (specWidth - imgWidth) / 2, (specHeight - imgHeight) / 2, imgWidth, imgHeight, 0, 0, imgWidth, imgHeight);
					deepCopy(savedFFT, aFFT);
					$('#SaveResultHider').show();
				}

				/* This is works like the lock resolution button
				 * but without the state assignments.
				 */
				function initalLockRez() {
					if (first === true) {
						lockedToRez = true;
						$("#LockToImageRez").button( "option", "label", "Unlock from Image Resolution");
						$("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						$("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						$("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						first = false;
					} else {
						if (lockedToRez === true) {
							$("#LockToImageRez").button( "option", "label", "Unlock from Image Resolution");
							$("#NotchWrapper").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#Spectrum").css({'width': zoomImgWidth, 'height': zoomImgHeight});
							$("#NotchSpec").css({'width': zoomImgWidth, 'height': zoomImgHeight});
						} else {
							$("#LockToImageRez").button( "option", "label", "Lock to Image Resolution");
							$("#NotchWrapper").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#Spectrum").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
							$("#NotchSpec").css({'width': zoomSpecWidth, 'height': zoomSpecHeight});
						}
					}
				}
			});
		}
		reader.readAsDataURL(event.target.files[0]);
	}
});