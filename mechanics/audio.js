// Audio pilot inspired by the group's circle artwork, not a full reproduction.
// p5.js drawing and resizing: https://p5js.org/reference/
let song;
let audioController;
let playButton;
let statusText;
let ready = false;
let starting = false;

// Coordinates use a fixed design space, then scale to fit the window.
// Bands are assigned by original size; colours form a muted blue, jade and warm rose palette.
let circles = [];
let ripples = [];
const rippleLimit = 64;
let rippleSources = {};

function createComposition() {
  // Original horizontal composition: three interwoven sound clusters.
  // Original diameter selects the band; colour is an artistic choice.
  const layout = [
    [300, 360, 224, "#537BC5", true, { hole: 0.85 }],
    [838, 290, 172, "#4AB6B0", true, { hole: 0.86 }],
    [640, 405, 138, "#7469A9", true, { hole: 0.78 }],
    [381, 338, 116, "#E3A28E"], [437, 402, 86, "#D3738C"],
    [336, 462, 73, "#9FB7D3"], [552, 293, 91, "#BDA4D9"],
    [718, 365, 103, "#D8B869"], [870, 376, 78, "#80C5BA"],
    [765, 223, 76, "#D8AAA8"], [223, 295, 82, "#6B83AF"],
    [941, 310, 49, "#F0D797"], [811, 441, 41, "#E4A66E"],
    [486, 337, 35, "#F1D296"], [582, 470, 28, "#AFCECC"],
    [183, 423, 31, "#D3B9D8"], [389, 237, 24, "#EAC98E"],
    [673, 206, 19, "#B2CFE6"], [959, 441, 21, "#D9A0B4"],
    [139, 268, 15, "#76B8B3"], [530, 530, 18, "#D6C184"],
    [990, 222, 12, "#BFC5E4"], [729, 502, 13, "#C59EC9"],
    [461, 194, 18, "#DA9B83"], [266, 537, 24, "#9DBABD"],
    [606, 169, 11, "#EAC98E"], [903, 526, 16, "#8F9FC9"],
    [119, 480, 10, "#E5B984"]
  ];
  circles = layout.map(([x, y, size, colour, ring = false, style = {}]) =>
    new AudioCircle(x, y, size, colour, ring, false, style));
  // Cache the fixed sources once instead of filtering all circles every frame.
  for (const band of ["bass", "mid", "treble"]) {
    rippleSources[band] = circles.filter(c => c.band === band).slice(0, 2);
  }
  // Three loose sprays of treble-triggered dots link the sound clusters.
  for (let i = 0; i < 42; i++) {
    const group = i % 3;
    const angle = i * 2.399963;
    const distance = 80 + (i % 7) * 15;
    const centers = [[300, 360], [580, 355], [838, 290]];
    circles.push(new AudioCircle(
      centers[group][0] + Math.cos(angle) * distance,
      centers[group][1] + Math.sin(angle) * distance,
      3 + (i % 4) * 2.5, ["#EDD5A2", "#B9CBE0", "#D8ACC1"][group],
      false, true));
  }
}

function setup() {
  const canvas = createCanvas(windowWidth, Math.max(420, windowHeight - 150));
  canvas.parent("artwork");
  canvas.attribute("aria-label", "Three sound clusters with fine concentric rings. Bass controls large circles, mid controls medium circles, and treble controls small circles.");
  playButton = document.getElementById("play-button");
  statusText = document.getElementById("status");
  playButton.addEventListener("click", togglePlayback);
  // Bind to the canvas only: button clicks must not toggle audio twice.
  // p5 calls mousePressed(event); the handler filters clicks by target.
  noStroke();
  textFont("Arial");
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  createComposition();

  // Asynchronous loading keeps the page usable if the file cannot load.
  song = loadSound("music.mp3", () => {
    audioController = new AudioController(song);
    ready = true;
    playButton.disabled = false;
    statusText.textContent = "Ready. Play the music to begin.";
  }, () => {
    statusText.textContent = "Could not load music.mp3. Check the file and open this project with a local web server.";
  });
}

function draw() {
  background("#15151D");
  if (audioController) audioController.update();
  const seconds = Math.min(deltaTime / 1000, 0.05);
  for (const c of circles) c.update(audioController, seconds);
  if (audioController) {
    for (const band of ["bass", "mid", "treble"]) {
      if (!audioController.pulses[band]) continue;
      // Only two fixed sources per band emit rings on each detected rise.
      for (const source of rippleSources[band]) {
        ripples.push(new AudioRipple(source, audioController[band] / 255));
      }
    }
  }
  for (const ripple of ripples) ripple.update(seconds);
  ripples = ripples.filter(r => r.age < r.lifetime).slice(-rippleLimit);

  // Fit the entire composition without changing size-group membership.
  const fit = Math.min(width / 1100, height / 720);
  push();
  translate((width - 1100 * fit) / 2, (height - 720 * fit) / 2);
  scale(fit);

  for (const c of circles) c.draw(audioController);
  // Fine rings sit above the translucent paint-like layers.
  for (const ripple of ripples) ripple.draw();

  // Live meters help explain the mapping during the concept presentation.
  drawMeter(150, "BASS / LARGE", "#5475D1", audioController ? audioController.bass : 0);
  drawMeter(440, "MID / MEDIUM", "#C74F79", audioController ? audioController.mid : 0);
  drawMeter(730, "TREBLE / SMALL", "#F2C94C", audioController ? audioController.treble : 0);
  pop();
}

function drawMeter(x, label, colour, energy) {
  noStroke();
  fill("#B7C0D4");
  textSize(16);
  text(label, x, 651);
  fill("#1B2235");
  rect(x, 667, 220, 6, 3);
  fill(colour);
  rect(x, 667, 220 * constrain(energy / 255, 0, 1), 6, 3);
}

// The click enables browser audio; the visual mechanism remains audio-driven.
// async/await waits for the audio context to start before playing the track.
// Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
async function togglePlayback() {
  if (!ready || starting) return;
  starting = true;
  playButton.disabled = true;
  try {
    await userStartAudio();
    if (song.isPlaying()) {
      song.pause();
      playButton.textContent = "Play music";
      playButton.setAttribute("aria-pressed", "false");
      statusText.textContent = "Paused. Ripples and satellites gently fade away.";
    } else {
      song.loop();
      playButton.textContent = "Pause music";
      playButton.setAttribute("aria-pressed", "true");
      statusText.textContent = "Playing. Medium and small circles swell with sound; sustained audio reveals satellites and energy rises release ripples.";
    }
  } catch (error) {
    statusText.textContent = "Audio could not start. Click Play music to try again.";
    console.error(error);
  } finally {
    starting = false;
    playButton.disabled = false;
  }
}

function mousePressed(event) {
  if (event && event.target instanceof HTMLCanvasElement) togglePlayback();
}

function windowResized() {
  resizeCanvas(windowWidth, Math.max(420, windowHeight - 150));
}
