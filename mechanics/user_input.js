// =============================================================================
// user_input.js — User Input mechanic (Bessie, bshe0368)
// -----------------------------------------------------------------------------
// The viewer's mouse becomes a gravity source inside Kandinsky's universe.
//  - Move the mouse: nearby circles are pulled in (attract) or pushed away (repel).
//    Big circles are "heavy" and move less, small circles fly — Kandinsky's idea
//    of mass and position made physical.
//  - Hold the mouse: a stronger "black hole" pull.
//  - Click a planet: it glows.
//  - Click empty space: a gravity wave ripples outward, and sketch.js plants a
//    new star at that point (the star is then born and fades with the Time mechanic).
//  - Circles pushed into each other by gravity mix their colours and spark.
//  - SPACE switches attract / repel; arrow keys change strength (↑↓) and range (←→).
//
// This file only ever returns a position OFFSET for each circle. It never changes
// a circle's size or colour, so it cannot clash with Audio (size) or Time (colour/life).
//
// AI acknowledgement: the original gravity / easing / keyboard logic was written by
// Bessie in her Week 9 pilot (with help from Claude, Anthropic). The gravity-wave
// ripple code was added during group integration. Claude (Anthropic) also
// helped to clean up this file, add comments, and add the click "event" that lets
// sketch.js plant a new star, the star-birth flash, and the collision colour
// mixing with sparks. All changes were reviewed and tested by Bessie.
// =============================================================================

class InputController {
  constructor() {
    this.attractMode = true; // true = attract, false = repel (SPACE toggles)
    this.fieldRadius = 0.2;  // Reach of the hover gravity, as a fraction of the shorter canvas side.
    this.strength = 0.08;    // Gravity strength as a fraction of the shorter canvas side (↑↓ keys).
    this.easing = 0.08;      // Smaller values make following and returning slower.
    this.holdBoost = 2.2;    // Holding the mouse multiplies the pull ("black hole").

    // Gravity-wave settings (click on empty space)
    this.rippleDuration = 1.8; // Seconds before a click ripple disappears.
    this.rippleReach = 3;      // Waves travel three times the hover-field radius.
    this.waveWidth = 25;       // Soft band around the visible wavefront, in pixels.
    this.waveBoost = 1.8;      // Scale the captured gravity strength for each wave.
    this.maxWaveOffset = 80;   // Limit the combined displacement from many waves.
    this.maxRipples = 20;      // Limit overlapping click feedback.

    this.pointer = { x: 0, y: 0, inside: false, pressed: false };
    this.offsets = {};      // id -> { x, y } offset for each circle; baseX/baseY are never changed.
    this.clickRipples = []; // Temporary gravity waves.
    this.glows = [];        // Planets that were clicked and are glowing.
    this.starFlares = [];   // Bright flashes where a new star is born.

    // Collisions: when gravity pushes two circles into each other, their colours mix.
    this.contacts = {};       // "idA|idB" -> { mix: 0–1, touching: true/false }
    this.restingPairs = {};   // how deeply each pair already overlaps in the painting
    this.restingFor = null;   // the circles array restingPairs was built for
    this.mixedColours = {};   // id -> colour after mixing, for this frame
    this.mixAmounts = {};     // id -> how strongly it is mixing (0–1)
    this.sparks = [];         // bursts of light where two circles first touch
    this.flareDuration = 1.2; // Seconds a star-birth flash lasts.
  }

  // Called once per frame by sketch.js. dt = seconds since the last frame.
  update(dt, pointer) {
    this.pointer = pointer;
    this.lastDt = dt;

    // Fade glows, and drop the ones that have finished so the array does not grow forever.
    let activeGlows = [];
    for (let glow of this.glows) {
      glow.life = Math.max(0, glow.life - dt);
      if (glow.life > 0) {
        activeGlows.push(glow);
      }
    }
    this.glows = activeGlows;

    // Age the gravity waves and keep only the ones still travelling.
    let remainingRipples = [];
    for (let ripple of this.clickRipples) {
      ripple.age += dt;
      if (ripple.age < this.rippleDuration) {
        remainingRipples.push(ripple);
      }
    }
    this.clickRipples = remainingRipples;

    // Age the star-birth flashes and keep only the ones still visible.
    let remainingFlares = [];
    for (let flare of this.starFlares) {
      flare.age += dt;
      if (flare.age < this.flareDuration) {
        remainingFlares.push(flare);
      }
    }
    this.starFlares = remainingFlares;
  }

