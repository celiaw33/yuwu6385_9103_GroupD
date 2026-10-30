//audio: shared circles, RGB colours and alpha 0-255.
let song;

function preload(){
  song = loadSound("assets/Galaxy.mp3");
}

class AudioController {
  constructor() {
    this.song = null;
    this.fft = null;
    this.amplitude = null;
    this.playButton = null;
    this.starting = false;
    this.bands = ["bass", "mid", "treble"];
    this.energy = { bass: 0, mid: 0, treble: 0 };
    this.previousEnergy = { bass: 0, mid: 0, treble: 0 };
    this.pulses = { bass: false, mid: false, treble: false };
    this.cooldown = { bass: 0, mid: 0, treble: 0 };
    this.level = 0;
    this.ripples = [];
    this.rippleLimit = 64;
  }

  load() {
    // sketch.js currently passes AUDIO_PATH. Deliberately use the song from
    // preload instead: do not replace Galaxy.mp3 with that old music.mp3 path.
    if (!song || !song.isLoaded()) {
      console.warn("The background track from preload is not available.");
      return;
    }
    this.song = song;
    this.fft = new p5.FFT(0.8, 1024);
    this.fft.setInput(this.song);
    this.amplitude = new p5.Amplitude(0.8);
    this.amplitude.setInput(this.song);

    if (!this.playButton) {
      this.playButton = createButton("Play music");
      const controller = this;
      this.playButton.mousePressed(function () {
        controller.togglePlayback();
      });
    }
  }

  async togglePlayback() {
    if (!this.song || this.starting) {
      return;
    }
    this.starting = true;
    this.playButton.attribute("disabled", "");
    try {
      await userStartAudio();
      if (this.song.isPlaying()) {
        this.song.pause();
        this.playButton.html("Play music");
      } else {
        this.song.loop();
        this.playButton.html("Pause music");
      }
    } catch (error) {
      this.playButton.html("Try playing again");
      console.error("Could not start the background music:", error);
    } finally {
      this.starting = false;
      this.playButton.removeAttribute("disabled");
    }
  }

  update(dt) {
    const seconds = constrain(dt, 0, 0.05);
    const smoothing = constrain(seconds * 8, 0, 1);
    let playing = false;
    let targetLevel = 0;
    if (this.song && this.song.isPlaying()) {
      playing = true;
      this.fft.analyze();
      targetLevel = constrain(this.amplitude.getLevel(), 0, 1);
    }
    this.level = lerp(this.level, targetLevel, smoothing);

    for (let band of this.bands) {
      let targetEnergy = 0;
      if (playing) {
        targetEnergy = constrain(this.fft.getEnergy(band), 0, 255);
      }
      this.energy[band] = lerp(this.energy[band], targetEnergy, smoothing);
      this.cooldown[band] = Math.max(0, this.cooldown[band] - seconds);
      this.pulses[band] = false;
      const rise = targetEnergy - this.previousEnergy[band];
      if (playing && targetEnergy > 40 && rise > 14 && this.cooldown[band] === 0) {
        this.pulses[band] = true;
        this.cooldown[band] = 0.25;
      }
      this.previousEnergy[band] = targetEnergy;
    }
  }

  getBand(baseRadius) {
    if (baseRadius >= 70) {
      return "bass";
    }
    if (baseRadius >= 25) {
      return "mid";
    }
    return "treble";
  }

  getScale(baseRadius) {
    const band = this.getBand(baseRadius);
    let amount = 0.25;
    if (band === "bass") {
      amount = 0.35;
    } else if (band === "mid") {
      amount = 0.30;
    }
    const bandScale = this.energy[band] / 255 * amount;
    return 1 + bandScale + this.level * 0.03;
  }

  getState(renderStates, id) {
    // Adapt the earlier Map-based main sketch and the classroom-style object.
    if (typeof renderStates.get === "function") {
      return renderStates.get(id);
    }
    return renderStates[id];
  }

  drawEffects(renderStates, now, dt) {
    const seconds = constrain(dt, 0, 0.05);
    const sourceCounts = { bass: 0, mid: 0, treble: 0 };
    push();
    colorMode(RGB, 255, 255, 255, 255);
    for (let c of circles) {
      const band = this.getBand(c.baseRadius);
      // Pick at most two stable sources per band; invisible sources stay quiet.
      if (sourceCounts[band] >= 2) {
        continue;
      }
      sourceCounts[band]++;
      const state = this.getState(renderStates, c.id);
      if (!state || state.alpha <= 0 || state.radius <= 0) {
        continue;
      }
      if (this.pulses[band] && this.ripples.length < this.rippleLimit) {
        this.ripples.push({
          sourceId: c.id,
          age: 0,
          lifetime: 1.5,
          strength: this.energy[band] / 255
        });
      }
      this.drawSatellites(c, state, band, now);
    }

    let remainingRipples = [];
    for (let ripple of this.ripples) {
      ripple.age += seconds;
      const state = this.getState(renderStates, ripple.sourceId);
      if (ripple.age < ripple.lifetime && state && state.alpha > 0) {
        this.drawRipple(ripple, state);
        remainingRipples.push(ripple);
      }
    }
    this.ripples = remainingRipples;
    pop();
  }

  drawRipple(ripple, state) {
    const fade = 1 - ripple.age / ripple.lifetime;
    noFill();
    strokeWeight(0.8);
    for (let ring = 0; ring < 2; ring++) {
      stroke(red(state.colour), green(state.colour), blue(state.colour),
             state.alpha * fade * ripple.strength * 0.5);
      const radius = state.radius + ripple.age * 65 + ring * 7;
      circle(state.x, state.y, radius * 2);
    }
  }

  drawSatellites(c, state, band, now) {
    // Energy reveals satellites; pausing smoothly makes them disappear.
    const visibility = constrain((this.energy[band] - 70) / 185, 0, 1);
    if (visibility <= 0) {
      return;
    }
    noStroke();
    fill(red(state.colour), green(state.colour), blue(state.colour),
         state.alpha * visibility * 0.6);
    for (let i = 0; i < 3; i++) {
      const angle = now * 0.0002 + c.edgeSeed + i * Math.PI * 2 / 3;
      const distance = state.radius + 10 + i * 3;
      const size = 3 + i;
      circle(state.x + Math.cos(angle) * distance,
             state.y + Math.sin(angle) * distance, size);
    }
  }
}




