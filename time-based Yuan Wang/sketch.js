let circles;
let timeController;

function setup() {
  createCanvas(windowWidth, windowHeight);
  circles = createCircles();
  timeController = new TimeController(circles);
}

function draw() {
  timeController.update();

  background(timeController.getBackgroundColor());
  for (let c of circles) {
    c.display();
  }

  timeController.drawDebugPanel();
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    timeController.toggleDebug();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
