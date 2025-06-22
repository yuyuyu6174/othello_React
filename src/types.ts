// src/types.ts
export type Cell = 0 | 1 | 2;

// Flat board of length 64. Using Uint8Array keeps copies cheap.
export type Board = Uint8Array;
