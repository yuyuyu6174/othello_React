import { useRef } from 'react';
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

export function useCpuWorker() {
  const workerRef = useRef<Worker>();

  const createWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/cpuWorker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return workerRef.current;
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

  return { calculateMove };
}
