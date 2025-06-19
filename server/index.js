const WebSocket = require('ws');

const PORT = 8080;

const SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

function createInitialBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  b[3][3] = WHITE; b[3][4] = BLACK;
  b[4][3] = BLACK; b[4][4] = WHITE;
  return b;
}

const directions = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1]
];

function getFlips(x, y, color, board) {
  if (board[y][x] !== EMPTY) return [];
  const flips = [];
  const opponent = 3 - color;

  for (const [dx, dy] of directions) {
    let cx = x + dx;
    let cy = y + dy;
    const temp = [];
    while (
      cx >= 0 && cx < SIZE &&
      cy >= 0 && cy < SIZE &&
      board[cy][cx] === opponent
    ) {
      temp.push([cx, cy]);
      cx += dx;
      cy += dy;
    }
    if (
      cx >= 0 && cx < SIZE &&
      cy >= 0 && cy < SIZE &&
      board[cy][cx] === color
    ) {
      flips.push(...temp);
    }
  }
  return flips;
}

function getValidMoves(color, board) {
  const moves = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const flips = getFlips(x, y, color, board);
      if (flips.length > 0) {
        moves.push({ x, y, flips });
      }
    }
  }
  return moves;
}

function applyMove(board, x, y, color) {
  const flips = getFlips(x, y, color, board);
  if (flips.length === 0) return false;
  board[y][x] = color;
  for (const [fx, fy] of flips) {
    board[fy][fx] = color;
  }
  return true;
}

const wss = new WebSocket.Server({ port: PORT });

const openQueue = [];
const passRooms = new Map();
const clientInfo = new Map(); // ws -> { game, color }

function startGame(ws1, ws2) {
  const board = createInitialBoard();
  const color1 = Math.random() < 0.5 ? BLACK : WHITE;
  const color2 = color1 === BLACK ? WHITE : BLACK;
  const game = { board, turn: BLACK, players: { [color1]: ws1, [color2]: ws2 } };
  clientInfo.set(ws1, { game, color: color1 });
  clientInfo.set(ws2, { game, color: color2 });
  ws1.send(JSON.stringify({ type: 'start', board, turn: game.turn, color: color1 }));
  ws2.send(JSON.stringify({ type: 'start', board, turn: game.turn, color: color2 }));
}

function handleJoin(ws, msg) {
  if (msg.mode === 'open') {
    if (openQueue.length > 0) {
      const other = openQueue.shift();
      startGame(other, ws);
    } else {
      openQueue.push(ws);
      ws.send(JSON.stringify({ type: 'wait' }));
    }
  } else if (msg.mode === 'pass') {
    const key = msg.key || '';
    const waiting = passRooms.get(key) || [];
    if (waiting.length > 0) {
      const other = waiting.shift();
      if (waiting.length === 0) passRooms.delete(key);
      startGame(other, ws);
    } else {
      passRooms.set(key, [ws]);
      ws.send(JSON.stringify({ type: 'wait' }));
    }
  }
}

function handleMove(ws, msg) {
  const info = clientInfo.get(ws);
  if (!info) return;
  const { game, color } = info;
  if (game.turn !== color) return;
  if (!applyMove(game.board, msg.x, msg.y, color)) return;
  game.turn = 3 - game.turn;

  let moves = getValidMoves(game.turn, game.board);
  if (moves.length === 0) {
    game.turn = 3 - game.turn;
    moves = getValidMoves(game.turn, game.board);
    if (moves.length === 0) {
      // game end
      for (const ws of Object.values(game.players)) {
        ws.send(JSON.stringify({ type: 'end', board: game.board }));
        clientInfo.delete(ws);
      }
      return;
    }
  }

  for (const [c, playerWs] of Object.entries(game.players)) {
    playerWs.send(JSON.stringify({ type: 'update', board: game.board, turn: game.turn }));
  }
}

function cleanup(ws) {
  clientInfo.delete(ws);
  const idx = openQueue.indexOf(ws);
  if (idx !== -1) openQueue.splice(idx, 1);
  for (const [key, list] of passRooms) {
    const i = list.indexOf(ws);
    if (i !== -1) {
      list.splice(i, 1);
      if (list.length === 0) passRooms.delete(key);
      break;
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === 'join') handleJoin(ws, msg);
    else if (msg.type === 'move') handleMove(ws, msg);
  });
  ws.on('close', () => cleanup(ws));
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
