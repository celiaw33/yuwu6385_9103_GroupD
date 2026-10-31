class PerlinController {
  constructor() {
     this.activeSeed = floor(random(100000));

     // AI-assisted: group the animation settings for parameter testing.
     this.driftAmount = 3;
     this.driftSpeed = 0.00015;
     this.edgeAmount = 3;
     this.edgeSpeed = 0.00048;
     this.lightAmount = 12;
     this.textureOpacity = 0.025;
  }

  makeComposition() {
    randomSeed(this.activeSeed);
    noiseSeed(this.activeSeed);
    let result = [];

    result.push(this.makeLayeredCircle("main", 320, 300, [
      { x: 0, y: 0, radius: 218, colour: [195, 250, 237], alpha: 194, edge: 10, clouds: false },
      { x: 0, y: 0, radius: 205, colour: [26, 72, 199], alpha: 242, edge: 7, clouds: false },
      { x: -45, y: -35, radius: 164, colour: [5, 5, 10], alpha: 255, edge: 2, clouds: false }
    ]));
    result.push(this.makeLayeredCircle("green", 560, 196, [
      { x: 0, y: 0, radius: 76, colour: [29, 87, 75], alpha: 209, edge: 5, clouds: false },
      { x: 0, y: 0, radius: 18, colour: [9, 10, 13], alpha: 255, edge: 2, clouds: false }
    ]));
    result.push(this.makeLayeredCircle("moon", 790, 500, [
      { x: 0, y: 0, radius: 73, colour: [199, 188, 235], alpha: 219, edge: 4, clouds: true },
      { x: -27, y: -4, radius: 19, colour: [130, 226, 237], alpha: 224, edge: 2, clouds: false },
      { x: 10, y: -31, radius: 10, colour: [245, 39, 73], alpha: 242, edge: 1, clouds: false },
      { x: 28, y: -29, radius: 8, colour: [12, 13, 15], alpha: 255, edge: 1, clouds: false }
    ]));
    result.push(this.makeLayeredCircle("small-ring", 82, 410, [
      { x: 0, y: 0, radius: 52, colour: [184, 155, 242], alpha: 199, edge: 3, clouds: false },
      { x: 0, y: 0, radius: 45, colour: [247, 205, 247], alpha: 171, edge: 2, clouds: false },
      { x: 9, y: -10, radius: 17, colour: [8, 8, 10], alpha: 255, edge: 1, clouds: false }
    ]));

    const layout = [
      { x: 75, y: 92, radius: 42, colour: [250, 130, 198], alpha: 214 },
      { x: 704, y: 84, radius: 34, colour: [255, 236, 140], alpha: 245 },
      { x: 800, y: 120, radius: 19, colour: [250, 166, 20], alpha: 245 },
      { x: 862, y: 54, radius: 15, colour: [250, 42, 77], alpha: 245 },
      { x: 394, y: 110, radius: 48, colour: [215, 145, 250], alpha: 158 },
      { x: 474, y: 274, radius: 34, colour: [208, 247, 148], alpha: 209 },
      { x: 398, y: 356, radius: 54, colour: [128, 99, 41], alpha: 184 },
      { x: 354, y: 366, radius: 35, colour: [245, 200, 64], alpha: 214 },
      { x: 302, y: 274, radius: 15, colour: [36, 98, 242], alpha: 235 },
      { x: 172, y: 402, radius: 35, colour: [247, 199, 40], alpha: 230 },
      { x: 219, y: 434, radius: 42, colour: [222, 104, 69], alpha: 214 },
      { x: 142, y: 458, radius: 31, colour: [255, 210, 28], alpha: 240 },
      { x: 178, y: 469, radius: 28, colour: [242, 61, 103], alpha: 224 },
      { x: 210, y: 471, radius: 30, colour: [107, 62, 40], alpha: 209 },
      { x: 335, y: 428, radius: 47, colour: [149, 200, 230], alpha: 184 },
      { x: 468, y: 456, radius: 53, colour: [77, 196, 232], alpha: 204 },
      { x: 72, y: 498, radius: 48, colour: [213, 187, 250], alpha: 224 },
      { x: 717, y: 530, radius: 18, colour: [242, 199, 68], alpha: 245 },
      { x: 795, y: 567, radius: 12, colour: [250, 219, 20], alpha: 245 },
      { x: 836, y: 597, radius: 15, colour: [240, 36, 87], alpha: 242 },
      { x: 904, y: 620, radius: 13, colour: [49, 151, 224], alpha: 230 }
    ];
    for (let i = 0; i < layout.length; i++) {
      const item = layout[i];
      result.push({
        id: "base-" + i,
        baseX: item.x + random(-10, 10),
        baseY: item.y + random(-10, 10),
        baseRadius: item.radius * random(0.9, 1.1),
        baseColour: [
          constrain(item.colour[0] + random(-10, 10), 0, 255),
          constrain(item.colour[1] + random(-10, 10), 0, 255),
          constrain(item.colour[2] + random(-10, 10), 0, 255)
        ],
        baseAlpha: constrain(item.alpha + random(-18, 13), 0, 255),
        edgeSeed: random(1000),
        type: "disc"
      });
    }
    result.push(this.makeLayeredCircle("accent-left", 130, 304, [
      { x: 0, y: 0, radius: 10, colour: [250, 214, 12], alpha: 255, edge: 1, clouds: false },
      { x: 1, y: 0, radius: 6, colour: [10, 10, 13], alpha: 255, edge: 1, clouds: false }
    ]));
    result.push(this.makeLayeredCircle("accent-right", 849, 332, [
      { x: 0, y: 0, radius: 18, colour: [59, 191, 235], alpha: 230, edge: 2, clouds: false },
      { x: 0, y: 0, radius: 12, colour: [29, 94, 245], alpha: 255, edge: 1, clouds: false }
    ]));
    result.push(this.makeLayeredCircle("accent-gold", 889, 451, [
      { x: 0, y: 0, radius: 12, colour: [235, 192, 66], alpha: 235, edge: 1, clouds: false }
    ]));
    return result;
  }

  makeLayeredCircle(id, x, y, layers) {
    return {
      id: id,
      baseX: x,
      baseY: y,
      baseRadius: layers[0].radius,
      baseColour: layers[0].colour,
      baseAlpha: 255,
      edgeSeed: random(1000),
      type: "layered",
      layers: layers
    };
  }

  // AI-assisted: map smooth noise values to horizontal and vertical offsets.
  getDrift(c, now) {
  // Keep compound shapes fixed to anchor the composition.
  if (c.type === "layered") {
    return { x: 0, y: 0 };
  }

  const time = now * this.driftSpeed;

  return {
    x: (noise(c.edgeSeed, 201, time) * 2 - 1) * this.driftAmount,
    y: (noise(c.edgeSeed, 401, time) * 2 - 1) * this.driftAmount
  };
}

  // AI-assisted: use smooth noise to vary the RGB brightness.
  getLight(c, now) {
  // Preserve the dark centres of compound shapes.
  if (c.type === "layered") {
    return 0;
  }

  const time = now * this.driftSpeed;
  return (noise(c.edgeSeed, 51, time) * 2 - 1) * this.lightAmount;
}

  drawOrganicDisc(c, state, now) {
    push();
    colorMode(RGB, 255, 255, 255, 255);
    if (c.type === "layered") {
      const sizeScale = state.radius / c.baseRadius;
      // Apply Time's RGB change to the whole compound circle.
      const changeR = red(state.colour) - c.baseColour[0];
      const changeG = green(state.colour) - c.baseColour[1];
      const changeB = blue(state.colour) - c.baseColour[2];
      for (let i = 0; i < c.layers.length; i++) {
        const layer = c.layers[i];
        const layerState = {
          x: state.x + layer.x * sizeScale,
          y: state.y + layer.y * sizeScale,
          radius: layer.radius * sizeScale,
          colour: color(
            constrain(layer.colour[0] + changeR, 0, 255),
            constrain(layer.colour[1] + changeG, 0, 255),
            constrain(layer.colour[2] + changeB, 0, 255)
          ),
          alpha: state.alpha * layer.alpha / 255
        };
        this.drawDisc(layerState, c.edgeSeed + i * 17, now,
                      layer.edge * sizeScale);
        if (layer.clouds) {
          this.drawClouds(layerState, c.edgeSeed + i * 17, now);
        }
      }
    } else {
        // AI-assisted: scale the edge variation with the circle's displayed size.
        const sizeScale = state.radius / c.baseRadius;
        const edge = this.edgeAmount * sizeScale;

        this.drawDisc(state, c.edgeSeed, now, edge);
    }
    pop();
  }

// AI-assisted: build an organic circle by sampling noise around its edge.
// References:
// https://p5js.org/reference/p5/beginShape/
// https://p5js.org/reference/p5/vertex/
// https://p5js.org/reference/p5/endShape/
  drawDisc(state, seed, now, edgeAmount) {
    noStroke();
    fill(
      red(state.colour), green(state.colour), blue(state.colour), state.alpha
    );
    const time = now * this.edgeSpeed;

    beginShape();

    // Math.sin/cos explicitly use radians, independent of other modules.
    for (let angle = 0; angle < Math.PI * 2; angle += 0.045) {
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle)

      const noiseValue = noise(
        cosAngle * 1.15 + seed,
        sinAngle * 1.15 + seed,
        time
      );
  
      const wobble = (noiseValue * 2 - 1) * edgeAmount;
      const radius = state.radius + wobble;

      vertex(
        state.x + cosAngle * radius,
        state.y + sinAngle * radius);
    }
    endShape(CLOSE);
  }

  drawPigmentClouds(c, state, now) {
    // Compound shapes already shade their layers in the correct stacking order.
    if (c.type !== "layered") {
      push();
      colorMode(RGB, 255, 255, 255, 255);
      this.drawClouds(state, c.edgeSeed, now);
      pop();
    }
  }

