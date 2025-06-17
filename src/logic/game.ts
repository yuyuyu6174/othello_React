// ゲームロジック関連（getFlips, getValidMoves, simulateMove, countStones）

export const SIZE = 8;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

// 8方向
const directions = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1]
];

export function getFlips(
  x: number,
  y: number,
  color: number,
  board: number[][]
): [number, number][] {
  if (board[y][x] !== EMPTY) return [];
  const flips: [number, number][] = [];
  const opponent = 3 - color;

  for (const [dx, dy] of directions) {
    let cx = x + dx;
    let cy = y + dy;
    const temp: [number, number][] = [];
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

export function getValidMoves(
  color: number,
  board: number[][]
): { x: number; y: number; flips: [number, number][] }[] {
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

export function getAllValidMoves(
  color: number,
  board: number[][]
): { x: number; y: number; flips: [number, number][] }[] {
  return getValidMoves(color, board);
}

export function simulateMove(
  board: number[][],
  move: { x: number; y: number; flips: [number, number][] },
  color: number
): number[][] {
  const newBoard = board.map(row => [...row]);
  newBoard[move.y][move.x] = color;
  for (const [fx, fy] of move.flips) {
    newBoard[fy][fx] = color;
  }
  return newBoard;
}

export function countStones(board: number[][]): { black: number; white: number } {
  let black = 0, white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === BLACK) black++;
      else if (cell === WHITE) white++;
    }
  }
  return { black, white };
}
