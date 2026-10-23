// Kandinsky-inspired "Several Circles" study.
// Developed with ChatGPT assistance: randomSeed()/noiseSeed() create repeatable
// variations; Perlin noise drives soft contours, pigment density and slow drift.

let circles = [];
let activeSeed;

const baseCircles = [
  // floating top circles
  { x: 75,  y: 92,  r: 42, h: 326, s: 48, b: 98, a: 84 },
  { x: 704, y: 84,  r: 34, h: 50,  s: 45, b: 100, a: 96 },
  { x: 800, y: 120, r: 19, h: 38,  s: 92, b: 98, a: 96 },
  { x: 862, y: 54,  r: 15, h: 350, s: 83, b: 98, a: 96 },
  // circles around the main ring
  { x: 394, y: 110, r: 48, h: 280, s: 42, b: 98, a: 62 },
  { x: 474, y: 274, r: 34, h: 84,  s: 40, b: 97, a: 82 },
  { x: 398, y: 356, r: 54, h: 40,  s: 68, b: 50, a: 72 },
  { x: 354, y: 366, r: 35, h: 45,  s: 74, b: 96, a: 84 },
  { x: 302, y: 274, r: 15, h: 222, s: 85, b: 95, a: 92 },
  // lower-left cluster
  { x: 172, y: 402, r: 35, h: 46,  s: 84, b: 97, a: 90 },
  { x: 219, y: 434, r: 42, h: 14,  s: 69, b: 87, a: 84 },
  { x: 142, y: 458, r: 31, h: 48,  s: 89, b: 100, a: 94 },
  { x: 178, y: 469, r: 28, h: 346, s: 75, b: 95, a: 88 },
  { x: 210, y: 471, r: 30, h: 20,  s: 63, b: 42, a: 82 },
  // bottom orbiting group
  { x: 335, y: 428, r: 47, h: 202, s: 35, b: 90, a: 72 },
  { x: 468, y: 456, r: 53, h: 194, s: 67, b: 91, a: 80 },
  { x: 72,  y: 498, r: 48, h: 265, s: 25, b: 98, a: 88 },
  // distant dots
  { x: 717, y: 530, r: 18, h: 45,  s: 72, b: 95, a: 96 },
  { x: 795, y: 567, r: 12, h: 52,  s: 92, b: 98, a: 96 },
  { x: 836, y: 597, r: 15, h: 345, s: 85, b: 94, a: 95 },
  { x: 904, y: 620, r: 13, h: 205, s: 78, b: 88, a: 90 }
];

function setup() {
  createCanvas(960, 680);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);

  activeSeed = floor(random(100000));
  randomSeed(activeSeed);
  noiseSeed(activeSeed);
  makeComposition();
}

function makeComposition() {
  circles = [];
  for (let item of baseCircles) {
    circles.push({
      x: item.x + random(-10, 10),
      y: item.y + random(-10, 10),
      radius: item.r * random(0.90, 1.10),
      hue: item.h + random(-6, 6),
      saturation: item.s + random(-6, 6),
      brightness: item.b + random(-5, 5),
      alpha: item.a + random(-7, 5),
      edgeSeed: random(1000)
    });
  }
}

function draw() {
  background("#05050a");
  let time = frameCount * 0.0025;

  drawMainRing(320, 300, time);
  drawGreenDonut(560, 196, time);
  drawMoon(790, 500, time);
  drawSmallDonut(82, 410, time);

  for (let circle of circles) drawPigmentCircle(circle, time);
  drawTinyAccents(time);
}

function drawMainRing(cx, cy, time) {
  // Broad mint halo behind the blue crescent.
  drawOrganicDisc(cx, cy, 218, 166, 22, 98, 76, 17, time, 10);
  drawOrganicDisc(cx, cy, 205, 224, 87, 78, 95, 23, time, 7);
  // Place the dark inner disc upper-left, leaving blue visible on the right and bottom.
  drawOrganicDisc(cx - 45, cy - 35, 164, 240, 50, 4, 100, 29, time, 2);
}

function drawGreenDonut(cx, cy, time) {
  drawOrganicDisc(cx, cy, 76, 168, 67, 34, 82, 52, time, 5);
  drawOrganicDisc(cx, cy, 18, 230, 28, 5, 100, 53, time, 2);
}

