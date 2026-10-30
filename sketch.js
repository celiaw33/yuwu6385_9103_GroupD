// References:
// https://p5js.org/reference/p5/millis/
// https://p5js.org/reference/p5/deltaTime/
// https://p5js.org/reference/p5/constrain/

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 680;
const BACKGROUND_COLOUR = "#05050a";

let circles = [];
let audioController;
let timeController;
let perlinController;
let inputController;
let renderStates = {};

function setup() {
  createCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
  pixelDensity(1);
  colorMode(RGB, 255, 255, 255, 255);
  noStroke();

  audioController = new AudioController();
  timeController = new TimeController();
  perlinController = new PerlinController();
  inputController = new InputController();

  // Random chooses the initial layout(AI-assisted code)
  circles = perlinController.makeComposition();
  timeController.reset(circles);
  audioController.load();
}

function draw() {
  background(BACKGROUND_COLOUR);

  //time and mouse input(AI-assisted code)
  const now = millis();
  const dt = constrain(deltaTime / 1000, 0, 0.05);
  const pointer = getPointer();

  timeController.update(now);
  audioController.update(dt);
  inputController.update(dt, pointer);
  renderStates = {};

  for (const c of circles) {
    const life = constrain(timeController.getLife(c.id), 0, 1);//(AI-assisted code) for celestial life cycle. c.id is the unique ID assigned when Perlin creates the circle.
    const drift = perlinController.getDrift(c, now); // Get this circle's Perlin drift at the current time.
    const offset = inputController.getOffset(c, dt, drift); // Get this circle's offset from mouse gravity and click waves.
    const audioScale = audioController.getScale(c.baseRadius); // Get the music-driven size multiplier.
    const light = perlinController.getLight(c, now); // Get the subtle RGB brightness change.
    const rgb = timeController.getColour(c, now); // Get the current colour from Time.

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

  // Effects receive final positions so they follow circles moved by gravity.(AI-assisted code)
  push();
  audioController.drawEffects(renderStates, now, dt);
  pop();

  push();
  inputController.drawCursor(pointer, now);
  pop();
}

function drawCircle(c, state, now) {
  if (state.alpha <= 0 || state.radius <= 0) 
    return;// Skip circles that are invisible or have no size.

  push();
  noStroke();

  // Draw three translucent layers for a soft halo.
  for (let layer = 3; layer >= 1; layer--) {
    fill(
      red(state.colour),
      green(state.colour),
      blue(state.colour),
      state.alpha * state.halo * 0.05
    );

    circle(
      state.x,
      state.y,
      state.radius * 2 * (1 + layer * 0.08)
    );
  }

  paint.setAlpha(state.alpha);
  fill(paint);

   perlinController.drawOrganicDisc(c, state, now);
   perlinController.drawPigmentClouds(c, state, now);

  pop();
}

function getPointer() {
  return {
    x: mouseX,
    y: mouseY,
    inside: mouseX >= 0 && mouseX < width &&
            mouseY >= 0 && mouseY < height,
    pressed: mouseIsPressed
  };
}//(AI-assisted code)

function mousePressed(event) {
  // Ignore clicks on the music button or other page elements.(AI-assisted)
  if (event && event.target && event.target.tagName !== "CANVAS") {
    return;
  }

  const pointer = getPointer();

  if (pointer.inside) {
    inputController.handleMousePressed(pointer, circles, renderStates);
  }
}

function mouseReleased() {
  inputController.handleMouseReleased();
}