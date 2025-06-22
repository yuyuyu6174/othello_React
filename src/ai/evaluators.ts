import { SIZE, EMPTY, BLACK, WHITE, DEFAULT_AI_CONFIG } from './config';
import type { Board } from '../types';
import { index } from '../logic/game';



function countStones(board: Board) {
  let white = 0, black = 0;
  for (let i = 0; i < board.length; i++) {
    const cell = board[i];
    if (cell === WHITE) white++;
    else if (cell === BLACK) black++;
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
        if (board[index(cx, cy)] !== color) return false;
        cx += dx;
        cy += dy;
      }
    }
    return true;
  };

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = board[index(x, y)];
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
      const cell = board[index(x, y)];
      if (cell === color) score++;
      else if (cell === opponent) score--;
    }
  }
  return score;
}

// 2. 戦略評価（固定重み）
export function evaluateStrategicBoard(board: Board, color: number, config: any = {}): number {
  return evaluateStrategicGeneralBoard(board, color, config);
}

// 3. 戦略評価（調整パラメータあり）
export function evaluateStrategicAdvancedBoard(board: Board, color: number, config: any = {}): number {
  return evaluateStrategicGeneralBoard(board, color, config);
}

// 内部共通評価関数
function evaluateStrategicGeneralBoard(
  board: Board,
  color: number,
  config: any = {}
): number {
  const opponent = 3 - color;
  let score = 0;

  const weights = config.weights ?? DEFAULT_AI_CONFIG.weights;
  const useWeights = config.useWeights !== false;

  const stableBonus = config.stableStoneBonus ?? DEFAULT_AI_CONFIG.stableStoneBonus;
  const parityBonus = config.parityWeight ?? DEFAULT_AI_CONFIG.parityWeight;
  const xPenalty = config.xSquarePenalty ?? DEFAULT_AI_CONFIG.xSquarePenalty;
  const trapPenalty = config.trapPenalty ?? DEFAULT_AI_CONFIG.trapPenalty;

  // 重みスコア
  if (useWeights) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = board[index(x, y)];
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
    let empty = 0;
    for (let i = 0; i < board.length; i++) if (board[i] === EMPTY) empty++;
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
      if (board[index(x, y)] === color) score -= xPenalty;
      if (board[index(x, y)] === opponent) score += xPenalty;
    }
  }

  // 罠マスペナルティ
  if (config.avoidCornerTrap) {
    const trapSquares = [
      [0,1],[1,0],[1,1],[0,6],[1,7],[1,6],
      [6,0],[6,1],[7,1],[6,6],[6,7],[7,6]
    ];
    for (const [x, y] of trapSquares) {
      if (board[index(x, y)] === color) score -= trapPenalty;
      if (board[index(x, y)] === opponent) score += trapPenalty;
    }
  }

  return score;
}