function drawMoon(cx, cy, time) {
  drawOrganicDisc(cx, cy, 73, 255, 20, 92, 86, 70, time, 4);
  drawPigmentClouds(cx, cy, 73, 255, 22, 92, 70, time, 4);
  drawOrganicDisc(cx - 27, cy - 4, 19, 186, 45, 93, 88, 71, time, 2);
  drawOrganicDisc(cx + 10, cy - 31, 10, 350, 84, 96, 95, 72, time, 1);
  drawOrganicDisc(cx + 28, cy - 29, 8, 230, 20, 6, 100, 73, time, 1);
}

function drawSmallDonut(cx, cy, time) {
  drawOrganicDisc(cx, cy, 52, 260, 36, 95, 78, 91, time, 3);
  drawOrganicDisc(cx, cy, 45, 300, 17, 97, 67, 92, time, 2);
  drawOrganicDisc(cx + 9, cy - 10, 17, 230, 25, 4, 100, 93, time, 1);
}

function drawPigmentCircle(circle, time) {
  let driftX = map(noise(circle.edgeSeed, 201, time), 0, 1, -3, 3);
  let driftY = map(noise(circle.edgeSeed, 401, time), 0, 1, -3, 3);
  let light = map(noise(circle.edgeSeed, 51, time), 0, 1, -5, 5);
  let cx = circle.x + driftX;
  let cy = circle.y + driftY;

  drawOrganicDisc(cx, cy, circle.radius, circle.hue, circle.saturation,
    circle.brightness + light, circle.alpha, circle.edgeSeed, time, 3);
  drawPigmentClouds(cx, cy, circle.radius, circle.hue, circle.saturation,
    circle.brightness + light, circle.edgeSeed, time, 3);
}

function drawOrganicDisc(cx, cy, radius, hue, saturation, brightness, alpha, seed, time, edgeAmount) {
  push();
  noStroke();
  fill(hue, constrain(saturation, 0, 100), constrain(brightness, 0, 100), alpha);
  beginShape();
  // Animate the contour on every frame; refreshing is only needed for a new layout.
  let edgeTime = frameCount * 0.008;
  for (let angle = 0; angle <= TWO_PI; angle += 0.045) {
    let n = noise(cos(angle) * 1.15 + seed, sin(angle) * 1.15 + seed, edgeTime);
    let wobble = map(n, 0, 1, -edgeAmount, edgeAmount);
    vertex(cx + cos(angle) * (radius + wobble), cy + sin(angle) * (radius + wobble));
  }
  endShape(CLOSE);
  pop();
}

function drawPigmentClouds(cx, cy, radius, hue, saturation, brightness, seed, time, count) {
  push();
  noStroke();
  drawingContext.filter = `blur(${max(2, radius * 0.10)}px)`;
  for (let layer = 0; layer < count; layer++) {
    let angle = noise(seed + layer * 17, 80, time * 0.7) * TWO_PI * 2;
    let distance = map(noise(seed + layer * 31, 170, time * 0.7), 0, 1, 0, radius * 0.34);
    let patchRadius = map(noise(seed + layer * 47, 250, time * 0.7), 0, 1, radius * 0.22, radius * 0.48);
    let isLight = layer % 3 !== 2;
    fill(hue, saturation * 0.80,
      isLight ? min(100, brightness + 12) : max(0, brightness - 18),
      isLight ? 9 : 7);
    ellipse(cx + cos(angle) * distance, cy + sin(angle) * distance,
      patchRadius * 2, patchRadius * 1.35);
  }
  drawingContext.filter = "none";
  pop();
}

function drawTinyAccents(time) {
  drawOrganicDisc(130, 304, 10, 51, 95, 98, 100, 801, time, 1);
  drawOrganicDisc(131, 304, 6, 230, 22, 5, 100, 802, time, 1);
  drawOrganicDisc(849, 332, 18, 195, 75, 92, 90, 803, time, 2);
  drawOrganicDisc(849, 332, 12, 222, 88, 96, 100, 804, time, 1);
  drawOrganicDisc(889, 451, 12, 45, 72, 92, 92, 805, time, 1);
}
