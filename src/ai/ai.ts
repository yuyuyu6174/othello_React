import { AI_CONFIG, WHITE, BLACK } from './config';
import { getAllValidMoves, simulateMove } from '../logic/game';
import {
  evaluateBoard,
  evaluateStrategicBoard,
  evaluateStrategicAdvancedBoard
} from './evaluators';

// transposition table (for minimax)
const transpositionTable = new Map<string, number>();

export function cpuMove(board: number[][], turn: 1 | 2, level: number): { x: number; y: number; flips: [number, number][] } | null {
  const config = AI_CONFIG[level] || AI_CONFIG[1];
  const evalFunc = (b: number[][]) => config.evaluator(b, turn, config);
  const emptyCount = board.flat().filter(c => c === 0).length;

  if (config.useEndgameSolver && config.endgame && emptyCount <= (config.endgame.maxEmpty ?? 12)) {
    return getBestMoveFullSearch(board, turn, config);
  }

  if (config.type === 'minimax') {
    const depth = config.dynamicDepth
      ? getDynamicDepth(emptyCount, config.depthTable || [])
      : config.depth || 2;

    return getBestMoveMinimax(board, turn, depth, evalFunc, config);
  }

  if (config.type === 'iterative') {
    return getBestMoveIterative(board, turn, config.timeLimit || 1000, evalFunc, config);
  }

  if (config.type === 'mcts') {
    return getBestMoveMCTS(board, turn, config);
  }

  return null;
}

function getDynamicDepth(empty: number, table: { max: number; depth: number }[]): number {
  for (let item of table) {
    if (empty <= item.max) return item.depth;
  }
  return 2;
}

// -------------------- MINIMAX --------------------

function getBestMoveMinimax(
  board: number[][],
  turn: 1 | 2,
  depth: number,
  evalFunc: (b: number[][]) => number,
  config: any
) {
  const moves = getAllValidMoves(turn, board);
  if (moves.length === 0) return null;

  let best: any = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const temp = simulateMove(board, move, turn);
    const score = minimax(temp, 3 - turn as 1 | 2, depth - 1, -Infinity, Infinity, false, evalFunc, config);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

function minimax(
  board: number[][],
  color: 1 | 2,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  evalFunc: (b: number[][]) => number,
  config: any
): number {
  const key = JSON.stringify(board) + color + depth;
  if (transpositionTable.has(key)) return transpositionTable.get(key)!;

  const moves = getAllValidMoves(color, board);
  if (depth === 0 || moves.length === 0) {
    const val = evalFunc(board);
    transpositionTable.set(key, val);
    return val;
  }

  const orderedMoves = moves
    .map(move => {
      const temp = simulateMove(board, move, color);
      const score = evalFunc(temp);
      return { move, score };
    })
    .sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const { move } of orderedMoves) {
      const next = simulateMove(board, move, color);
      const evalScore = minimax(next, 3 - color as 1 | 2, depth - 1, alpha, beta, false, evalFunc, config);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    transpositionTable.set(key, maxEval);
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { move } of orderedMoves) {
      const next = simulateMove(board, move, color);
      const evalScore = minimax(next, 3 - color as 1 | 2, depth - 1, alpha, beta, true, evalFunc, config);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    transpositionTable.set(key, minEval);
    return minEval;
  }
}

// -------------------- ITERATIVE DEEPENING --------------------

function getBestMoveIterative(
  board: number[][],
  turn: 1 | 2,
  timeLimit: number,
  evalFunc: (b: number[][]) => number,
  config: any
) {
  const moves = getAllValidMoves(turn, board);
  let bestMove = null;
  let bestScore = -Infinity;
  const start = Date.now();
  let depth = 1;

  while (Date.now() - start < timeLimit) {
    for (const move of moves) {
      const temp = simulateMove(board, move, turn);
      const score = minimax(temp, 3 - turn as 1 | 2, depth, -Infinity, Infinity, false, evalFunc, config);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    depth++;
  }

  return bestMove;
}

// -------------------- FULL SEARCH (ENDGAME SOLVER) --------------------

function getBestMoveFullSearch(board: number[][], color: 1 | 2, config: any) {
  const moves = getAllValidMoves(color, board);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestEval = -Infinity;

  for (const move of moves) {
    const temp = simulateMove(board, move, color);
    const evalScore = -fullSearch(temp, 3 - color as 1 | 2, config, false);
    if (evalScore > bestEval) {
      bestEval = evalScore;
      bestMove = move;
    }
  }

  return bestMove;
}

function fullSearch(board: number[][], color: 1 | 2, config: any, passed: boolean): number {
  const moves = getAllValidMoves(color, board);
  if (moves.length === 0) {
    const opponentMoves = getAllValidMoves(3 - color as 1 | 2, board);
    if (opponentMoves.length === 0) {
      const black = board.flat().filter(c => c === BLACK).length;
      const white = board.flat().filter(c => c === WHITE).length;
      return (color === BLACK ? black - white : white - black);
    } else {
      return -fullSearch(board, 3 - color as 1 | 2, config, true);
    }
  }

  let best = -Infinity;
  for (const move of moves) {
    const temp = simulateMove(board, move, color);
    const evalScore = -fullSearch(temp, 3 - color as 1 | 2, config, false);
    best = Math.max(best, evalScore);

    if (config.endgame?.usePruning && best >= 64) break;
  }

  return best;
}

// -------------------- MCTS (後で実装) --------------------

function getBestMoveMCTS(board: number[][], turn: 1 | 2, config: any) {
  // TODO: MCTSは後で
  return null;
}
