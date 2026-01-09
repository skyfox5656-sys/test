const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");
const scoreElement = document.getElementById("score");
const linesElement = document.getElementById("lines");
const startButton = document.getElementById("start");

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 24;

const COLORS = [
  "#000000",
  "#50c8ff",
  "#4bd37b",
  "#f7d44c",
  "#f082ff",
  "#ff8f5a",
  "#ff5f5f",
  "#8a7dff",
];

const SHAPES = [
  [],
  [[1, 1, 1, 1]],
  [
    [2, 2],
    [2, 2],
  ],
  [
    [0, 3, 0],
    [3, 3, 3],
  ],
  [
    [4, 0, 0],
    [4, 4, 4],
  ],
  [
    [0, 0, 5],
    [5, 5, 5],
  ],
  [
    [6, 6, 0],
    [0, 6, 6],
  ],
  [
    [0, 7, 7],
    [7, 7, 0],
  ],
];

let board = createBoard();
let player = createPlayer();
let dropCounter = 0;
let lastTime = 0;
let isRunning = false;
let isPaused = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function createPlayer() {
  return {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null,
    score: 0,
    lines: 0,
  };
}

function resetPlayer() {
  if (!player.next) {
    player.matrix = randomPiece();
    player.next = randomPiece();
  } else {
    player.matrix = player.next;
    player.next = randomPiece();
  }

  player.pos.y = 0;
  player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(board, player)) {
    board = createBoard();
    player.score = 0;
    player.lines = 0;
    updateScore();
    isRunning = false;
  }
}

function randomPiece() {
  const type = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
  return SHAPES[type].map((row) => row.slice());
}

function collide(arena, playerState) {
  const matrix = playerState.matrix;
  const { x: offsetX, y: offsetY } = playerState.pos;

  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (
        matrix[y][x] !== 0 &&
        (arena[y + offsetY] && arena[y + offsetY][x + offsetX]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, playerState) {
  playerState.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + playerState.pos.y][x + playerState.pos.x] = value;
      }
    });
  });
}

function rotate(matrix) {
  const rotated = matrix.map((row, i) => row.map((_, j) => matrix[j][i]));
  rotated.forEach((row) => row.reverse());
  return rotated;
}

function playerRotate() {
  const rotated = rotate(player.matrix);
  const originalX = player.pos.x;
  let offset = 1;

  player.matrix = rotated;
  while (collide(board, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      player.matrix = rotate(rotate(rotate(player.matrix)));
      player.pos.x = originalX;
      return;
    }
  }
}

function sweep() {
  let rowCount = 0;

  for (let y = board.length - 1; y >= 0; y -= 1) {
    if (board[y].every((value) => value !== 0)) {
      const row = board.splice(y, 1)[0].fill(0);
      board.unshift(row);
      y += 1;
      rowCount += 1;
    }
  }

  if (rowCount > 0) {
    const points = [0, 40, 100, 300, 1200];
    player.score += points[rowCount];
    player.lines += rowCount;
    updateScore();
  }
}

function playerDrop() {
  player.pos.y += 1;
  if (collide(board, player)) {
    player.pos.y -= 1;
    merge(board, player);
    sweep();
    resetPlayer();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(board, player)) {
    player.pos.y += 1;
  }
  player.pos.y -= 1;
  merge(board, player);
  sweep();
  resetPlayer();
  dropCounter = 0;
}

function drawMatrix(matrix, offset, ctx, blockSize) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = COLORS[value];
        ctx.fillRect(
          (x + offset.x) * blockSize,
          (y + offset.y) * blockSize,
          blockSize,
          blockSize
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.strokeRect(
          (x + offset.x) * blockSize,
          (y + offset.y) * blockSize,
          blockSize,
          blockSize
        );
      }
    });
  });
}

function draw() {
  context.fillStyle = "#070b14";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(board, { x: 0, y: 0 }, context, BLOCK_SIZE);
  drawMatrix(player.matrix, player.pos, context, BLOCK_SIZE);

  nextContext.fillStyle = "#070b14";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const previewOffset = {
    x: ((4 - player.next[0].length) / 2) | 0,
    y: ((4 - player.next.length) / 2) | 0,
  };
  drawMatrix(player.next, previewOffset, nextContext, NEXT_BLOCK_SIZE);
}

function update(time = 0) {
  if (!isRunning) {
    draw();
    return;
  }
  const deltaTime = time - lastTime;
  lastTime = time;
  if (!isPaused) {
    dropCounter += deltaTime;
    if (dropCounter > 900) {
      playerDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  scoreElement.textContent = player.score;
  linesElement.textContent = player.lines;
}

function startGame() {
  board = createBoard();
  player = createPlayer();
  resetPlayer();
  updateScore();
  isRunning = true;
  isPaused = false;
  lastTime = 0;
  dropCounter = 0;
  update();
}

function togglePause() {
  if (!isRunning) {
    return;
  }
  isPaused = !isPaused;
}

document.addEventListener("keydown", (event) => {
  if (!isRunning) {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
      player.pos.x -= 1;
      if (collide(board, player)) {
        player.pos.x += 1;
      }
      break;
    case "ArrowRight":
      player.pos.x += 1;
      if (collide(board, player)) {
        player.pos.x -= 1;
      }
      break;
    case "ArrowDown":
      playerDrop();
      break;
    case "ArrowUp":
    case "z":
    case "Z":
      playerRotate();
      break;
    case " ":
      event.preventDefault();
      hardDrop();
      break;
    case "p":
    case "P":
      togglePause();
      break;
    default:
      break;
  }
});

startButton.addEventListener("click", () => {
  startGame();
});

resetPlayer();
updateScore();
update();
