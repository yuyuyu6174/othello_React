import { useRef } from 'react';
import type { Board } from '../types';
import { clearTranspositionTables } from '../ai/ai';

export type CpuRequest = {
  board: Board;
  turn: 1 | 2;
  level: number;
};

type WorkerMessage =
  | ({ type: 'start' } & CpuRequest)
  | { type: 'abort' };

export type CpuResponse = {
  x: number;
  y: number;
  flips: [number, number][];
} | null;

export function useCpuWorker() {
  const workerRef = useRef<Worker | null>(null);

  const createWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/cpuWorker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return workerRef.current;
  };

  const abort = () => {
    if (workerRef.current) {
      const msg: WorkerMessage = { type: 'abort' };
      workerRef.current.postMessage(msg);
    }
  };

  const reset = () => {
    if (workerRef.current) {
      abort();
      workerRef.current.terminate();
      workerRef.current = null;
    }
    clearTranspositionTables();
  };

  const calculateMove = (data: CpuRequest): Promise<CpuResponse> => {
    return new Promise((resolve) => {
      const worker = createWorker();
      const handleMessage = (e: MessageEvent<CpuResponse>) => {
        resolve(e.data);
        worker.removeEventListener('message', handleMessage);
      };
      worker.addEventListener('message', handleMessage);
      const msg: WorkerMessage = { type: 'start', ...data };
      worker.postMessage(msg);
    });
  };

  return { calculateMove, reset, abort };
}
