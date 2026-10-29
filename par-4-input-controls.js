// input-controls.js — User Input mechanic (Bessie)
// This code was drafted with the help of Claude (Anthropic) and reviewed/edited by Bessie.
//
// The viewer's mouse becomes a gravity source inside Kandinsky's universe.
// Circles near the mouse are pulled in (attract) or pushed away (repel),
// and slowly return to their original place when the mouse moves away.
// Bigger circles are "heavier" and move less — Kandinsky's idea of mass and position.

class InputController {
  constructor() {
    // true = circles are pulled toward the mouse, false = circles are pushed away
    // SPACE switches between the two (same boolean trick as the Week 7 tutorial)
    this.attractMode = true;

    // How far the gravity reaches, as a fraction of the canvas (normalised, like Week 8)
    // LEFT / RIGHT arrows change this
    this.fieldRadius = 0.25;

    // How strong the gravity is, as a fraction of the canvas
    // UP / DOWN arrows change this
    this.strength = 0.08;

    // How quickly a circle follows its target (0–1). Small = slow and smooth
    this.easing = 0.08;
  }

  // Works out how far one circle should be moved by the mouse.
  // It saves the result in the circle's offsetX and offsetY.
  applyGravity(circle) {
    let minDimension = min(width, height);

    // the circle's real position on screen (normalised value × canvas size)
    let circleX = circle.x * minDimension + originX;
    let circleY = circle.y * minDimension + originY;

    // distance between the circle and the mouse (dist() — Week 7 Part 5)
    let d = dist(mouseX, mouseY, circleX, circleY);
    let reach = this.fieldRadius * minDimension;

    // by default the circle wants to go home (no offset)
    let targetX = 0;
    let targetY = 0;

    if (d < reach && d > 1) {
      // closer to the mouse = stronger pull (1 at the mouse, 0 at the edge of the field)
      let closeness = 1 - d / reach;

      // bigger circles are heavier, so they move less
      let weight = constrain(0.02 / circle.size, 0.1, 1);

      let force = this.strength * minDimension * closeness * weight;

      // direction from the circle to the mouse, divided by d so its length is 1
      let directionX = (mouseX - circleX) / d;
      let directionY = (mouseY - circleY) / d;

      if (this.attractMode) {
        force = min(force, d * 0.8); // stop circles jumping past the mouse
        targetX = directionX * force;
        targetY = directionY * force;
      } else {
        targetX = -directionX * force; // minus = opposite direction = push away
        targetY = -directionY * force;
      }
    }

    // Easing: move a small part of the way to the target each frame.
    // When the mouse leaves, target is 0 so the circle slowly drifts home.
    circle.offsetX += (targetX - circle.offsetX) * this.easing;
    circle.offsetY += (targetY - circle.offsetY) * this.easing;
  }

  // Called from mousePressed() in sketch.js
  // Click on a circle = it glows. Click on empty space = plant a new circle.
  handleMousePressed(circles) {
    let minDimension = min(width, height);

    for (let circle of circles) {
      let circleX = circle.x * minDimension + originX + circle.offsetX;
      let circleY = circle.y * minDimension + originY + circle.offsetY;
      if (dist(mouseX, mouseY, circleX, circleY) < circle.size * minDimension) {
        circle.glow = 1; // fades out in KandinskyCircle.display()
        return;          // stop here, don't plant a new circle
      }
    }

    // Turn the mouse position back into normalised values (0–1)
    let newX = (mouseX - originX) / minDimension;
    let newY = (mouseY - originY) / minDimension;
    let palette = ['#f4d35e', '#ee9bc4', '#7ec8e3', '#e85d4a', '#a8d5a2', '#c9b8e8'];

    // A planted circle starts at size 0 and grows in.
    // Later it will be handed to the Time mechanic to begin its life cycle.
    let newCircle = new KandinskyCircle(newX, newY, random(0.015, 0.04), random(palette));
    newCircle.growth = 0;
    newCircle.planted = true;
    circles.push(newCircle);
  }

  // Called from keyPressed() in sketch.js (same arrow-key + constrain() structure as the random line tutorial)
  handleKeyPressed() {
    if (key == " ") {
      this.attractMode = !this.attractMode; // flip true/false
    }
    if (keyCode === UP_ARROW) {
      this.strength = constrain(this.strength + 0.02, 0.02, 0.2);
    }
    if (keyCode === DOWN_ARROW) {
      this.strength = constrain(this.strength - 0.02, 0.02, 0.2);
    }
    if (keyCode === RIGHT_ARROW) {
      this.fieldRadius = constrain(this.fieldRadius + 0.05, 0.1, 0.5);
    }
    if (keyCode === LEFT_ARROW) {
      this.fieldRadius = constrain(this.fieldRadius - 0.05, 0.1, 0.5);
    }
  }

  // Draws the gravity field as rings around the mouse.
  // frameCount % 60 makes the rings loop every 60 frames (Week 8 Part 3).
  drawField() {
    let reach = this.fieldRadius * min(width, height);
    let progress = (frameCount % 60) / 60; // goes 0 → 1, then back to 0

    // attract = rings move inward, repel = rings move outward
    if (this.attractMode) {
      progress = 1 - progress;
    }

    push(); // keep these styles inside this function (Week 8 Part 2)
    noFill();
    for (let i = 0; i < 3; i++) {
      let ringProgress = (progress + i / 3) % 1;
      if (this.attractMode) {
        stroke(170, 150, 255, 70 * (1 - ringProgress));
      } else {
        stroke(255, 170, 120, 70 * (1 - ringProgress));
      }
      circle(mouseX, mouseY, reach * 2 * ringProgress);
    }
    noStroke();
    fill(255, 160);
    circle(mouseX, mouseY, 8);
    pop();
  }
}
