const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT, path: '/othello' });

const SIZE = 8;
const EMPTY = 0;

function createInitialBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  b[3][3] = 2; b[3][4] = 1;
  b[4][3] = 1; b[4][4] = 2;
  return b;
}

function getFlips(x, y, color, board) {
  if (board[y][x] !== EMPTY) return [];
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
  ];
  const opponent = 3 - color;
  const flips = [];
  for (const [dx, dy] of dirs) {
    let cx = x + dx;
    let cy = y + dy;
    const temp = [];
    while (cx >= 0 && cx < SIZE && cy >= 0 && cy < SIZE && board[cy][cx] === opponent) {
      temp.push([cx, cy]);
      cx += dx;
      cy += dy;
    }
    if (cx >= 0 && cx < SIZE && cy >= 0 && cy < SIZE && board[cy][cx] === color) {
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
      if (flips.length) moves.push({ x, y, flips });
    }
  }
  return moves;
}

function applyMove(board, x, y, color) {
  const move = getFlips(x, y, color, board);
  if (!move.length) return false;
  board[y][x] = color;
  for (const [fx, fy] of move) board[fy][fx] = color;
  return true;
}

const openQueue = [];
const passRooms = new Map();
const clientInfo = new Map();

function sendError(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

function startGame(p1, p2) {
  const colors = Math.random() < 0.5 ? [1, 2] : [2, 1];
  const board = createInitialBoard();
  const game = { board, players: { [colors[0]]: p1, [colors[1]]: p2 }, turn: 1 };
  clientInfo.set(p1, { game, color: colors[0] });
  clientInfo.set(p2, { game, color: colors[1] });
  const msg1 = { type: 'start', board, turn: 1, color: colors[0] };
  const msg2 = { type: 'start', board, turn: 1, color: colors[1] };
  p1.send(JSON.stringify(msg1));
  p2.send(JSON.stringify(msg2));
}

function handleJoin(ws, msg) {
  if (msg.mode === 'open') {
    if (openQueue.length) {
      const other = openQueue.shift();
      startGame(other, ws);
    } else {
      openQueue.push(ws);
    }
  } else if (msg.mode === 'pass' && msg.key) {
    const list = passRooms.get(msg.key) || [];
    if (list.length) {
      const other = list.shift();
      if (!list.length) passRooms.delete(msg.key);
      startGame(other, ws);
    } else {
      list.push(ws);
      passRooms.set(msg.key, list);
    }
  } else {
    sendError(ws, 'invalid join');
  }
}

function handleMove(ws, msg) {
  const info = clientInfo.get(ws);
  if (!info) {
    sendError(ws, 'not in a game');
    return;
  }
  const { game, color } = info;
  if (color !== game.turn) {
    sendError(ws, 'not your turn');
    return;
  }
  if (!applyMove(game.board, msg.x, msg.y, color)) {
    sendError(ws, 'invalid move');
    return;
  }
  game.turn = 3 - game.turn;

  let moves = getValidMoves(game.turn, game.board);
  if (moves.length === 0) {
    game.turn = 3 - game.turn;
    moves = getValidMoves(game.turn, game.board);
    if (moves.length === 0) {
      for (const player of Object.values(game.players)) {
        player.send(JSON.stringify({ type: 'end', board: game.board }));
        clientInfo.delete(player);
      }
      return;
    }
  }
  for (const player of Object.values(game.players)) {
    player.send(JSON.stringify({ type: 'update', board: game.board, turn: game.turn }));
  }
}

function handleGiveUp(ws) {
  const info = clientInfo.get(ws);
  if (!info) {
    sendError(ws, 'not in a game');
    return;
  }
  const { game, color } = info;
  for (const player of Object.values(game.players)) {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: 'end', board: game.board, surrendered: color }));
    }
    clientInfo.delete(player);
  }
}

function cleanup(ws) {
  const info = clientInfo.get(ws);
  if (info) {
    const otherColor = 3 - info.color;
    const other = info.game.players[otherColor];
    if (other && other.readyState === WebSocket.OPEN) {
      sendError(other, 'opponent disconnected');
    }
    for (const player of Object.values(info.game.players)) {
      clientInfo.delete(player);
    }
  } else {
    clientInfo.delete(ws);
  }
  const idx = openQueue.indexOf(ws);
  if (idx !== -1) openQueue.splice(idx, 1);
  for (const [key, list] of passRooms) {
    const i = list.indexOf(ws);
    if (i !== -1) {
      list.splice(i, 1);
      if (!list.length) passRooms.delete(key);
      break;
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      sendError(ws, 'invalid message');
      return;
    }
    if (msg.type === 'join') handleJoin(ws, msg);
    else if (msg.type === 'move') handleMove(ws, msg);
    else if (msg.type === 'giveup') handleGiveUp(ws);
    else sendError(ws, 'unknown type');
  });
  ws.on('close', () => cleanup(ws));
});

console.log(`WebSocket server running on ws://localhost:${PORT}/othello`);
