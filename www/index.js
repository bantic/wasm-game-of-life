import { Universe, Cell } from 'wasm-game-of-life';
import { memory } from 'wasm-game-of-life/wasm_game_of_life_bg';

const CELL_SIZE = 5; // px
const GRID_COLOR = '#CCCCCC';
const DEAD_COLOR = '#FFFFFF';
const ALIVE_COLOR = '#000000';

const universe = Universe.new();
const width = universe.width();
const height = universe.height();
const canvas = document.getElementById('game-of-life-canvas');
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;
const ctx = canvas.getContext('2d');

let animationId;
const renderLoop = () => {
  fps.render();
  for (let i = 0; i < playbackSpeed; i++) {
    universe.tick();
  }
  drawGrid();
  drawCells();

  animationId = requestAnimationFrame(renderLoop);
};

const isPaused = () => animationId === null;

const playButton = document.getElementById('play-pause');
const play = () => {
  playButton.textContent = '⏸';
  renderLoop();
};
const pause = () => {
  playButton.textContent = '▶';
  cancelAnimationFrame(animationId);
  animationId = null;
};

playButton.addEventListener('click', () => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

let playbackSpeed = 1;
const playbackSlider = document.getElementById('playback-speed');
playbackSlider.value = playbackSpeed;
playbackSlider.addEventListener('input', evt => {
  playbackSpeed = playbackSlider.value;
});

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const getIndex = (row, column) => {
  return row * width + column;
};

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  ctx.beginPath();

  // draw dead cells
  ctx.fillStyle = DEAD_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (cells[idx] !== Cell.Dead) {
        continue;
      }
      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  // draw dead cells
  ctx.fillStyle = ALIVE_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (cells[idx] !== Cell.Alive) {
        continue;
      }
      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

const coordsForEvent = event => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;
  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);
  return [row, col];
};

canvas.addEventListener('click', event => {
  let [row, col] = coordsForEvent(event);
  universe.toggle_cell(row, col);
  drawGrid();
  drawCells();
});

let canvasMouseIsDown = false;
let toggledCoords = [];
canvas.addEventListener('mousedown', () => {
  canvasMouseIsDown = true;
  toggledCoords = [];
});
canvas.addEventListener('mouseup', () => {
  canvasMouseIsDown = false;
  toggledCoords = [];
});
canvas.addEventListener('mousemove', event => {
  if (canvasMouseIsDown) {
    let [row, col] = coordsForEvent(event);
    if (!toggledCoords.find(([r, c]) => r === row && c === col)) {
      toggledCoords.push([row, col]);
      universe.toggle_cell(row, col);
      drawGrid();
      drawCells();
    }
  }
});

const fps = new class {
  constructor() {
    this.fps = document.getElementById('fps');
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = (1 / delta) * 1000;

    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(min, this.frames[i]);
      max = Math.max(max, this.frames[i]);
    }
    let mean = sum / this.frames.length;

    this.fps.textContent = `
Frames per second:
  latest          = ${Math.round(fps)}
  avg of last 100 = ${Math.round(mean)}
  max of last 100 = ${Math.round(max)}
  min of last 100 = ${Math.round(min)}
`.trim();
  }
}();

drawGrid();
drawCells();
play();
