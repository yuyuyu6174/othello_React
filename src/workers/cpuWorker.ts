import { cpuMove } from '../ai/ai';
import type { Cell } from '../types';

export type CpuRequest = {
  board: Cell[][];
  turn: 1 | 2;
  level: number;
};

export type CpuResponse = {
  x: number;
  y: number;
  flips: [number, number][];
} | null;

self.onmessage = function (e: MessageEvent<CpuRequest>) {
  const { board, turn, level } = e.data;
  const move = cpuMove(board, turn, level);
  postMessage(move);
};

export {};
