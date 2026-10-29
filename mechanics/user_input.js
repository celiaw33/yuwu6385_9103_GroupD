class InputController {
  constructor() {
    this.mode = "attract";
    this.fieldRadius = 90;
    this.strength = 55;
    this.returnSpeed = 6;
    this.maxCircles = 60; 

    this.offsets = {};  
    this.pointer = { x: 0, y: 0, inside: false, pressed: false };
    this.selectedId = "";
    this.glowTime = 0;
  }

  update(dt, pointer) {
    this.pointer = pointer;
    this.glowTime = Math.max(0, this.glowTime - dt);
  }

  getOffset(c, dt) {
    if (!this.offsets[c.id]) {
      this.offsets[c.id] = { x: 0, y: 0 };
    }
    const offset = this.offsets[c.id];
    let targetX = 0;
    let targetY = 0;

    if (this.pointer.inside) {
      const dx = this.pointer.x - c.baseX;
      const dy = this.pointer.y - c.baseY;
      const distance = dist(this.pointer.x, this.pointer.y, c.baseX, c.baseY);

      // distance > 0 
      if (distance > 0 && distance < this.fieldRadius) {
        const closeness = 1 - distance / this.fieldRadius;
        // Heavy celestial bodies are less affected by gravity.
        const weight = constrain(30 / c.baseRadius, 0.1, 1);
        let force = this.strength * closeness * weight;
        if (this.pointer.pressed) {
          force = force * 1.8;
        }
        if (this.mode === "repel") {
          force = -force;
        }
        targetX = dx / distance * force;
        targetY = dy / distance * force;
      }
    }

    // No gravity: return to original place.
    const easing = constrain(dt * this.returnSpeed, 0, 1);
    offset.x = lerp(offset.x, targetX, easing);
    offset.y = lerp(offset.y, targetY, easing);
    return offset;
  }

  getState(states, id) {
    if (typeof states.get === "function") {
      return states.get(id);
    }
    return states[id];
  }

  handleMousePressed(pointer, circleList, states, addCircle) {
    if (!pointer.inside) {
      return;
    }
    // Start from the last drawn circle and select the one that appears at the top visually.
    for (let i = circleList.length - 1; i >= 0; i--) {
      const c = circleList[i];
      const state = this.getState(states, c.id);
      if (state && state.alpha > 15) {
        const distance = dist(pointer.x, pointer.y, state.x, state.y);
        if (distance <= state.radius) {
          this.selectedId = c.id;
          this.glowTime = 1;
          return; // The circle has been selected. This time, no new addition will be made upon the click.
        }
      }
    }
    if (circleList.length < this.maxCircles) {
      // The "addCircle" function is initiated by the main program and will simultaneously register the new circle in the "Time" database.
      addCircle(pointer.x, pointer.y);
    }
  }

  handleMouseReleased() {
    this.pointer.pressed = false;
  }

  handleKeyPressed(pressedKey, pressedCode) {
    if (pressedKey === " ") {
      if (this.mode === "attract") {
        this.mode = "repel";
      } else {
        this.mode = "attract";
      }
    }
    if (pressedCode === 38) { // stronger
      this.strength = constrain(this.strength + 5, 5, 120);
    }
    if (pressedCode === 40) { // weaker
      this.strength = constrain(this.strength - 5, 5, 120);
    }
    if (pressedCode === 37) { // smaller
      this.fieldRadius = constrain(this.fieldRadius - 10, 40, 350);
    }
    if (pressedCode === 39) { // larger
      this.fieldRadius = constrain(this.fieldRadius + 10, 40, 350);
    }
  }

  drawCursor(pointer, now) {
    push();
    colorMode(RGB, 255, 255, 255, 255);
    let fieldColour = [130, 200, 255];
    let modeLabel = "Attract";
    if (this.mode === "repel") {
      fieldColour = [245, 155, 180];
      modeLabel = "Repel";
    }

    if (pointer.inside) {
      noFill();
      strokeWeight(1);
      stroke(fieldColour[0], fieldColour[1], fieldColour[2], 65);
      circle(pointer.x, pointer.y, this.fieldRadius * 2);
      const pulse = 1 + Math.sin(now * 0.003) * 0.04;
      circle(pointer.x, pointer.y, this.fieldRadius * 2 * pulse);
    }

    // renderStates represents the final display result updated by the main program in each frame.
    // Here, read it. Let the click circle follow the Audio scaling and Perlin drift.
    if (this.glowTime > 0) {
      const state = this.getState(renderStates, this.selectedId);
      if (state) {
        noFill();
        strokeWeight(2);
        stroke(255, 235, 180, state.alpha * this.glowTime);
        circle(state.x, state.y, state.radius * 2 + 10);
      }
    }

    noStroke();
    fill(200, 205, 220);
    textSize(12);
    text(modeLabel + " | Space: switch | Arrows: strength/range | Hold: stronger | Click: glow/plant",
         16, height - 14);
    pop();
  }
}
