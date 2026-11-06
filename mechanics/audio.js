// =============================================================================
// audio.js — Audio mechanic (Lunette / Chenyu Wang, cwan0059)
// -----------------------------------------------------------------------------
// Kandinsky believed colours have sounds. Here the music is split by FFT into
// bass, mid and treble, and each band drives a different group of circles:
//   large circles → bass, medium circles → mid, small circles → treble.
// More energy in a band = the circles in that group swell. Sudden rises in a
// band release fading ripples, and loud passages reveal small orbiting satellites.
// The overall volume (p5.Amplitude) adds a subtle breathing to every circle.
// Audio only changes SIZE (and draws its own effects); it never moves circles
// or changes their colour.
//
// Each function below is labelled "Human-written" or "AI-assisted".
// AI acknowledgement: AI assistance is listed in the README. In the final
// integration round Claude (Anthropic) also helped to add the `activity` link
// with the Time mechanic, the start() function for the intro screen, the bass aura,
// the stronger ripples, and comments
// on techniques from outside the course. Reviewed and tested by Lunette.
// =============================================================================

// Human-written: Set up and load the background music.
let song;

// Load the background music before the sketch starts.
function preload(){
  song = loadSound("assets/Galaxy.mp3");
}

class AudioController {
  // Store the audio settings, frequency data and visual effects.
  // AI-assisted: Set up audio analysis and visual effect variables.
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

  // AI-assisted: Set up FFT, amplitude and the music button.
  // p5.FFT splits the sound into frequencies; p5.Amplitude measures the overall volume.
  // https://p5js.org/reference/p5.sound/p5.FFT/  ·  https://p5js.org/reference/p5.sound/p5.Amplitude/
  load() {
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

  // Starts the music if it is not already playing (called by the intro screen in sketch.js).
  start() {
    if (this.song && !this.song.isPlaying()) {
      this.togglePlayback();
    }
  }

  // AI-assisted: I wrote the play/pause logic, and AI helped with error handling.
  // Let the user play or pause the music with a button.
  // Outside the course:
  //  - userStartAudio() asks the browser for permission to play sound
  //    (browsers block audio until the user clicks): https://p5js.org/reference/p5.sound/userStartAudio/
  //  - `async` / `await` wait for that permission before playing, and try / catch / finally
  //    shows a message instead of crashing if it fails:
  //    https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises
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
      // Move keyboard focus off the button, otherwise pressing Space (attract/repel)
      // would "click" the button again and pause the music.
      // .elt is the button's HTML element; blur() removes keyboard focus from it:
      // https://p5js.org/reference/p5.Element/elt/ · https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/blur
      this.playButton.elt.blur();
    }
  }

  // Human-written: called every frame by sketch.js.
  // Smooth the audio values with lerp() to avoid sudden jumps in the circles.
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

      // Detect sudden increases in sound energy to trigger ripple effects.
      // cooldown stops one beat from firing many ripples in a row.
      const rise = targetEnergy - this.previousEnergy[band];
      if (playing && targetEnergy > 40 && rise > 14 && this.cooldown[band] === 0) {
        this.pulses[band] = true;
        this.cooldown[band] = 0.25;
      }
      this.previousEnergy[band] = targetEnergy;
    }
  }

  // Human-written: Match circle sizes to different sound frequencies.
  // Large circles react to bass, medium to mid, and small to treble.
  getBand(baseRadius) {
    if (baseRadius >= 70) {
      return "bass";
    }
    if (baseRadius >= 25) {
      return "mid";
    }
    return "treble";
  }

  // Human-written: Change circle size based on audio energy.
  // activity (0–1) comes from the Time mechanic: the pulse is full in BLOOM and
  // softer in FADE, so the music "falls asleep" with the universe.
  getScale(baseRadius, activity = 1) {
    const band = this.getBand(baseRadius);
    let amount = 0.25;
    if (band === "bass") {
      amount = 0.35;
    } else if (band === "mid") {
      amount = 0.30;
    }
    const bandScale = this.energy[band] / 255 * amount * activity;
    return 1 + bandScale + this.level * 0.03 * activity;
  }

  // Draws ripples and satellites on top of the circles.
  // renderStates = each circle's final position/size/colour from sketch.js,
  // so the effects follow circles that Input has moved or Audio has scaled.
  drawEffects(renderStates, now, dt, circleList = circles) {
    const seconds = constrain(dt, 0, 0.05);
    const sourceCounts = { bass: 0, mid: 0, treble: 0 };
    push();
    colorMode(RGB, 255, 255, 255, 255);
    for (let c of circleList) {
      const band = this.getBand(c.baseRadius);
      // Pick at most two stable sources per band; invisible sources stay quiet.
      if (sourceCounts[band] >= 2) {
        continue;
      }
      sourceCounts[band]++;
      const state = renderStates[c.id];
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

    // Bass aura: every large circle gets a soft glowing ring that swells with the bass.
    const bassGlow = constrain((this.energy.bass - 90) / 165, 0, 1);
    if (bassGlow > 0) {
      noFill();
      for (let c of circleList) {
        const state = renderStates[c.id];
        if (state && state.alpha > 0 && this.getBand(c.baseRadius) === "bass") {
          for (let ring = 1; ring <= 3; ring++) {
            strokeWeight(ring * 3);
            stroke(red(state.colour), green(state.colour), blue(state.colour),
                   state.alpha * bassGlow * 0.12);
            circle(state.x, state.y, state.radius * 2 + 10 + ring * 8);
          }
        }
      }
    }

    let remainingRipples = [];
    for (let ripple of this.ripples) {
      ripple.age += seconds;
      const state = renderStates[ripple.sourceId];
      if (ripple.age < ripple.lifetime && state && state.alpha > 0) {
        this.drawRipple(ripple, state);
        remainingRipples.push(ripple);
      }
    }
    this.ripples = remainingRipples;
    pop();
  }

  // Human-written: Draw expanding ripple rings that slowly fade away over time.
  // Final round: thicker, brighter rings (stronger beats = thicker lines) so the
  // music is easier to see from across the room.
  drawRipple(ripple, state) {
    const fade = 1 - ripple.age / ripple.lifetime;
    noFill();
    strokeWeight(1 + 2 * ripple.strength * fade);
    for (let ring = 0; ring < 2; ring++) {
      stroke(red(state.colour), green(state.colour), blue(state.colour),
             state.alpha * fade * ripple.strength * 0.9);
      const radius = state.radius + ripple.age * 65 + ring * 7;
      circle(state.x, state.y, radius * 2);
    }
  }

  // AI-assisted: Animate small dots orbiting the circles when the music gets louder.
  // Math.cos / Math.sin place each dot on a circle around the planet (polar coordinates).
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
//Chenyu Wang
//cwan0059
//540544219
//assignment3
