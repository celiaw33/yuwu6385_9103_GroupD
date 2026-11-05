// =============================================================================
// time_based.js — Time-based mechanic (Yuan Wang, ywan0329)
// -----------------------------------------------------------------------------
// Time is the painting's score: like a piece of music, our universe has a
// beginning, a climax and an end. Every cycle runs through four phases:
//   BIRTH  — circles are born one by one, in the order of the composition
//   GROWTH — each circle warms from cold grey-blue into its Kandinsky colour
//   BLOOM  — the full composition breathes, halos are strongest
//   FADE   — circles fade away one after another, then a new cycle begins
// Each new cycle rotates the whole palette's hue, so no two cycles look the same.
//
// Timer is a small reusable stopwatch built on millis() (not frameCount), so the
// rhythm is the same on every computer. TimeController owns the life cycle and
// only RETURNS numbers (life, colour, halo, background), so it never writes onto
// teammates' data.
//
// AI acknowledgement: Claude (Anthropic) helped to write these header comments,
// the comments on techniques from outside the course, getActivity() and the
// onNewCycle event during final integration. All changes were reviewed and tested by Yuan.
// =============================================================================

class Timer {
  constructor(duration, startTime = millis()) {
    this.duration = duration;
    // Store the start time so progress is based on elapsed time, not frame count.
    this.startTime = startTime;
  }

  progress(now = millis()) {
    // Clamp so callers always receive a value from 0 (start) to 1 (finished).
    return constrain((now - this.startTime) / this.duration, 0, 1);
  }

  isFinished(now = millis()) {
    return this.progress(now) >= 1;
  }

  reset(now = millis()) {
    this.startTime = now;
  }
}

class TimeController {
  // `circles` is the sketch's array of circles. Each circle needs a unique `id`
  // and a `baseColour` (anything p5's color() accepts).
  constructor(circles = []) {
    this.circles = circles;

    // ---- Rhythm (milliseconds). Change these to adjust the feel. ----
    this.birthInterval = 350;   // gap between one circle being born and the next
    this.growDuration = 2500;   // how long a circle takes to fade in fully
    this.bloomDuration = 8000;
    this.fadeDuration = 5000;
    this.backgroundFade = 1500; // how long background and halo blend between phases

    // ---- Look ----
    this.coldRGB = [90, 105, 125];  // grey-blue every circle is born as
    this.hueShiftPerCycle = 35;     // degrees the palette rotates each new cycle
    this.haloSpeed = 0.002;         // how fast halos breathe
    this.haloPhaseStep = 1.7;       // breathing offset between neighbours, so they never sync
    this.haloWeights = { BIRTH: 0.35, GROWTH: 0.6, BLOOM: 1, FADE: 0.5 };
    // How lively the universe is in each phase (0–1). Audio and Perlin read this
    // through getActivity(): the music pulse and drift are strongest in BLOOM and
    // soften in FADE, as if the universe is falling asleep.
    this.activityLevels = { BIRTH: 0.55, GROWTH: 0.8, BLOOM: 1, FADE: 0.35 };

    this.phaseOrder = ['BIRTH', 'GROWTH', 'BLOOM', 'FADE'];
    // BIRTH depends on how many circles there are, so it is filled in by startCycle().
    this.phaseDurations = {
      BIRTH: 0,
      GROWTH: this.growDuration,
      BLOOM: this.bloomDuration,
      FADE: this.fadeDuration
    };
    this.cycleDuration = 0;

    // Background colour for each phase (used by sketch.js via getBackgroundColor()).
    // Deep space at birth, a faint indigo glow at bloom, darkest when the universe fades.
    this.phaseBackgrounds = {
      BIRTH: color(5, 5, 10),
      GROWTH: color(10, 10, 22),
      BLOOM: color(20, 16, 38),
      FADE: color(4, 4, 8)
    };

    this.coldColour = color(this.coldRGB[0], this.coldRGB[1], this.coldRGB[2]);
    this.showDebug = false; // Press D in the sketch to show the phase panel.

    this.now = millis();
    this.ids = [];          // every circle id Time knows about, in birth order
    this.cycleCount = 0;    // how many full cycles have finished
    this.mainBirthTimer = null; // Preserve the central crescent's first fade-in.

    // Event hook: sketch.js can set this to a function that is called when a cycle ends.
    // If it returns a new circles array, the next cycle uses those circles
    // (sketch.js uses this to ask Perlin for a new random variation of the universe).
    this.onNewCycle = null;
    this.startCycle();
  }

