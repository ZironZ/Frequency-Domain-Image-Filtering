# Frequency Domain Image Filtering

This is a small web application that can perform some basic frequency domain filtering on images. It interactively shows the results of the filtering on the frequency domain. The user is also able to apply the inverse transform and see a filtered version of their image.

This was originally created as a final project for my university computer graphics class, but I have added a few features to it since finishing the project.

You can test it out [here](http://semapho.re/fft/).

### Overview of Features
- Supports traditional web friendly image formats (BMP, JPEG, PNG) and simple DICOM images.
- Hanning Window: Adds a hanning window to the image which removes edge artifacts in the frequency domain. This is pointless when filtering images, but can be handy when attempting to measure their magnitude spectrums.
- Bluestein's Algorithm: Uses Bluestein's algorithm when selected. This creates a spectrum with a size divisible by 2. When it is not selected radix-2 is used and the spectrum is 2^n in size. Bluestein is slower when performing forward and inverse transforms. However, it is faster when showing the results of filtering on the frequency domain.
- Filter Types
  - Measure: This lets the user draw a box on the spectrum to measure how large part of it is. It is useful when trying to tell if an image or video has been upscaled from a lower resolution.
  - High-Pass: Zeros out frequencies below a certain radius.
  - Low-Pass: Zeros out frequencies above a certain radius.
  - Band-Pass: Zeros out frequencies above and below a certain radius.
  - Band-Stop: Zeroes out frequencies within a certain radius.
  - Sharpen: Takes a high-pass of the frequency domain and multiplies it by some constant value in order to bring out the high frequencies in an image.
  - Notch: This lets the user use a variable sized brush to zero out parts of the spectrum.
- Filter Styles
  - Ideal: A filter with a hard cut off above/below the specified frequency. This hard cut off causes ringing around the edges of lines.
  - Butterworth: A filter that is windowed using a butterworth window. This reduces ringing by fading the edges of the filter radius.
    - Butterworth Order: A lower order causes less ringing, but also lets in more "undesirable" frequencies.
- Spectrum Display
  - Basic Log: This displays the natural logarithm of each point's magnitude. It is probably the most traditional way to view the spectrum.
  - Dampened: This view attempts to scale the magnitude spectrum in such a way as to remove background noise from the spectrum and only show key frequencies. It is based on the scaling recommended in the image editing application ImageMagick's tutorials (http://www.imagemagick.org/Usage/fourier/#fft_spectrum).
  - No Scaling: This displays the raw spectrum with no scaling. This is practically useless for viewing since the central frequencies are so strong that they overpower the rest of the frequencies and make the spectrum appear almost completely blank.
  - Phase: This shows the phase of the image. Note that any filtering that is done when this is pressed still affects the magnitude spectrum of the image and not the phase.
- Zoom In: Zooms in the image by 50% each time it is pressed.
- Zoom Out: Zooms out the image by 50% each time it is pressed.
- Lock/Unlock from Image Resolution: This button changes between displaying the actual size of the spectrum and a resized version that is the same resolution as the source image.
- Apply Filtering: Displays a filtered image based on whatever filter options are currently set.

### TODO (Maybe)
- Redo the fft algorithms and filtering so that they are performed using WebGL instead of native javascript typed arrays.
- Redesign the filtering so that it is possible to stack filters. As it stands, each filter is applied separately and it is impossible to combine them.
