// =============================================================================
// sketch.js — A Universe of Circles (IDEA9103 Group D)
// -----------------------------------------------------------------------------
// A living reinterpretation of Wassily Kandinsky's "Several Circles" (1926).
// This file brings the four mechanics together. It owns the shared `circles`
// array and, every frame, asks each mechanic for ONE quality of each circle:
//
//   Quality                       Owner (file)                     Call
//   ---------------------------------------------------------------------------
//   layout, drift, edge texture   Perlin & Random (Celia)          getDrift(), drawOrganicDisc()
//   life, colour, halo, phase     Time (Yuan)                      getLife(), getColour(), getHalo()
//   size                          Audio (Lunette)                  getScale()
//   gravity offset                User Input (Bessie)              getOffset()
//
//   final x      = baseX + Perlin drift + Input offset
//   final radius = baseRadius × Audio scale
//   final alpha  = baseAlpha × Time life
//
// Links between mechanics:
//   Time → Audio, Perlin : getActivity() softens the music pulse and drift in FADE.
//   Time → Random        : at the end of every cycle Time fires onNewCycle and
//                          Perlin builds a new random variation ("Universe No. X").
//   Input → Time         : clicking empty space sends a gravity wave and plants
//                          a new star, which Time then lets be born and fade.
//
// Canvas size: the piece is drawn in a fixed 960 × 680 "design space" and
// style.css scales the canvas to fit the browser window. We chose this so the
// composition keeps Kandinsky's proportions on every screen; p5 converts mouseX /
// mouseY into canvas coordinates, so the interaction still lines up when scaled.
//
// AI acknowledgement: Claude (Anthropic) helped to write the integration code in
// this file (the per-frame pipeline, the intro screen, planting stars, the
// onNewCycle link and these comments). Reviewed and tested by the group.
// References:
// https://p5js.org/reference/p5/millis/
// https://p5js.org/reference/p5/deltaTime/
// https://p5js.org/reference/p5/constrain/
// =============================================================================

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 680;
const MAX_PLANTED_STARS = 8; // Older planted stars disappear so the composition stays readable.

let circles = [];        // The shared circle data (created by Perlin & Random).
let audioController;
let timeController;
let perlinController;
let inputController;
let renderStates = {};   // id -> final { x, y, radius, alpha, colour, halo } for this frame.
let plantedIds = [];     // ids of stars planted by the viewer, oldest first.
let started = false;     // false while the intro screen is showing.

function setup() {
  createCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
  pixelDensity(1);
  colorMode(RGB, 255, 255, 255, 255);
  noStroke();

  audioController = new AudioController();
  timeController = new TimeController();
  perlinController = new PerlinController();
  inputController = new InputController();

  // Random chooses the first layout.
  circles = perlinController.makeComposition();

  // Event link Time → Random: when a cycle ends, ask Perlin for a new variation.
  timeController.onNewCycle = startNewVariation;

  audioController.load();
}

function draw() {
  // Time owns the background: it changes gently with each phase of the universe.
  background(timeController.getBackgroundColor());

  if (!started) {
    drawIntro();
    return;
  }

  const now = millis();
  // deltaTime = milliseconds since the last frame; capped so a slow frame cannot cause a jump.
  const dt = constrain(deltaTime / 1000, 0, 0.05);
  const pointer = getPointer();

  timeController.update(now);
  audioController.update(dt);
  inputController.update(dt, pointer);

  // How lively the universe is in this phase (1 in BLOOM, lower in FADE).
  const activity = timeController.getActivity();
  renderStates = {};

  for (const c of circles) {
    const life = constrain(timeController.getLife(c.id), 0, 1);         // Time: 0 = gone, 1 = full
    const drift = perlinController.getDrift(c, now, activity);          // Perlin: gentle drift
    const offset = inputController.getOffset(c, dt, drift);             // Input: gravity offset
    const audioScale = audioController.getScale(c.baseRadius, activity); // Audio: size multiplier
    const light = perlinController.getLight(c, now);                    // Perlin: brightness shimmer
    const rgb = timeController.getColour(c, now);                       // Time: colour

    const state = {
      x: c.baseX + drift.x + offset.x,
      y: c.baseY + drift.y + offset.y,
      radius: c.baseRadius * audioScale,
      alpha: constrain(c.baseAlpha * life, 0, 255),
      colour: color(
        constrain(red(rgb) + light, 0, 255),
        constrain(green(rgb) + light, 0, 255),
        constrain(blue(rgb) + light, 0, 255)
      ),
      halo: constrain(timeController.getHalo(c.id, now), 0, 1),
      life: life
    };

    renderStates[c.id] = state;
    drawCircle(c, state, now);
  }

  // Effects receive the final positions, so they follow circles moved by gravity.
  push();
  audioController.drawEffects(renderStates, now, dt, circles);
  pop();

  push();
  inputController.drawCursor(pointer, now, renderStates);
  pop();

  drawUniverseLabel();
  timeController.drawDebugPanel(); // Hidden until the viewer presses D.
}

