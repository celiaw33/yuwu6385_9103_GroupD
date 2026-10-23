
/*
  Main Sketch
  Combines all four mechanics:
  1. Audio
  2. Timebased
  3. Perlin noise and randomness
  4. User Input
*/

// -------------------- PRELOAD --------------------

function preload() {
  // Load assets if needed
  // preloadAudio();
}

// -------------------- SETUP --------------------

function setup() {
  createCanvas(960, 680);

  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);

  // Initialise each mechanic
  // setupAudio();
  // setupPerlin();
  // setupTimeBased();
  // setupUserInput();
}

// -------------------- DRAW --------------------

function draw() {
  background("#05050a");

  // Update and display mechanics
  // updateAudio();
  // drawPerlin();
  // drawTimeBased();
  // drawUserInput();
}

// -------------------- USER INTERACTION --------------------

function mousePressed() {
  // handleMousePressed();
}

function mouseMoved() {
  // handleMouseMoved();
}

function keyPressed() {
  // handleKeyPressed();
}

// -------------------- WINDOW RESIZE --------------------

function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);
}
