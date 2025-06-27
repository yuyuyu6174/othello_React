import { cpuMove } from '../ai/ai';
import type { Board } from '../types';

export type CpuStartRequest = {
  type: 'start';
  board: Board;
  turn: 1 | 2;
  level: number;
};

export type CpuAbortRequest = {
  type: 'abort';
};

export type CpuRequest = CpuStartRequest | CpuAbortRequest;

export type CpuResponse = {
  x: number;
  y: number;
  flips: [number, number][];
} | null;

let controller: AbortController | null = null;

self.onmessage = function (e: MessageEvent<CpuRequest>) {
  const data = e.data;
  if (data.type === 'abort') {
    controller?.abort();
    controller = null;
    return;
  }

  if (data.type === 'start') {
    controller?.abort();
    controller = new AbortController();
    try {
      const move = cpuMove(data.board, data.turn, data.level, controller.signal);
      postMessage(move);
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        // Unexpected error; rethrow
        throw err;
      }
    } finally {
      controller = null;
    }
  }
};

export {};