// Draws one circle: Time's halo first, then Perlin's organic disc and pigment texture.
function drawCircle(c, state, now) {
  if (state.alpha <= 0 || state.radius <= 0) {
    return; // Skip circles that are invisible or have no size.
  }

  push();
  noStroke();

  // Three translucent layers make a soft halo.
  for (let layer = 3; layer >= 1; layer--) {
    fill(red(state.colour), green(state.colour), blue(state.colour),
         state.alpha * state.halo * 0.05);
    circle(state.x, state.y, state.radius * 2 * (1 + layer * 0.08));
  }

  perlinController.drawOrganicDisc(c, state, now);
  perlinController.drawPigmentClouds(c, state, now);
  pop();
}

// ---- Links between mechanics ------------------------------------------------

// Called by Time (onNewCycle) when FADE ends. Returns the circles for the next cycle.
// Planted stars belong to the old universe, so they are not carried over.
function startNewVariation() {
  circles = perlinController.newVariation();
  plantedIds = [];
  return circles;
}

// Input → Time: a gravity wave leaves a new star behind at the click point.
function plantStar(x, y) {
  const palette = perlinController.getPalette(circles);
  const star = perlinController.makePlantedCircle(x, y, palette);
  circles.push(star);
  plantedIds.push(star.id);
  timeController.registerCircle(star.id); // Time starts this star's own life.

  // Keep at most MAX_PLANTED_STARS: remove the oldest one.
  // splice() changes the same array, so Time keeps seeing the current circles.
  if (plantedIds.length > MAX_PLANTED_STARS) {
    const oldestId = plantedIds.shift();
    for (let i = 0; i < circles.length; i++) {
      if (circles[i].id === oldestId) {
        circles.splice(i, 1);
        break;
      }
    }
  }
}

// The intro screen hides the "click to allow sound" step inside the artwork itself:
// the first click starts the universe's first cycle and the music together.
function startExperience() {
  started = true;
  timeController.reset(circles);
  audioController.start();
}

// ---- Screens and labels -----------------------------------------------------

function drawIntro() {
  push();
  const centreX = width / 2;
  const centreY = height / 2;

  // A faint blue ring as a hint of the crescent that is about to be born.
  noFill();
  stroke(26, 72, 199, 70);
  strokeWeight(2);
  circle(centreX, centreY - 20, 330);

  noStroke();
  textAlign(CENTER, CENTER);
  fill(235, 235, 245);
  textSize(34);
  text("A Universe of Circles", centreX, centreY - 70);

  fill(170, 175, 195);
  textSize(14);
  text("after Wassily Kandinsky, Several Circles (1926)", centreX, centreY - 36);

  textSize(13);
  fill(200, 205, 220);
  text("Move the mouse to pull the circles with gravity  ·  Hold for a black hole\n" +
       "Click a planet to make it glow  ·  Click empty space to send a gravity wave and plant a star\n" +
       "Space: attract / repel  ·  ↑↓ strength  ·  ←→ range  ·  D: show the time phase",
       centreX, centreY + 20);

  // "Click to begin" slowly fades in and out.
  const pulse = 0.5 + 0.5 * Math.sin(millis() * 0.003);
  fill(235, 235, 245, 120 + 135 * pulse);
  textSize(16);
  text("Click anywhere to begin  ·  music will play", centreX, centreY + 90);
  pop();
}

// Top-right label: which variation of the universe we are in, and its phase.
function drawUniverseLabel() {
  push();
  noStroke();
  fill(200, 205, 220, 150);
  textSize(12);
  textAlign(RIGHT, TOP);
  text("Several Circles  ·  Universe No. " + perlinController.variationNumber +
       "  ·  " + timeController.getPhase().toLowerCase(), width - 16, 14);
  pop();
}

// ---- Input events -----------------------------------------------------------

function getPointer() {
  return {
    x: mouseX,
    y: mouseY,
    inside: mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height,
    pressed: mouseIsPressed
  };
}

function mousePressed(event) {
  // Ignore clicks on the music button or other page elements.
  if (event && event.target && event.target.tagName !== "CANVAS") {
    return;
  }
  const pointer = getPointer();
  if (!pointer.inside) {
    return;
  }
  if (!started) {
    startExperience();
    return;
  }
  // Input reports what the click did; a gravity wave also plants a new star.
  const result = inputController.handleMousePressed(pointer, circles, renderStates);
  if (result === "wave") {
    plantStar(pointer.x, pointer.y);
  }
}

function mouseReleased() {
  inputController.handleMouseReleased();
}

function keyPressed(event) {
  // Do not take over keys while the viewer is typing or using a button.
  if (event && event.target && ["INPUT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)) {
    return;
  }
  if (!started) {
    if (keyCode === ENTER) {
      startExperience();
    }
    return;
  }
  if (key === "d" || key === "D") {
    timeController.toggleDebug();
  }
  inputController.handleKeyPressed(key, keyCode);
  // Returning false stops Space and the arrow keys from scrolling the page.
  if ([32, LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode)) {
    return false;
  }
}