  // Alternative entry point: give Time a new set of circles and start again from cycle 0.
  reset(circles) {
    this.circles = circles;
    this.ids = [];
    this.cycleCount = 0;
    this.mainBirthTimer = null;
    this.startCycle();
  }

  startCycle() {
    this.now = millis();
    // Rebuild the birth order from the current circles, so circles that were removed
    // (e.g. old stars planted by the viewer) do not keep a birth slot.
    this.ids = [];
    this.syncIds();

    // Everything below is keyed by circle id, so Time never has to write onto a circle.
    this.circleTimers = {};   // id -> Timer for that circle's fade-in (missing = not born yet)
    this.lives = {};          // id -> latest life value, 0 to 1
    this.fadeStartLife = {};  // id -> life at the moment FADE began
    this.order = {};          // id -> position in birth order
    this.shiftCache = {};     // id -> hue-shifted colour for the current cycle
    for (let i = 0; i < this.ids.length; i++) {
      this.order[this.ids[i]] = i;
    }

    // BIRTH lasts long enough to release every circle, including ones planted earlier.
    this.phaseDurations.BIRTH = Math.max(1, this.ids.length * this.birthInterval);
    // The full cycle is the sum of each phase, so changing a duration updates it automatically.
    this.cycleDuration = 0;
    for (let name of this.phaseOrder) {
      this.cycleDuration += this.phaseDurations[name];
    }

    this.nextIndex = 0;
    this.birthTimer = new Timer(this.birthInterval, this.now);
    this.previousBackground = this.phaseBackgrounds.FADE;
    this.previousHaloWeight = this.haloWeights.FADE;
    this.previousActivity = this.activityLevels.FADE;
    this.currentPhase = 'BIRTH';
    this.phaseTimer = new Timer(this.phaseDurations.BIRTH, this.now);
    this.onBirth(0);
  }

  // Pick up any circles that were added to the circles array after we last looked.
  syncIds() {
    for (let c of this.circles) {
      if (!this.ids.includes(c.id)) {
        this.ids.push(c.id);
      }
    }
  }

  // Call once per frame, before reading any values.
  update(now = millis()) {
    this.now = now;
    const elapsed = now - this.phaseTimer.startTime;

    // During BIRTH, release one circle at a time, then restart the interval for the next.
    if (this.currentPhase === 'BIRTH' && this.nextIndex < this.ids.length && this.birthTimer.isFinished(now)) {
      this.onBirth(this.nextIndex);
      this.birthTimer.reset(now);
    }

    const phaseProgress = this.phaseTimer.progress(now);
    for (let i = 0; i < this.ids.length; i++) {
      const id = this.ids[i];
      this.lives[id] = this.computeLife(id, i, elapsed, phaseProgress);
    }

    if (this.phaseTimer.isFinished(now)) {
      if (this.currentPhase === 'FADE') {
        this.onCycleComplete();
      } else {
        this.goToNextPhase();
      }
    }
  }

  // Life of one circle: how fully present it is (0 = gone, 1 = full).
  computeLife(id, i, elapsed, phaseProgress) {
    const birth = this.birthLife(id);
    // The central blue crescent does not pulse or fade with the global phases.
    if (id === "main") {
      return birth;
    }

    if (this.currentPhase === 'BIRTH' || this.currentPhase === 'GROWTH') {
      return birth;
    }

    if (this.currentPhase === 'BLOOM') {
      // Vary the pulse period by circle index so the circles do not all pulse in sync.
      // Math.sin is used on purpose: p5's sin() would change meaning if angleMode(DEGREES) is on.
      const period = 2000 + (i % 5) * 700;
      const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * elapsed / period);
      return birth * (0.85 + 0.15 * pulse);
    }

