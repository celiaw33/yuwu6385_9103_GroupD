# yuwu6385_9103_GroupD
A3 creative coding major project(final)

audio js-
Human-written Code

The following parts were written by me, based on my understanding of p5.js:

AudioController.js – preload(): Loading the background music.

AudioController.js – getBand(): Using circle sizes to select bass, mid and treble frequencies.

AudioController.js – drawRipple(): Drawing expanding circles with fading transparency.

AI-assisted Code

AI assistance was used for the following parts:

AudioController.js – constructor(): Setting up audio variables and visual effect settings.

AudioController.js – load(): Setting up FFT, amplitude analysis and the music button.

AudioController.js – drawSatellites(): Creating small circles that orbit around larger circles.

Perlin js-
Human-written Code
The following parts are not marked as AI-assisted in the code:

Perlin_noise_random.js – makeComposition(): Building the circle layout and using a random seed to vary positions, sizes, colours and transparency.

Perlin_noise_random.js – getPalette(): Collecting colours from simple circles for newly planted stars.

Perlin_noise_random.js – makeLayeredCircle(): Creating compound circles with multiple layers.

Perlin_noise_random.js – drawOrganicDisc(): Drawing simple and layered circles, applying size and colour changes to each layer.

Perlin_noise_random.js – drawPigmentClouds(): Applying pigment textures to simple circles.

AI-assisted Code

AI assistance was used for the following parts:

Perlin_noise_random.js – constructor(): Grouping animation settings for parameter testing.

Perlin_noise_random.js – newVariation(): Selecting a new random seed, increasing the variation number and rebuilding the composition.

Perlin_noise_random.js – makePlantedCircle(): Creating a new small circle using a colour from the existing palette.

Perlin_noise_random.js – getDrift(): Using smooth noise to calculate horizontal and vertical movement, with an activity parameter linked to the Time mechanic.

Perlin_noise_random.js – getLight(): Using smooth noise to vary circle brightness.

Perlin_noise_random.js – drawOrganicDisc(): Scaling edge variation according to the displayed circle size.

Perlin_noise_random.js – drawDisc(): Sampling noise around a circle’s edge to create an organic shape.

Perlin_noise_random.js – drawClouds(): Overlapping translucent patches to create watercolour-like pigment variation.

References

p5.js – beginShape(): Starting a custom shape for the organic circle outline.
https://p5js.org/reference/p5/beginShape/

p5.js – vertex(): Placing points along the noise-adjusted circle edge.
https://p5js.org/reference/p5/vertex/

p5.js – endShape(): Closing the custom circle shape.
https://p5js.org/reference/p5/endShape/

p5.js – ellipse(): Drawing overlapping translucent pigment patches.
https://p5js.org/reference/p5/ellipse/

p5.js – noise(): Generating smooth variations for movement, brightness, edges and pigment textures.
https://p5js.org/reference/p5/noise/