// AI-assisted: overlap translucent patches to suggest pigment variation.
// Reference: https://p5js.org/reference/p5/ellipse/
  drawClouds(state, seed, now) {
    const time = now * this.driftSpeed * 0.7;
    noStroke();

    for (let layer = 0; layer < 3; layer++) {
      const angle = noise(seed + layer * 17, 80, time) * Math.PI * 4;
      const distance = noise(seed + layer * 31, 170, time) * state.radius * 0.34;
      const patchRadius = (0.22 + noise(seed + layer * 47, 250, time) * 0.26) * state.radius;

      const x = state.x + Math.cos(angle) * distance;
      const y = state.y + Math.sin(angle) * distance;

      let change = 30;

      if (layer % 3 === 2) {
        change = -40;
      }
      fill(
        constrain(red(state.colour) + change, 0, 255),
        constrain(green(state.colour) + change, 0, 255),
        constrain(blue(state.colour) + change, 0, 255),
        state.alpha * this.textureOpacity
      );
      for (let softLayer = 3; softLayer >= 1; softLayer--) {
        const softScale = 1 + softLayer * 0.1;
         ellipse(
          x,
          y,
          patchRadius * 2 * softScale,
          patchRadius * 1.35 * softScale
         );
      }
    }
  }
}


// Reference: https://p5js.org/reference/p5/noise/
