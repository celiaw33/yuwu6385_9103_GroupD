const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 680;
const BACKGROUND_COLOUR = "#05050a";
const AUDIO_PATH = "music.mp3";

let circles = [];
let audioController;
let timeController;
let perlinController;
let inputController;

const renderStates = new Map();
let nextPlantedId = 0;

function setup() {
  createCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
  pixelDensity(1);
  colorMode(RGB, 255, 255, 255, 255);
  noStroke();

  // typeof guards let the main sketch run before all four classes exist.
  if (typeof AudioController !== "undefined") {
    audioController = new AudioController();
  }
  if (typeof TimeController !== "undefined") {
    timeController = new TimeController();
  }
  if (typeof PerlinController !== "undefined") {
    perlinController = new PerlinController();
  }
  if (typeof InputController !== "undefined") {
    inputController = new InputController();
  }

  // Random chooses the initial layout; only this file owns the shared array.
  circles = perlinController?.makeComposition?.() ?? [];
  timeController?.reset?.(circles);
  audioController?.load?.(AUDIO_PATH);
}

function draw() {
  background(BACKGROUND_COLOUR);

  const now = millis();
  const dt = constrain(deltaTime / 1000, 0, 0.05);
  const pointer = getPointer();

  timeController?.update?.(now);
  audioController?.update?.(dt);
  inputController?.update?.(dt, pointer);
  renderStates.clear();

  for (const c of circles) {
    const life = constrain(timeController?.getLife?.(c.id) ?? 1, 0, 1);
    const drift = perlinController?.getDrift?.(c, now) ?? { x: 0, y: 0 };
    const offset = inputController?.getOffset?.(c, dt) ?? { x: 0, y: 0 };
    const audioScale = audioController?.getScale?.(c.baseRadius) ?? 1;
    const light = perlinController?.getLight?.(c, now) ?? 0;
    const sourceColour = timeController?.getColour?.(c, now) ?? c.baseColour;
    const rgb = Array.isArray(sourceColour)
      ? color(...sourceColour)
      : color(sourceColour);

    const state = {
      x: c.baseX + drift.x + offset.x,
      y: c.baseY + drift.y + offset.y,
      radius: c.baseRadius * audioScale,
      alpha: constrain((c.baseAlpha ?? 255) * life, 0, 255),
      colour: color(
        constrain(red(rgb) + light, 0, 255),
        constrain(green(rgb) + light, 0, 255),
        constrain(blue(rgb) + light, 0, 255)
      ),
      halo: constrain(timeController?.getHalo?.(c.id, now) ?? 0, 0, 1),
      life
    };

    renderStates.set(c.id, state);
    drawCircle(c, state, now);
  }

  // Effects receive final positions so they follow circles moved by gravity.
  push();
  audioController?.drawEffects?.(renderStates, now, dt);
  pop();
  push();
  inputController?.drawCursor?.(pointer, now);
  pop();
}

function drawCircle(c, state, now) {
  if (state.alpha <= 0 || state.radius <= 0) return;

  push();
  colorMode(RGB, 255, 255, 255, 255);
  noStroke();

  const paint = color(state.colour);

  // Time owns halo strength; the final circle radius includes Audio's scale.
  for (let layer = 3; layer >= 1; layer--) {
    paint.setAlpha(state.alpha * state.halo * 0.05);
    fill(paint);
    circle(state.x, state.y, state.radius * 2 * (1 + layer * 0.08));
  }

  paint.setAlpha(state.alpha);
  fill(paint);

  // A future Perlin renderer uses the supplied final position/radius/alpha.
  // Until then, use a plain disc so the shared renderer is defined and usable.
  push();
  if (perlinController?.drawOrganicDisc) {
    perlinController.drawOrganicDisc(c, state, now);
  } else {
    circle(state.x, state.y, state.radius * 2);
  }
  pop();

  push();
  perlinController?.drawPigmentClouds?.(c, state, now);
  pop();

  // Dark inner discs match the pilots' ring/crescent construction.
  if (c.type === "ring" || c.type === "crescent") {
    const inner = color(BACKGROUND_COLOUR);
    inner.setAlpha(state.alpha);
    fill(inner);
    const ratio = c.holeRatio ?? (c.type === "ring" ? 0.8 : 0.75);
    circle(
      state.x + state.radius * (c.holeOffsetX ?? 0),
      state.y + state.radius * (c.holeOffsetY ?? 0),
      state.radius * 2 * ratio
    );
  }

  pop();
}

function getPointer() {
  return {
    x: mouseX,
    y: mouseY,
    inside: mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height,
    pressed: mouseIsPressed
  };
}

function addCircle(x, y) {
  if (!perlinController?.createCircleAt) return;
  const id = `planted-${nextPlantedId++}`;
  const c = perlinController.createCircleAt(x, y, id);
  if (!c) return;
  c.id = id;
  circles.push(c);
  timeController?.registerCircle?.(id);
  return c;
}

function mousePressed(event) {
  // Ignore clicks on buttons or other page elements.
  if (event?.target && event.target.tagName !== "CANVAS") return;
  const pointer = getPointer();
  if (!pointer.inside) return;
  inputController?.handleMousePressed?.(pointer, circles, renderStates, addCircle);
}

function mouseReleased() {
  inputController?.handleMouseReleased?.(getPointer());
}

function keyPressed(event) {
  // Do not intercept typing in page controls.
  const target = event?.target;
  if (target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target?.tagName)) return;
  inputController?.handleKeyPressed?.(key, keyCode);
  if (inputController && [32, 37, 38, 39, 40].includes(keyCode)) return false;
}


// Keep a fixed canvas for the first integration. A responsive canvas must also
// convert mouse coordinates and all effects into this same design space
