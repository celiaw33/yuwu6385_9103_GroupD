// Click planets to highlight them; click empty space to emit fading ripples.
class InputController {
  constructor() {
    this.attractMode = true; // true = attract, false = repel
    this.fieldRadius = 90 / 680; // Normalised radius: keep the current 90px reach; Bessie originally used 0.25.
    this.strength = 0.08;        // Gravity strength as a fraction of the shorter canvas dimension.
    this.easing = 0.08;          // Smaller values make following and returning slower.
    this.rippleDuration = 1.2;   // Seconds before a click ripple disappears.
    this.maxRipples = 20;        // Limit overlapping click feedback.

    this.pointer = { x: 0, y: 0, inside: false, pressed: false };
    this.offsets = {};       // Per-circle offsets; baseX/baseY remain unchanged.
    this.clickRipples = [];  // Temporary feedback, separate from the planets.
    this.glows = [];         // Clicked circles can glow independently.
  }

  update(dt, pointer) {
    this.pointer = pointer;
    for (let glow of this.glows) {
      glow.life = Math.max(0, glow.life - dt);
    }
    let remainingRipples = [];
    for (let ripple of this.clickRipples) {
      ripple.age += dt;
      if (ripple.age < this.rippleDuration) {
        remainingRipples.push(ripple);
      }
    }
    this.clickRipples = remainingRipples;
  }

  // The main sketch calls getOffset; the gravity calculation keeps Bessie's method name.
  getOffset(c, dt, drift) {
    if (!drift) {
      drift = { x: 0, y: 0 };
    }
    return this.applyGravity(c, dt, drift);
  }

  applyGravity(c, dt, drift) {
    if (!this.offsets[c.id]) {
      this.offsets[c.id] = { x: 0, y: 0 };
    }
    const offset = this.offsets[c.id];
    const minDimension = min(width, height);
    const circleX = c.baseX + drift.x;
    const circleY = c.baseY + drift.y;
    const d = dist(this.pointer.x, this.pointer.y, circleX, circleY);
    const reach = this.fieldRadius * minDimension;
    let targetX = 0;
    let targetY = 0;

    if (this.pointer.inside && d < reach && d > 1) {
      const closeness = 1 - d / reach;
      // Normalise the shared radius for Bessie's mass calculation.
      const sizeRatio = c.baseRadius / minDimension;
      const weight = constrain(0.02 / sizeRatio, 0.1, 1);
      let force = this.strength * minDimension * closeness * weight;
      if (this.pointer.pressed) {
        force = force * 1.8; // Keep the existing hold-to-strengthen interaction.
      }
      const directionX = (this.pointer.x - circleX) / d;
      const directionY = (this.pointer.y - circleY) / d;

      if (this.attractMode) {
        force = min(force, d * 0.8); // Prevent attraction from overshooting the cursor.
        targetX = directionX * force;
        targetY = directionY * force;
      } else {
        targetX = -directionX * force;
        targetY = -directionY * force;
      }
    }

    // Match Bessie's easing at about 60fps and adjust for other frame rates using dt.
    const step = constrain(this.easing * dt * 60, 0, 1);
    offset.x = lerp(offset.x, targetX, step);
    offset.y = lerp(offset.y, targetY, step);
    return offset;
  }

  getState(states, id) {
    // Support both the current sketch's Map and plain objects.
    if (typeof states.get === "function") {
      return states.get(id);
    }
    return states[id];
  }

  handleMousePressed(pointer, circleList, states) {
    if (!pointer.inside) {
      return;
    }
    // Hit-test final positions and radii, starting with the last circle drawn.
    for (let i = circleList.length - 1; i >= 0; i--) {
      const c = circleList[i];
      const state = this.getState(states, c.id);
      if (state && state.alpha > 15 &&
          dist(pointer.x, pointer.y, state.x, state.y) <= state.radius) {
        this.startGlow(c.id);
        return;
      }
    }

    // Empty space creates temporary feedback without changing the composition.
    if (this.clickRipples.length < this.maxRipples) {
      this.clickRipples.push({
        x: pointer.x,
        y: pointer.y,
        age: 0,
        radius: this.fieldRadius * min(width, height),
        attractMode: this.attractMode
      });
    }
  }

  startGlow(id) {
    for (let glow of this.glows) {
      if (glow.id === id) {
        glow.life = 1;
        return;
      }
    }
    this.glows.push({ id: id, life: 1 });
  }

  handleMouseReleased() {
    this.pointer.pressed = false;
  }

  handleKeyPressed(pressedKey, pressedCode) {
    if (pressedKey === " ") {
      this.attractMode = !this.attractMode;
    }
    if (pressedCode === UP_ARROW) {
      this.strength = constrain(this.strength + 0.02, 0.02, 0.2);
    }
    if (pressedCode === DOWN_ARROW) {
      this.strength = constrain(this.strength - 0.02, 0.02, 0.2);
    }
    if (pressedCode === RIGHT_ARROW) {
      this.fieldRadius = constrain(this.fieldRadius + 0.05, 0.1, 0.5);
    }
    if (pressedCode === LEFT_ARROW) {
      this.fieldRadius = constrain(this.fieldRadius - 0.05, 0.1, 0.5);
    }
  }

  drawField(pointer, now) {
    if (!pointer.inside) {
      return;
    }
    const reach = this.fieldRadius * min(width, height);
    let progress = (now % 1000) / 1000;
    if (this.attractMode) {
      progress = 1 - progress;
    }
    noFill();
    strokeWeight(1);
    for (let i = 0; i < 3; i++) {
      const ringProgress = (progress + i / 3) % 1;
      if (this.attractMode) {
        stroke(170, 150, 255, 70 * (1 - ringProgress));
      } else {
        stroke(255, 170, 120, 70 * (1 - ringProgress));
      }
      circle(pointer.x, pointer.y, reach * 2 * ringProgress);
    }
    noStroke();
    fill(255, 160);
    circle(pointer.x, pointer.y, 8);
  }

  drawClickRipples() {
    noFill();
    strokeWeight(1.5);
    for (let ripple of this.clickRipples) {
      const progress = constrain(ripple.age / this.rippleDuration, 0, 1);
      const radius = 8 + progress * ripple.radius;
      const alpha = (1 - progress) * 180;
      // Keep each ripple at its click position and preserve its original mode.
      if (ripple.attractMode) {
        stroke(170, 150, 255, alpha);
      } else {
        stroke(255, 170, 120, alpha);
      }
      circle(ripple.x, ripple.y, radius * 2);
      circle(ripple.x, ripple.y, radius * 1.4);
    }
  }

  drawCursor(pointer, now) {
    push();
    colorMode(RGB, 255, 255, 255, 255);
    this.drawField(pointer, now);
    this.drawClickRipples();
    // Glow follows the final render state and fades with the Time mechanic.
    for (let glow of this.glows) {
      const state = this.getState(renderStates, glow.id);
      if (glow.life > 0 && state) {
        noFill();
        strokeWeight(2);
        stroke(255, 235, 180, state.alpha * glow.life);
        circle(state.x, state.y, state.radius * 2 + 10);
      }
    }
    let label = "Attract";
    if (!this.attractMode) {
      label = "Repel";
    }
    noStroke();
    fill(200, 205, 220);
    textSize(12);
    text(label + " | Space: switch | Arrows: strength/range | Hold: stronger | Click planet: glow | Empty space: ripple",
         16, height - 14);
    pop();
  }
}
