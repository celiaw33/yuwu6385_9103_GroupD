// sketch.js — pilot demo for the User Input mechanic (Bessie)
// This code was drafted with the help of Claude (Anthropic) and reviewed/edited by Bessie.
//
// A simplified version of Kandinsky's "Several Circles" (1926).
// Positions and sizes are normalised (0–1) like the Week 8 tutorial,
// so the composition scales when the window is resized.

let circles = [];        // all circles in the painting
let inputController;     // my User Input mechanic
let originX = 0;         // top-left corner of the square painting area
let originY = 0;

// Each circle: [x, y, size, colour]. Values are fractions of the painting size.
let layout = [
  [0.12, 0.19, 0.040, '#f2a6cf'], [0.10, 0.10, 0.020, '#f6e27a'],
  [0.56, 0.22, 0.055, '#c7a6f0'], [0.73, 0.22, 0.035, '#f8e48a'],
  [0.71, 0.31, 0.078, '#3f8f7f'], [0.825, 0.23, 0.020, '#f0a64a'],
  [0.89, 0.15, 0.016, '#e23a4a'], [0.13, 0.56, 0.057, '#e6dcf2'],
  [0.54, 0.42, 0.040, '#b9e6a8'], [0.51, 0.52, 0.046, '#d9a93a'],
  [0.57, 0.51, 0.057, '#b8892e'], [0.61, 0.55, 0.025, '#f2a6cf'],
  [0.43, 0.62, 0.040, '#c9c2ec'], [0.57, 0.63, 0.057, '#7ccbe8'],
  [0.25, 0.58, 0.036, '#f1c34a'], [0.30, 0.61, 0.036, '#d9603a'],
  [0.20, 0.66, 0.036, '#f8e48a'], [0.26, 0.67, 0.030, '#ee8fb5'],
  [0.29, 0.68, 0.033, '#b2523a'], [0.83, 0.70, 0.090, '#e3dcef'],
  [0.73, 0.68, 0.025, '#d8b48c'], [0.50, 0.77, 0.020, '#f1b43c'],
  [0.77, 0.88, 0.017, '#e23a4a'], [0.88, 0.91, 0.014, '#4a8fe0'],
  [0.19, 0.81, 0.025, '#5aa9e6'], [0.14, 0.78, 0.013, '#f2a6cf'],
  [0.80, 0.82, 0.013, '#f6e27a'], [0.90, 0.51, 0.015, '#3a6fe0'],
  [0.93, 0.71, 0.012, '#e0b040']
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  calculateOrigin();

  inputController = new InputController();

  // the big blue circle with the black centre
  let bigCircle = new KandinskyCircle(0.40, 0.34, 0.17, '#2f3fc4');
  bigCircle.isMain = true;
  circles.push(bigCircle);

  // create the rest of the circles from the layout array
  for (let i = 0; i < layout.length; i++) {
    let c = layout[i];
    circles.push(new KandinskyCircle(c[0], c[1], c[2], c[3]));
  }
}

function draw() {
  background(16, 16, 22);

  // dark square for the painting area
  noStroke();
  fill(28, 30, 38);
  let minDimension = min(width, height);
  rect(originX, originY, minDimension, minDimension);

  for (let circle of circles) {
    inputController.applyGravity(circle); // User Input moves the circle
    circle.display();
  }

  inputController.drawField();
  drawInstructions();
}

function drawInstructions() {
  fill(200);
  noStroke();
  textSize(12);
  let modeText = "repel";
  if (inputController.attractMode) {
    modeText = "attract";
  }
  text(`mode: ${modeText}  ·  SPACE switch  ·  ↑↓ strength  ·  ←→ field size  ·  click: glow / plant`,
       16, height - 16);
}

// The painting area is a square in the middle of the window
function calculateOrigin() {
  let minDimension = min(width, height);
  originX = (width - minDimension) / 2;
  originY = (height - minDimension) / 2;
}

function mousePressed() {
  inputController.handleMousePressed(circles);
}

function keyPressed() {
  inputController.handleKeyPressed();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateOrigin();
}

// A shared circle class. In the final project this would live in its own file
// and every mechanic would read or change its properties.
class KandinskyCircle {
  constructor(x, y, size, colour) {
    this.x = x;             // normalised position (0–1)
    this.y = y;
    this.size = size;       // normalised radius
    this.colour = colour;
    this.offsetX = 0;       // set by the User Input mechanic (in pixels)
    this.offsetY = 0;
    this.glow = 0;          // 1 after a click, fades to 0
    this.growth = 1;        // 0 → 1 for planted circles
    this.isMain = false;
  }

  display() {
    let minDimension = min(width, height);
    let drawX = this.x * minDimension + originX + this.offsetX;
    let drawY = this.y * minDimension + originY + this.offsetY;

    // planted circles grow in
    if (this.growth < 1) {
      this.growth += 0.03;
    }
    let r = this.size * minDimension * this.growth;

    push();
    noStroke();

    // glowing halo: a few see-through white circles around it
    let halo = this.glow;
    if (this.isMain) {
      halo = 0.4;
    }
    for (let i = 1; i <= 4; i++) {
      fill(255, 250, 235, 25 * halo);
      circle(drawX, drawY, r * 2 * (1 + i * 0.07));
    }
    this.glow = this.glow * 0.94; // fade the click glow

    // the circle itself, slightly see-through like the painting
    let c = color(this.colour);
    c.setAlpha(210);
    fill(c);
    circle(drawX, drawY, r * 2);

    // the black centre of the big blue circle
    if (this.isMain) {
      fill(8, 8, 12);
      circle(drawX - r * 0.08, drawY - r * 0.08, r * 1.6);
    }
    pop();
  }
}
