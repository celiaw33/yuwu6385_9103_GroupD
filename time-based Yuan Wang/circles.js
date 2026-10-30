function getArtboard() {
  let size = min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size: size };
}
class Circle {
  constructor(xRatio, yRatio, radiusRatio, rgb, opacity = 0.85) {
    this.xRatio = xRatio;
    this.yRatio = yRatio;
    this.baseRadiusRatio = radiusRatio;
    this.baseColor = color(rgb[0], rgb[1], rgb[2]);
    this.opacity = opacity;

    this.life = 0;
    this.sizeScale = 1;
    this.drift = createVector(0, 0);
    this.push = createVector(0, 0);
  }
  display() {
    if (this.life <= 0.01) return;

    let board = getArtboard();
    let x = board.x + this.xRatio * board.size + this.drift.x + this.push.x;
    let y = board.y + this.yRatio * board.size + this.drift.y + this.push.y;
    let radius = this.baseRadiusRatio * board.size * this.sizeScale * (0.6 + 0.4 * this.life);
    let alpha = 255 * this.opacity * this.life;

    let r = red(this.baseColor);
    let g = green(this.baseColor);
    let b = blue(this.baseColor);

    noStroke();
    let glow = board.size * 0.008;
    fill(r, g, b, alpha * 0.12);
    circle(x, y, (radius + glow * 2) * 2);
    fill(r, g, b, alpha * 0.2);
    circle(x, y, (radius + glow) * 2);
    fill(r, g, b, alpha);
    circle(x, y, radius * 2);
  }
}

function createCircles() {
  const IMG_W = 196, IMG_H = 200, IMG_SIZE = 198;

  const layout = [
    [83, 74, 47, [235, 231, 224], 0.8],
    [85, 75, 44, [14, 46, 177], 0.95],
    [76, 66, 29, [14, 10, 9], 1.0],
    [104, 42, 12, [150, 130, 235], 0.6],
    [105, 83, 8.5, [178, 227, 168], 0.85],
    [93, 89, 4, [40, 90, 220], 0.9],
    [113, 97, 13, [117, 94, 40], 0.65],
    [99, 101, 9, [205, 165, 40], 0.85],
    [120, 106, 5, [250, 200, 220], 0.9],
    [117, 110, 1.3, [10, 10, 10], 1.0],
    [112, 122, 11.5, [71, 183, 227], 0.85],
    [83, 120, 9.5, [150, 200, 214], 0.8],
    [79, 127, 1.3, [10, 10, 10], 1.0],

    [140, 62, 16, [45, 110, 100], 0.85],
    [140, 62, 4, [150, 210, 225], 0.9],
    [140, 62, 2.5, [10, 10, 10], 1.0],
    [142, 34, 7, [250, 228, 140], 0.9],
    [161, 45, 4, [247, 175, 15], 0.9],
    [173, 29, 3, [230, 51, 77], 0.9],

    [20, 19, 4, [241, 222, 62], 0.9],
    [24, 39, 8, [247, 148, 216], 0.85],

    [27, 110, 12.5, [60, 110, 160], 0.7],
    [27, 110, 11, [215, 205, 230], 0.9],
    [30, 107, 3, [9, 6, 5], 1.0],
    [45, 94, 2, [210, 190, 70], 0.9],
    [45, 94, 1.2, [20, 20, 20], 1.0],
    [49, 114, 7.5, [226, 179, 45], 0.85],
    [59, 122, 6.5, [214, 89, 51], 0.8],
    [39, 130, 8, [247, 234, 88], 0.85],
    [46, 134, 5, [206, 40, 70], 0.8],
    [51, 133, 5.5, [235, 122, 166], 0.75],
    [57, 133, 5, [157, 77, 41], 0.75],
    [60, 113, 1.4, [180, 70, 110], 0.9],
    [67, 112, 1, [200, 210, 255], 0.9],

    [162, 140, 18, [212, 211, 227], 0.9],
    [153, 137, 5, [147, 219, 232], 0.8],
    [164, 126, 1.8, [201, 25, 49], 1.0],
    [168, 127, 1.2, [10, 10, 10], 1.0],
    [141, 133, 5.5, [211, 178, 129], 0.85],
    [182, 141, 2.5, [209, 181, 77], 0.9],
    [175, 102, 4.5, [120, 170, 225], 0.7],
    [175, 102, 3, [14, 62, 213], 1.0],

    [98, 151, 4, [249, 185, 32], 0.9],
    [28, 154, 2.5, [239, 167, 197], 0.9],
    [38, 162, 5, [39, 159, 217], 0.9],
    [25, 169, 2.5, [200, 190, 60], 0.8],
    [25, 169, 1.5, [27, 27, 36], 1.0],
    [156, 163, 2.5, [236, 228, 55], 0.9],
    [151, 174, 3.5, [213, 34, 66], 0.9],
    [173, 181, 3, [53, 138, 199], 0.9]
  ];

  let circles = [];
  for (let item of layout) {
    circles.push(new Circle(item[0] / IMG_W, item[1] / IMG_H, item[2] / IMG_SIZE, item[3], item[4]));
  }
  return circles;
}