    // FADE: circles fade one after another by delaying each fade according to its index.
    const delay = (1 - i / this.ids.length) * 0.4;
    const t = constrain((phaseProgress - delay) / 0.6, 0, 1);
    // fadeStartLife keeps the fade starting exactly where BLOOM left off (no jump).
    // `??` (nullish coalescing, outside the course) means "use 1 if there is no value yet".
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
    const startLife = this.fadeStartLife[id] ?? 1;
    return birth * startLife * (1 - this.easeInOut(t));
  }

  // 0 = not born, rising to 1 as the circle's own fade-in timer runs.
  birthLife(id) {
    let timer = this.circleTimers[id];
    if (id === "main" && this.mainBirthTimer) {
      timer = this.mainBirthTimer;
    }
    if (!timer) {
      return 0;
    }
    return this.easeInOut(timer.progress(this.now));
  }

  onBirth(index) {
    if (index >= this.ids.length) return;
    const id = this.ids[index];
    // Reuse this timer across cycles so the crescent never becomes invisible again.
    if (id === "main" && this.mainBirthTimer) {
      this.circleTimers[id] = this.mainBirthTimer;
    }
    // A circle planted by the viewer may already have its own timer; do not restart it.
    if (!this.circleTimers[id]) {
      this.circleTimers[id] = new Timer(this.growDuration, this.now);
    }
    if (id === "main") {
      this.mainBirthTimer = this.circleTimers[id];
    }
    this.nextIndex = index + 1;
  }

  // Called by the user-input mechanic when the viewer plants a new circle.
  // The circle is born straight away and then follows the same phases as everyone else.
  registerCircle(id) {
    if (this.ids.includes(id)) return;
    this.ids.push(id);
    this.order[id] = this.ids.length - 1;
    this.circleTimers[id] = new Timer(this.growDuration);
  }

  goToNextPhase() {
    this.previousBackground = this.phaseBackgrounds[this.currentPhase];
    this.previousHaloWeight = this.haloWeights[this.currentPhase];
    this.previousActivity = this.activityLevels[this.currentPhase];
    const index = this.phaseOrder.indexOf(this.currentPhase);
    this.currentPhase = this.phaseOrder[index + 1];
    this.phaseTimer = new Timer(this.phaseDurations[this.currentPhase], this.now);

    if (this.currentPhase === 'FADE') {
      // Remember each circle's brightness at fade start so the fade has a stable starting value.
      // Object.assign({}, obj) makes a copy of the object (outside the course):
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
      this.fadeStartLife = Object.assign({}, this.lives);
    }
  }

  // Event: fired when FADE finishes. Tells sketch.js (through onNewCycle) that a new
  // universe is about to be born, then starts the next cycle.
  onCycleComplete() {
    this.cycleCount++;
    if (this.onNewCycle) {
      const nextCircles = this.onNewCycle(this.cycleCount);
      if (Array.isArray(nextCircles)) {
        this.circles = nextCircles;
      }
    }
    this.startCycle();
  }

  // "easeInOutQuad" easing curve, from https://easings.net/#easeInOutQuad
  // The `? :` (ternary operator) picks the first formula for x < 0.5, the second otherwise.
  easeInOut(x) {
    // Accelerate through the middle and ease at both ends for smoother transitions.
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  // ---- Read-only values for the rest of the sketch ----
  // Every getter below accepts either a circle object or a circle id.

  // Accepts either a circle object or an id string and always returns the id.
  idOf(circleOrId) {
    return (typeof circleOrId === 'object' && circleOrId !== null) ? circleOrId.id : circleOrId;
  }

  getPhase() {
    return this.currentPhase;
  }

  getCycleCount() {
    return this.cycleCount;
  }

  // 0 to 1: use it for opacity.
  getLife(circleOrId) {
    const id = this.idOf(circleOrId);
    if (id === "main") {
      return this.birthLife(id);
    }
    return this.lives[id] ?? 0;
  }

  // Cold grey-blue warms into the circle's own colour as it is born.
  // From the second cycle on, the whole palette is rotated by hueShiftPerCycle degrees.
  getColour(circle) {
    // Preserve the crescent's original blue layers rather than rotating their hue.
    if (circle.id === "main") {
      return lerpColor(this.coldColour, color(circle.baseColour), this.birthLife(circle.id));
    }
    let shifted = this.shiftCache[circle.id];
    if (!shifted) {
      shifted = this.shiftHue(color(circle.baseColour), this.cycleCount * this.hueShiftPerCycle);
      this.shiftCache[circle.id] = shifted;
    }
    return lerpColor(this.coldColour, shifted, this.birthLife(circle.id));
  }

  // 0 to 1: halo strength. Follows the circle's life, is strongest in BLOOM,
  // and breathes with a sine wave that is offset per circle so halos never pulse together.
  getHalo(circleOrId) {
    const id = this.idOf(circleOrId);
    const offset = (this.order[id] || 0) * this.haloPhaseStep;
    const breathing = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(this.now * this.haloSpeed + offset));
    return this.getLife(id) * this.getHaloWeight() * breathing;
  }

  // Blend from the previous phase's halo weight to the current one at the start of each phase.
  getHaloWeight() {
    const amount = constrain((this.now - this.phaseTimer.startTime) / this.backgroundFade, 0, 1);
    const from = this.previousHaloWeight;
    const to = this.haloWeights[this.currentPhase];
    return from + (to - from) * amount;
  }

  // 0 to 1: how lively the universe is right now. Read by Audio (pulse size) and
  // Perlin (drift distance). Blends between phases like the halo weight, so there is no jump.
  getActivity() {
    const amount = constrain((this.now - this.phaseTimer.startTime) / this.backgroundFade, 0, 1);
    const from = this.previousActivity;
    const to = this.activityLevels[this.currentPhase];
    return from + (to - from) * amount;
  }

  // Blend from the previous phase's colour to the current one at the start of each phase.
  getBackgroundColor() {
    const amount = constrain((this.now - this.phaseTimer.startTime) / this.backgroundFade, 0, 1);
    return lerpColor(this.previousBackground, this.phaseBackgrounds[this.currentPhase], amount);
  }

  // Rotate a colour's hue by `degrees` using the standard hue-rotate matrix on RGB.
  // Matrix values from the W3C Filter Effects spec (feColorMatrix "hueRotate"):
  // https://www.w3.org/TR/filter-effects-1/#feColorMatrixElement
  // Works on RGB 0-255, so it does not depend on p5's colorMode or angleMode.
  shiftHue(col, degrees) {
    if (degrees % 360 === 0) {
      return col;
    }
    const a = degrees * Math.PI / 180;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const r = red(col);
    const g = green(col);
    const b = blue(col);
    const nr = r * (0.213 + cs * 0.787 - sn * 0.213) + g * (0.715 - cs * 0.715 - sn * 0.715) + b * (0.072 - cs * 0.072 + sn * 0.928);
    const ng = r * (0.213 - cs * 0.213 + sn * 0.143) + g * (0.715 + cs * 0.285 + sn * 0.140) + b * (0.072 - cs * 0.072 - sn * 0.283);
    const nb = r * (0.213 - cs * 0.213 - sn * 0.787) + g * (0.715 - cs * 0.715 + sn * 0.715) + b * (0.072 + cs * 0.928 + sn * 0.072);
    return color(constrain(nr, 0, 255), constrain(ng, 0, 255), constrain(nb, 0, 255), alpha(col));
  }

  // Toggled with the D key in sketch.js — useful when presenting the phases.
  toggleDebug() {
    this.showDebug = !this.showDebug;
  }

  drawDebugPanel() {
    if (!this.showDebug) {
      return;
    }
    // Save and restore drawing state so debug styling does not affect the rest of the sketch.
    push();
    noStroke();
    fill(0, 0, 0, 200);
    rect(20, 20, 200, 52, 6);
    fill(242, 182, 50);
    textFont('monospace');
    textSize(13);
    text('phase: ' + this.currentPhase + '  #' + (this.cycleCount + 1), 32, 42);
    noFill();
    stroke(242, 182, 50);
    rect(32, 52, 176, 9);
    noStroke();
    fill(242, 182, 50);
    rect(32, 52, 176 * this.phaseTimer.progress(this.now), 9);
    pop();
  }
}
