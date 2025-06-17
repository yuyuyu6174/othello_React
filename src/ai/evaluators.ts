import { SIZE, EMPTY, BLACK, WHITE } from './config';

// デフォルトの重みマトリクス
export const DEFAULT_WEIGHTS: number[][] = [
  [100, -25, 10, 5, 5, 10, -25, 100],
  [-25, -50, 1, 1, 1, 1, -50, -25],
  [10, 1, 3, 2, 2, 3, 1, 10],
  [5, 1, 2, 1, 1, 2, 1, 5],
  [5, 1, 2, 1, 1, 2, 1, 5],
  [10, 1, 3, 2, 2, 3, 1, 10],
  [-25, -50, 1, 1, 1, 1, -50, -25],
  [100, -25, 10, 5, 5, 10, -25, 100]
];

type Board = number[][];

function countStones(board: Board) {
  let white = 0, black = 0;
  for (let row of board) {
    for (let cell of row) {
      if (cell === WHITE) white++;
      else if (cell === BLACK) black++;
    }
  }
  return { white, black };
}

function getStableStones(board: Board): number[][] {
  const stable = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
  ];

  const check = (x: number, y: number, color: number): boolean => {
    for (let [dx, dy] of directions) {
      let cx = x + dx, cy = y + dy;
      while (cx >= 0 && cx < SIZE && cy >= 0 && cy < SIZE) {
        if (board[cy][cx] !== color) return false;
        cx += dx;
        cy += dy;
      }
    }
    return true;
  };

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = board[y][x];
      if (cell !== EMPTY && check(x, y, cell)) {
        stable[y][x] = cell;
      }
    }
  }

  return stable;
}

// === 評価関数 ===

// 1. 軽量評価（石数の差）
export function evaluateBoard(board: Board, color: number): number {
  const opponent = 3 - color;
  let score = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === color) score++;
      else if (board[y][x] === opponent) score--;
    }
  }
  return score;
}

// 2. 戦略評価（固定重み）
export function evaluateStrategicBoard(board: Board, color: number, config: any = {}): number {
  return evaluateStrategicGeneralBoard(board, color, config, true);
}

// 3. 戦略評価（調整パラメータあり）
export function evaluateStrategicAdvancedBoard(board: Board, color: number, config: any = {}): number {
  return evaluateStrategicGeneralBoard(board, color, config, false);
}

// 内部共通評価関数
function evaluateStrategicGeneralBoard(
  board: Board,
  color: number,
  config: any = {},
  useDefaults = true
): number {
  const opponent = 3 - color;
  let score = 0;

  const weights = config.weights || DEFAULT_WEIGHTS;
  const useWeights = config.useWeights !== false;

  const stableBonus = useDefaults ? 20 : config.stableStoneBonus ?? 20;
  const parityBonus = useDefaults ? 40 : config.parityWeight ?? 40;
  const xPenalty = useDefaults ? 30 : config.xSquarePenalty ?? 50;
  const trapPenalty = useDefaults ? 30 : config.trapPenalty ?? 30;

  // 重みスコア
  if (useWeights) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = board[y][x];
        if (cell === color) score += weights[y][x];
        else if (cell === opponent) score -= weights[y][x];
      }
    }
  }

  // 安定石
  if (config.evaluateStableStones) {
    const stable = getStableStones(board);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (stable[y][x] === color) score += stableBonus;
        else if (stable[y][x] === opponent) score -= stableBonus;
      }
    }
  }

  // パリティ
  if (config.considerParity) {
    const empty = board.flat().filter(c => c === EMPTY).length;
    if (empty <= 16) {
      const count = countStones(board);
      const parity = (color === WHITE ? count.white - count.black : count.black - count.white);
      score += parityBonus * Math.sign(parity);
    }
  }

  // Xマスペナルティ
  if (config.penalizeXSquare) {
    const xSquares = [ [1,1], [6,1], [1,6], [6,6] ];
    for (const [x, y] of xSquares) {
      if (board[y][x] === color) score -= xPenalty;
      if (board[y][x] === opponent) score += xPenalty;
    }
  }

  // 罠マスペナルティ
  if (config.avoidCornerTrap) {
    const trapSquares = [
      [0,1],[1,0],[1,1],[0,6],[1,7],[1,6],
      [6,0],[6,1],[7,1],[6,6],[6,7],[7,6]
    ];
    for (const [x, y] of trapSquares) {
      if (board[y][x] === color) score -= trapPenalty;
      if (board[y][x] === opponent) score += trapPenalty;
    }
  }

  return score;
}
