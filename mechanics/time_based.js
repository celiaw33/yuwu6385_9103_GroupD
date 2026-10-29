class Timer {
  constructor(duration, startTime) {
    this.duration = duration;
    this.startTime = startTime;
  }

  progress(now) {
    return constrain((now - this.startTime) / this.duration, 0, 1);
  }
}

class TimeController {
  constructor() {
    // Change these values to adjust the rhythm (milliseconds).
    this.birthWindow = 5000;      // initial appearance of the composition
    this.birthDuration = 1000;    // fade-in time for a new circle
    this.visibleDuration = 12000; // each circle stays visible for 12 seconds
    this.fadeDuration = 4000;     // fade out over 4 seconds, then back over 4
    this.cycleDuration = this.visibleDuration + this.fadeDuration * 2;

    this.circleList = [];
    this.circleTimers = {};
    this.loopStarts = {};        // different start time for each circle
    this.registeredCount = 0;
    this.startTime = 0;
    this.now = 0;
    this.currentPhase = "BIRTH";
  }

  reset(circleList) {
    this.circleList = circleList;
    this.startTime = millis();
    this.now = this.startTime;
    this.currentPhase = "BIRTH";
    this.startCircleTimers();
  }

  startCircleTimers() {
    this.circleTimers = {};
    this.loopStarts = {};
    this.registeredCount = this.circleList.length;
    let gap = 0;
    if (this.circleList.length > 1) {
      gap = (this.birthWindow - this.birthDuration) / (this.circleList.length - 1);
    }
    for (let i = 0; i < this.circleList.length; i++) {
      const c = this.circleList[i];
      const birthTime = this.startTime + i * gap;
      this.circleTimers[c.id] = new Timer(this.birthDuration, birthTime);
      // Spread their local cycles across the full period so they take turns.
      const delay = i * this.cycleDuration / this.circleList.length;
      this.loopStarts[c.id] = birthTime + this.birthDuration + delay;
    }
  }

  update(now) {
    this.now = now;
    if (now - this.startTime < this.birthWindow) {
      this.currentPhase = "BIRTH";
    } else {
      this.currentPhase = "ACTIVE";
    }
    // Do not restart all the birth timers every 20 seconds.
  }

  registerCircle(id) {
    const birthTime = millis();
    this.circleTimers[id] = new Timer(this.birthDuration, birthTime);
    const delay = (this.registeredCount * 900) % this.cycleDuration;
    this.loopStarts[id] = birthTime + this.birthDuration + delay;
    this.registeredCount++;
  }

  getLife(id) {
    const timer = this.circleTimers[id];
    if (!timer) {
      return 0;
    }
    const birth = timer.progress(this.now);
    // Keep the central blue crescent visible after its initial fade-in.
    if (id === "main") {
      return birth;
    }
    const elapsed = this.now - this.loopStarts[id];
    if (elapsed < 0) {
      return birth;
    }

    // % repeats THIS circle's cycle, not the whole composition.
    const localTime = elapsed % this.cycleDuration;
    let life = 1;
    if (localTime < this.visibleDuration) {
      life = 1;
    } else if (localTime < this.visibleDuration + this.fadeDuration) {
      // Slowly disappear.
      life = 1 - (localTime - this.visibleDuration) / this.fadeDuration;
    } else {
      // Slowly reappear. There is no pause on a fully black frame.
      life = (localTime - this.visibleDuration - this.fadeDuration) /
        this.fadeDuration;
    }
    return birth * constrain(life, 0, 1);
  }

  getColour(c, now) {
    const coldColour = color(90, 105, 125);
    const baseColour = color(c.baseColour);
    let progress = 0;
    if (this.circleTimers[c.id]) {
      progress = this.circleTimers[c.id].progress(now);
    }
    return lerpColor(coldColour, baseColour, progress);
  }

  getHalo(id, now) {
    const breathing = 0.5 + Math.sin(now * 0.002) * 0.1;
    return this.getLife(id) * breathing;
  }

  getPhase() {
    return this.currentPhase;
  }

  getCycleCount() {
    // Kept for compatibility: there are no whole-composition restarts now.
    return 0;
  }
}
