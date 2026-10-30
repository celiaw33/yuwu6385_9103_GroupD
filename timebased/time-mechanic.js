class Timer {
  constructor(duration) {
    this.duration = duration;
    // Store the start time so progress is based on elapsed time, not frame count.
    this.startTime = millis();
  }

  progress() {
    // Clamp the ratio so callers always receive a value from 0 (start) to 1 (finished).
    return constrain((millis() - this.startTime) / this.duration, 0, 1);
  }

  isFinished() {
    return this.progress() >= 1;
  }

  reset() {
    this.startTime = millis();
  }
}
class TimeController {
  constructor(circles) {
    this.circles = circles;

    this.birthInterval = 350;
    this.growDuration = 2500;
    this.bloomDuration = 8000;
    this.fadeDuration = 5000;
    this.backgroundFade = 1500;

    this.phaseDurations = {
      BIRTH: circles.length * this.birthInterval,
      GROWTH: this.growDuration,
      BLOOM: this.bloomDuration,
      FADE: this.fadeDuration
    };
    this.phaseOrder = ['BIRTH', 'GROWTH', 'BLOOM', 'FADE'];

    // The full cycle is the sum of each phase, so changing a phase duration updates it automatically.
    this.cycleDuration = 0;
    for (let name of this.phaseOrder) {
      this.cycleDuration += this.phaseDurations[name];
    }

    this.phaseBackgrounds = {
      BIRTH: color(16, 16, 22),
      GROWTH: color(22, 22, 30),
      BLOOM: color(27, 27, 36),
      FADE: color(14, 14, 20)
    };

    this.showDebug = true;
    this.startCycle();
  }

  startCycle() {
    this.nextCircleIndex = 0;
    // Each circle gets its own growth timer; null means that circle has not been born yet.
    this.circleTimers = new Array(this.circles.length).fill(null);
    this.birthTimer = new Timer(this.birthInterval);
    this.fadeStartLife = [];
    this.previousBackground = this.phaseBackgrounds.FADE;
    this.currentPhase = 'BIRTH';
    this.phaseTimer = new Timer(this.phaseDurations.BIRTH);
    for (let c of this.circles) {
      c.life = 0;
    }
    this.onBirth(0);
  }

  update() {
    let elapsed = millis() - this.phaseTimer.startTime;
    let t;

    // Introduce one circle at a time during BIRTH, then restart the interval for the next one.
    if (this.currentPhase === 'BIRTH' && this.birthTimer.isFinished()) {
      this.onBirth(this.nextCircleIndex);
      this.birthTimer.reset();
    }

    for (let i = 0; i < this.circles.length; i++) {
      let c = this.circles[i];

      if (this.currentPhase === 'BIRTH' || this.currentPhase === 'GROWTH') {
        if (this.circleTimers[i] !== null) {
          t = this.easeInOut(this.circleTimers[i].progress());
          c.life = t;
        }
      } else if (this.currentPhase === 'BLOOM') {
        // Vary pulse periods by circle index so the circles do not all pulse in sync.
        let period = 2000 + (i % 5) * 700;
        let pulse = 0.5 + 0.5 * sin(TWO_PI * elapsed / period);
        c.life = 0.85 + 0.15 * pulse;
      } else if (this.currentPhase === 'FADE') {
        // Fade circles in sequence by delaying each circle's fade according to its index.
        let delay = (1 - i / this.circles.length) * 0.4;
        t = constrain((this.phaseTimer.progress() - delay) / 0.6, 0, 1);
        c.life = this.fadeStartLife[i] * (1 - this.easeInOut(t));
      }
    }

    if (this.phaseTimer.isFinished()) {
      if (this.currentPhase === 'FADE') {
        this.onCycleComplete();
      } else {
        this.goToNextPhase();
      }
    }
  }

  onBirth(index) {
    if (index >= this.circles.length) return;
    // Starting this timer begins that circle's growth; its progress is used during BIRTH/GROWTH.
    this.circleTimers[index] = new Timer(this.growDuration);
    this.nextCircleIndex = index + 1;
  }

  goToNextPhase() {
    this.previousBackground = this.phaseBackgrounds[this.currentPhase];
    let index = this.phaseOrder.indexOf(this.currentPhase);
    this.currentPhase = this.phaseOrder[index + 1];
    this.phaseTimer = new Timer(this.phaseDurations[this.currentPhase]);

    if (this.currentPhase === 'FADE') {
      // Preserve each circle's brightness at fade start so the fade has a stable starting value.
      this.fadeStartLife = this.circles.map(c => c.life);
    }
  }

  onCycleComplete() {
    this.startCycle();
  }

  easeInOut(x) {
    // Accelerate through the middle and ease at both ends for smoother transitions.
    return x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2;
  }

  getBackgroundColor() {
    // Blend from the previous phase's color to the current one at the start of each phase.
    let amount = constrain((millis() - this.phaseTimer.startTime) / this.backgroundFade, 0, 1);
    return lerpColor(this.previousBackground, this.phaseBackgrounds[this.currentPhase], amount);
  }

  getPhase() {
    return this.currentPhase;
  }

  getLife(circle) {
    return circle.life;
  }

  toggleDebug() {
    this.showDebug = !this.showDebug;
  }

  drawDebugPanel() {
    if (!this.showDebug) return;
    // Save and restore drawing state so debug styling does not affect the rest of the sketch.
    push();
    noStroke();
    fill(0, 0, 0, 200);
    rect(20, 20, 200, 52, 6);
    fill(242, 182, 50);
    textFont('monospace');
    textSize(13);
    text('phase: ' + this.currentPhase, 32, 42);
    noFill();
    stroke(242, 182, 50);
    rect(32, 52, 176, 9);
    noStroke();
    fill(242, 182, 50);
    rect(32, 52, 176 * this.phaseTimer.progress(), 9);
    pop();
  }
}