  // sketch.js calls getOffset() for every circle, every frame.
  // drift = this circle's Perlin drift, so gravity is measured from where the circle really is.
  getOffset(c, dt, drift) {
    return this.applyGravity(c, dt, drift);
  }

  applyGravity(c, dt, drift) {
    if (!this.offsets[c.id]) {
      this.offsets[c.id] = { x: 0, y: 0 };
    }
    const offset = this.offsets[c.id];
    const minDimension = min(width, height);

    // Where the circle is before gravity (base position + Perlin drift).
    const circleX = c.baseX + drift.x;
    const circleY = c.baseY + drift.y;
    const d = dist(this.pointer.x, this.pointer.y, circleX, circleY);
    const reach = this.fieldRadius * minDimension;

    // Bigger circles are heavier: weight is 1 for small circles, down to 0.1 for the largest.
    const sizeRatio = c.baseRadius / minDimension;
    const weight = constrain(0.02 / sizeRatio, 0.1, 1);

    // By default each circle wants to go home (offset 0).
    let targetX = 0;
    let targetY = 0;

    if (this.pointer.inside && d < reach && d > 1) {
      const closeness = 1 - d / reach; // 1 at the mouse, 0 at the edge of the field
      let force = this.strength * minDimension * closeness * weight;
      if (this.pointer.pressed) {
        force = force * this.holdBoost; // "Black hole": holding the mouse pulls harder.
      }
      // Direction from the circle to the mouse, divided by d so its length is 1.
      const directionX = (this.pointer.x - circleX) / d;
      const directionY = (this.pointer.y - circleY) / d;

      if (this.attractMode) {
        force = min(force, d * 0.8); // Stop circles jumping past the mouse.
        targetX = directionX * force;
        targetY = directionY * force;
      } else {
        targetX = -directionX * force; // Minus = opposite direction = push away.
        targetY = -directionY * force;
      }
    }

    // Add the temporary pull from any gravity waves passing through this circle.
    const wave = this.getRippleOffset(circleX + offset.x, circleY + offset.y,
                                      c.baseRadius, weight);
    targetX += wave.x;
    targetY += wave.y;

    // Easing: move a small part of the way to the target each frame, so circles glide.
    // deltaTime (dt) keeps the speed the same on 30 fps and 120 fps screens.
    // lerp(a, b, t) = a + (b - a) * t  (p5 reference: https://p5js.org/reference/p5/lerp/)
    const step = constrain(this.easing * dt * 60, 0, 1);
    offset.x = lerp(offset.x, targetX, step);
    offset.y = lerp(offset.y, targetY, step);
    return offset;
  }

  // The wavefront grows from 8 px to its full radius over rippleDuration seconds.
  getRippleRadius(ripple) {
    const progress = constrain(ripple.age / this.rippleDuration, 0, 1);
    return 8 + progress * ripple.radius;
  }

  // A circle is only pushed or pulled while the wavefront passes over it.
  getRippleOffset(x, y, planetRadius, weight) {
    let waveX = 0;
    let waveY = 0;
    for (let ripple of this.clickRipples) {
      const distance = dist(x, y, ripple.x, ripple.y);
      const radius = this.getRippleRadius(ripple);
      // Include the planet's body so a wave can reach its edge before its centre.
      const bandWidth = this.waveWidth + planetRadius;
      // Math.abs() gives the distance to the wavefront whether the circle is inside or outside it.
      const gap = Math.abs(distance - radius);
      if (distance > 1 && gap < bandWidth) {
        const closeness = 1 - gap / bandWidth;
        const fade = 1 - ripple.age / this.rippleDuration;
        let force = ripple.strength * closeness * fade * weight;
        if (ripple.attractMode) {
          force = min(force, distance * 0.8);
        } else {
          force = -force;
        }
        waveX += (ripple.x - x) / distance * force;
        waveY += (ripple.y - y) / distance * force;
      }
    }
    // Several waves can overlap, but their combined movement stays within maxWaveOffset.
    const total = dist(0, 0, waveX, waveY);
    if (total > this.maxWaveOffset) {
      waveX = waveX / total * this.maxWaveOffset;
      waveY = waveY / total * this.maxWaveOffset;
    }
    return { x: waveX, y: waveY };
  }

