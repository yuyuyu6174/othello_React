// ゲームロジック関連（getFlips, getValidMoves, simulateMove, countStones）

export const SIZE = 8;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

import type { Board } from '../types';

export function index(x: number, y: number): number {
  return y * SIZE + x;
}

// 8方向
const directions = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1]
];

export function getFlips(
  x: number,
  y: number,
  color: number,
  board: Board
): [number, number][] {
  if (board[index(x, y)] !== EMPTY) return [];
  const flips: [number, number][] = [];
  const opponent = 3 - color;

  for (const [dx, dy] of directions) {
    let cx = x + dx;
    let cy = y + dy;
    const temp: [number, number][] = [];
    while (
      cx >= 0 && cx < SIZE &&
      cy >= 0 && cy < SIZE &&
      board[index(cx, cy)] === opponent
    ) {
      temp.push([cx, cy]);
      cx += dx;
      cy += dy;
    }
    if (
      cx >= 0 && cx < SIZE &&
      cy >= 0 && cy < SIZE &&
      board[index(cx, cy)] === color
    ) {
      flips.push(...temp);
    }
  }

  return flips;
}

export function getValidMoves(
  color: number,
  board: Board
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
  board: Board
): { x: number; y: number; flips: [number, number][] }[] {
  return getValidMoves(color, board);
}

export function simulateMove(
  board: Board,
  move: { x: number; y: number; flips: [number, number][] },
  color: number
): Board {
  const newBoard = board.slice();
  newBoard[index(move.x, move.y)] = color;
  for (const [fx, fy] of move.flips) {
    newBoard[index(fx, fy)] = color;
  }
  return newBoard;
}

export function countStones(board: Board): { black: number; white: number } {
  let black = 0, white = 0;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = board[i];
    if (cell === BLACK) black++;
    else if (cell === WHITE) white++;
  }
  return { black, white };
}

export type Undo = { idx: number; prev: number }[];

export function applyMove(board: Board, move: { x: number; y: number; flips: [number, number][] }, color: number): Undo {
  const changes: Undo = [];
  const placedIdx = index(move.x, move.y);
  changes.push({ idx: placedIdx, prev: board[placedIdx] });
  board[placedIdx] = color;
  for (const [fx, fy] of move.flips) {
    const i = index(fx, fy);
    changes.push({ idx: i, prev: board[i] });
    board[i] = color;
  }
  return changes;
}

export function undoMove(board: Board, changes: Undo): void {
  for (const { idx, prev } of changes) {
    board[idx] = prev;
  }
}
