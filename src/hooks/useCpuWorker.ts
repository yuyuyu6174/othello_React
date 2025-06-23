import { useRef } from 'react';
import type { Board } from '../types';

export type CpuRequest = {
  board: Board;
  turn: 1 | 2;
  level: number;
};

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

  const reset = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  const calculateMove = (data: CpuRequest): Promise<CpuResponse> => {
    return new Promise((resolve) => {
      const worker = createWorker();
      const handleMessage = (e: MessageEvent<CpuResponse>) => {
        resolve(e.data);
        worker.removeEventListener('message', handleMessage);
      };
      worker.addEventListener('message', handleMessage);
      worker.postMessage(data);
    });
  };

  return { calculateMove, reset };
}