  // ---- Collisions -----------------------------------------------------------
  // Kandinsky's circles overlap like coloured glass and make new colours where
  // they meet. Here, when gravity pushes two circles together, both colours mix
  // and brighten — like two lights meeting — and a spark bursts at the contact
  // point. When they drift apart, each slowly returns to its own colour.

  // Remember how much each pair already overlaps in the painting, so only circles
  // that gravity pushes DEEPER into each other react (the painting at rest stays calm).
  findRestingPairs(circleList) {
    this.restingPairs = {};
    for (let i = 0; i < circleList.length; i++) {
      for (let j = i + 1; j < circleList.length; j++) {
        const a = circleList[i];
        const b = circleList[j];
        const depth = a.baseRadius + b.baseRadius - dist(a.baseX, a.baseY, b.baseX, b.baseY);
        this.restingPairs[this.pairKey(a.id, b.id)] = Math.max(0, depth);
      }
    }
    this.restingFor = circleList;
  }

  pairKey(idA, idB) {
    if (idA < idB) {
      return idA + "|" + idB;
    }
    return idB + "|" + idA;
  }

  // Called every frame by sketch.js after all final positions (states) are known.
  updateCollisions(circleList, states, dt) {
    if (this.restingFor !== circleList) {
      this.findRestingPairs(circleList); // a new universe: new resting pairs
    }
    // Only single-colour discs mix; layered bodies (the crescent, the moon) stay themselves.
    let discs = [];
    for (let c of circleList) {
      const state = states[c.id];
      if (c.type === "disc" && state && state.alpha > 40) {
        discs.push(c);
      }
    }

    const step = constrain(dt * 4, 0, 1); // how fast colours mix and un-mix
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        const a = states[discs[i].id];
        const b = states[discs[j].id];
        const key = this.pairKey(discs[i].id, discs[j].id);
        const d = dist(a.x, a.y, b.x, b.y);
        // Overlap depth uses the base radius, so music pulses alone do not trigger it.
        const depth = discs[i].baseRadius + discs[j].baseRadius - d;
        const restDepth = this.restingPairs[key] || 0;
        const needed = Math.max(6, 0.2 * Math.min(discs[i].baseRadius, discs[j].baseRadius));
        const touching = depth > restDepth + needed;
        let contact = this.contacts[key];
        if (!contact) {
          if (!touching) {
            continue;
          }
          contact = { idA: discs[i].id, idB: discs[j].id, mix: 0, touching: false };
          this.contacts[key] = contact;
        }
        if (touching && !contact.touching) {
          // First touch: a spark at the contact point, between the two edges.
          const share = a.radius / (a.radius + b.radius);
          this.addSpark(lerp(a.x, b.x, share), lerp(a.y, b.y, share), a.colour, b.colour);
        }
        contact.touching = touching;
        let target = 0;
        if (touching) {
          target = 1;
        }
        contact.mix = lerp(contact.mix, target, step);
      }
    }

    // Work out each circle's mixed colour, and forget contacts that have faded out.
    this.mixedColours = {};
    this.mixAmounts = {};
    for (let key in this.contacts) {
      const contact = this.contacts[key];
      const a = states[contact.idA];
      const b = states[contact.idB];
      if (!a || !b || (!contact.touching && contact.mix < 0.02)) {
        delete this.contacts[key];
        continue;
      }
      // The shared colour mixes like LIGHT ("screen" blending): each channel becomes
      // 255 − (255 − a)(255 − b) / 255, so red + blue → glowing pink, yellow + blue → near white.
      const glow = color(
        255 - (255 - red(a.colour)) * (255 - red(b.colour)) / 255,
        255 - (255 - green(a.colour)) * (255 - green(b.colour)) / 255,
        255 - (255 - blue(a.colour)) * (255 - blue(b.colour)) / 255
      );
      const fromA = this.mixedColours[contact.idA] || a.colour;
      const fromB = this.mixedColours[contact.idB] || b.colour;
      this.mixedColours[contact.idA] = lerpColor(fromA, glow, contact.mix);
      this.mixedColours[contact.idB] = lerpColor(fromB, glow, contact.mix);
      // How strongly each circle is mixing, so sketch.js can make it glow.
      this.mixAmounts[contact.idA] = Math.max(this.mixAmounts[contact.idA] || 0, contact.mix);
      this.mixAmounts[contact.idB] = Math.max(this.mixAmounts[contact.idB] || 0, contact.mix);
    }
  }

  // sketch.js asks for each circle's colour after mixing (or its own colour).
  getMixedColour(id, ownColour) {
    if (this.mixedColours[id]) {
      return this.mixedColours[id];
    }
    return ownColour;
  }

  // 0 = not mixing, 1 = fully mixed (used to add a glow).
  getMixAmount(id) {
    return this.mixAmounts[id] || 0;
  }

  // Circles that are mixing shine with a soft glow in their new colour.
  drawMixGlow(states) {
    noFill();
    for (let id in this.mixAmounts) {
      const state = states[id];
      const amount = this.mixAmounts[id];
      if (state && amount > 0.02) {
        const c = this.mixedColours[id];
        for (let ring = 1; ring <= 3; ring++) {
          strokeWeight(ring * 4);
          stroke(red(c), green(c), blue(c), 70 * amount / ring);
          circle(state.x, state.y, state.radius * 2 + ring * 6);
        }
      }
    }
  }

  addSpark(x, y, colourA, colourB) {
    if (this.sparks.length >= 30) {
      return;
    }
    this.sparks.push({ x: x, y: y, age: 0, colourA: colourA, colourB: colourB,
                       turn: random(TWO_PI) });
  }

  // A ring and ten little rays in the two circles' colours, flying outwards.
  drawSparks(dt) {
    const life = 0.9;
    let remaining = [];
    for (let spark of this.sparks) {
      spark.age += dt;
      if (spark.age >= life) {
        continue;
      }
      remaining.push(spark);
      const progress = spark.age / life;
      const fade = 1 - progress;
      noFill();
      noStroke();
      fill(255, 250, 235, 120 * fade * fade);       // bright flash at the contact point
      circle(spark.x, spark.y, 30 + progress * 40);
      noFill();
      strokeWeight(2.5);
      stroke(255, 250, 235, 230 * fade);
      circle(spark.x, spark.y, 10 + progress * 130);
      for (let i = 0; i < 12; i++) {
        const angle = spark.turn + i * TWO_PI / 12;
        const inner = 8 + progress * 55;
        const outer = inner + 18 * fade + 6;
        let c = spark.colourA;
        if (i % 2 === 1) {
          c = spark.colourB;
        }
        stroke(red(c), green(c), blue(c), 255 * fade);
        line(spark.x + Math.cos(angle) * inner, spark.y + Math.sin(angle) * inner,
             spark.x + Math.cos(angle) * outer, spark.y + Math.sin(angle) * outer);
      }
    }
    this.sparks = remaining;
  }

  // Called by sketch.js from mousePressed().
  // Returns what happened, so sketch.js can connect the click to other mechanics:
  //   "glow" — a planet was clicked
  //   "wave" — empty space was clicked and a gravity wave started (sketch.js plants a star)
  //   null   — nothing happened
  handleMousePressed(pointer, circleList, states) {
    if (!pointer.inside) {
      return null;
    }
    // Hit-test the final drawn positions, starting with the circle drawn last (on top).
    for (let i = circleList.length - 1; i >= 0; i--) {
      const c = circleList[i];
      const state = states[c.id];
      if (state && state.alpha > 15 &&
          dist(pointer.x, pointer.y, state.x, state.y) <= state.radius) {
        this.startGlow(c.id);
        return "glow";
      }
    }

    if (this.clickRipples.length >= this.maxRipples) {
      return null;
    }
    // Capture the mode and strength now, so a later key press does not change this wave.
    this.clickRipples.push({
      x: pointer.x,
      y: pointer.y,
      age: 0,
      radius: this.fieldRadius * min(width, height) * this.rippleReach,
      strength: this.strength * min(width, height) * this.waveBoost,
      attractMode: this.attractMode
    });
    // A new star will be born here: start its birth flash.
    this.starFlares.push({ x: pointer.x, y: pointer.y, age: 0 });
    return "wave";
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

  // Called by sketch.js from keyPressed(). Same structure as the arrow-key tutorial.
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

  // Rings around the cursor show how far the gravity reaches and which way it pulls:
  // they move inward when attracting and outward when repelling.
  drawField(pointer, now) {
    if (!pointer.inside) {
      return;
    }
    const reach = this.fieldRadius * min(width, height);
    // While the mouse is held, rings loop faster and the core grows ("black hole").
    let loopTime = 1000;
    if (pointer.pressed) {
      loopTime = 450;
    }
    let progress = (now % loopTime) / loopTime; // 0 → 1, then back to 0
    if (this.attractMode) {
      progress = 1 - progress;
    }
    noFill();
    strokeWeight(1);
    for (let i = 0; i < 3; i++) {
      const ringProgress = (progress + i / 3) % 1;
      let ringAlpha = 70 * (1 - ringProgress);
      if (pointer.pressed) {
        ringAlpha = ringAlpha * 1.8;
      }
      if (this.attractMode) {
        stroke(170, 150, 255, ringAlpha);
      } else {
        stroke(255, 170, 120, ringAlpha);
      }
      circle(pointer.x, pointer.y, reach * 2 * ringProgress);
    }
    noStroke();
    if (pointer.pressed) {
      fill(5, 5, 10, 230);       // dark core
      circle(pointer.x, pointer.y, 18);
      noFill();
      stroke(255, 200);          // bright rim
      circle(pointer.x, pointer.y, 20);
    } else {
      fill(255, 160);
      circle(pointer.x, pointer.y, 8);
    }
  }

  // Star-birth flash: a soft glow that blooms and fades, plus a four-pointed
  // sparkle that turns slowly, like a star lighting up. Uses push(), translate()
  // and rotate() from the transformations tutorial.
  drawStarFlares() {
    for (let flare of this.starFlares) {
      const progress = flare.age / this.flareDuration; // 0 → 1
      const fade = 1 - progress;
      const glowSize = 20 + 70 * Math.sin(progress * Math.PI); // grows, then shrinks

      noStroke();
      for (let i = 3; i >= 1; i--) {
        fill(255, 240, 200, 40 * fade);
        circle(flare.x, flare.y, glowSize * i * 0.6);
      }
      fill(255, 255, 255, 230 * fade);
      circle(flare.x, flare.y, 6 + 6 * fade);

      push();
      translate(flare.x, flare.y);
      rotate(progress * Math.PI / 2);
      stroke(255, 245, 220, 220 * fade);
      strokeWeight(2);
      const rayLength = glowSize * 0.9;
      line(-rayLength, 0, rayLength, 0);
      line(0, -rayLength, 0, rayLength);
      strokeWeight(1);
      const shortRay = rayLength * 0.45;
      line(-shortRay, -shortRay, shortRay, shortRay);
      line(-shortRay, shortRay, shortRay, -shortRay);
      pop();
    }
  }

  drawClickRipples() {
    noFill();
    strokeWeight(1.5);
    for (let ripple of this.clickRipples) {
      const progress = constrain(ripple.age / this.rippleDuration, 0, 1);
      const radius = this.getRippleRadius(ripple);
      const alpha = (1 - progress) * 180;
      // Each ripple keeps the colour of the mode it was created in.
      if (ripple.attractMode) {
        stroke(170, 150, 255, alpha);
      } else {
        stroke(255, 170, 120, alpha);
      }
      circle(ripple.x, ripple.y, radius * 2);
      circle(ripple.x, ripple.y, radius * 1.4);
    }
  }

  // Draws everything this mechanic shows on top of the painting.
  // states = sketch.js renderStates, so glows follow circles wherever they have moved.
  drawCursor(pointer, now, states) {
    push();
    colorMode(RGB, 255, 255, 255, 255);
    this.drawField(pointer, now);
    this.drawClickRipples();
    this.drawStarFlares();
    this.drawSparks(this.lastDt || 0.016);
    this.drawMixGlow(states);
    for (let glow of this.glows) {
      const state = states[glow.id];
      if (state) {
        noFill();
        strokeWeight(2);
        stroke(255, 235, 180, state.alpha * glow.life);
        circle(state.x, state.y, state.radius * 2 + 10);
      }
    }
    this.drawHelp();
    pop();
  }

  // One-line reminder of the controls along the bottom of the canvas.
  drawHelp() {
    let label = "Attract";
    if (!this.attractMode) {
      label = "Repel";
    }
    noStroke();
    fill(200, 205, 220, 170);
    textSize(12);
    textAlign(LEFT, BASELINE);
    text(label + "  ·  Space: attract/repel  ·  ↑↓ strength  ·  ←→ range  ·  Hold: black hole" +
         "  ·  Click planet: glow  ·  Click space: gravity wave + new star  ·  D: time panel",
         16, height - 14);
  }
}
