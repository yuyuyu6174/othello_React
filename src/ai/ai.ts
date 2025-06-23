import { AI_CONFIG, DEFAULT_AI_CONFIG, WHITE, BLACK, EMPTY } from './config';
import { getAllValidMoves, simulateMove, countStones, applyMove, undoMove } from '../logic/game';
import type { Board } from '../types';

// transposition table (for minimax)
const transpositionTable = new Map<string, number>();
// transposition table for endgame solver
const endgameTranspositionTable = new Map<string, number>();

// more efficient board hashing than JSON.stringify for flat board
function hashBoard(board: Board): string {
  let key = '';
  for (let i = 0; i < board.length; i++) {
    key += board[i];
  }
  return key;
}

// check if any move results in opponent having zero stones
function findEliminationMove(board: Board, color: 1 | 2) {
  const moves = getAllValidMoves(color, board);
  for (const move of moves) {
    const next = simulateMove(board, move, color);
    const { black, white } = countStones(next);
    if ((color === BLACK && white === 0) || (color === WHITE && black === 0)) {
      return move;
    }
  }
  return null;
}

export function cpuMove(
  board: Board,
  turn: 1 | 2,
  level: number
): { x: number; y: number; flips: [number, number][] } | null {
  const base = AI_CONFIG[level] || AI_CONFIG[1];
  const config: any = {
    ...DEFAULT_AI_CONFIG,
    ...base,
    endgame: { ...DEFAULT_AI_CONFIG.endgame, ...(base.endgame || {}) }
  };
  const evalFunc = (b: Board) => config.evaluator(b, turn, config);
  let emptyCount = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === EMPTY) emptyCount++;
  }

  const elimination = findEliminationMove(board, turn);
  if (elimination) return elimination;

  if (config.useEndgameSolver && config.endgame && emptyCount <= (config.endgame.maxEmpty ?? 12)) {
    return getBestMoveFullSearch(board, turn, config);
  }

  if (config.type === 'minimax') {
    const depth = config.dynamicDepth
      ? getDynamicDepth(emptyCount, config.depthTable || [])
      : config.depth ?? DEFAULT_AI_CONFIG.depth ?? 2;

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
  board: Board,
  turn: 1 | 2,
  depth: number,
  evalFunc: (b: Board) => number,
  config: any
) {
  const moves = getAllValidMoves(turn, board);
  if (moves.length === 0) return null;

  let best: any = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const undo = applyMove(board, move, turn);
    const score = minimax(board, 3 - turn as 1 | 2, depth - 1, -Infinity, Infinity, false, evalFunc, config);
    undoMove(board, undo);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

function minimax(
  board: Board,
  color: 1 | 2,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  evalFunc: (b: Board) => number,
  config: any
): number {
  const key = hashBoard(board) + color + depth;
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
      const undo = applyMove(board, move, color);
      const evalScore = minimax(board, 3 - color as 1 | 2, depth - 1, alpha, beta, false, evalFunc, config);
      undoMove(board, undo);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    transpositionTable.set(key, maxEval);
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { move } of orderedMoves) {
      const undo = applyMove(board, move, color);
      const evalScore = minimax(board, 3 - color as 1 | 2, depth - 1, alpha, beta, true, evalFunc, config);
      undoMove(board, undo);
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
  board: Board,
  turn: 1 | 2,
  timeLimit: number,
  evalFunc: (b: Board) => number,
  config: any
) {
  const moves = getAllValidMoves(turn, board);
  let bestMove = null;
  let bestScore = -Infinity;
  const start = Date.now();
  let depth = 1;

  while (Date.now() - start < timeLimit) {
    for (const move of moves) {
      const undo = applyMove(board, move, turn);
      const score = minimax(board, 3 - turn as 1 | 2, depth, -Infinity, Infinity, false, evalFunc, config);
      undoMove(board, undo);
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

function getBestMoveFullSearch(board: Board, color: 1 | 2, config: any) {
  const moves = getAllValidMoves(color, board);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestEval = -Infinity;

  // simple move ordering using evaluation function
  const ordered = moves
    .map(m => {
      const next = simulateMove(board, m, color);
      const score = config.evaluator(next, color, config);
      return { move: m, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const { move } of ordered) {
    const undo = applyMove(board, move, color);
    const evalScore = -fullSearch(board, 3 - color as 1 | 2, config, false, -Infinity, Infinity);
    undoMove(board, undo);
    if (evalScore > bestEval) {
      bestEval = evalScore;
      bestMove = move;
    }
  }

  return bestMove;
}

function fullSearch(
  board: Board,
  color: 1 | 2,
  config: any,
  _passed: boolean,
  alpha: number = -Infinity,
  beta: number = Infinity
): number {
  const key = hashBoard(board) + color;
  if (endgameTranspositionTable.has(key)) return endgameTranspositionTable.get(key)!;

  const moves = getAllValidMoves(color, board);
  if (moves.length === 0) {
    const opponentMoves = getAllValidMoves(3 - color as 1 | 2, board);
    if (opponentMoves.length === 0) {
      let black = 0, white = 0;
      for (let i = 0; i < board.length; i++) {
        if (board[i] === BLACK) black++; else if (board[i] === WHITE) white++;
      }
      const res = color === BLACK ? black - white : white - black;
      endgameTranspositionTable.set(key, res);
      return res;
    } else {
      const res = -fullSearch(board, 3 - color as 1 | 2, config, true, -beta, -alpha);
      endgameTranspositionTable.set(key, res);
      return res;
    }
  }

  // move ordering
  const ordered = moves
    .map(m => {
      const next = simulateMove(board, m, color);
      const score = config.evaluator(next, color, config);
      return { move: m, score };
    })
    .sort((a, b) => b.score - a.score);

  let best = -Infinity;
  for (const { move } of ordered) {
    const undo = applyMove(board, move, color);
    const evalScore = -fullSearch(board, 3 - color as 1 | 2, config, false, -beta, -alpha);
    undoMove(board, undo);
    best = Math.max(best, evalScore);
    alpha = Math.max(alpha, evalScore);
    if (alpha >= beta || (config.endgame?.usePruning && best >= 64)) break;
  }

  endgameTranspositionTable.set(key, best);
  return best;
}

// -------------------- MCTS --------------------

type MCTSNode = {
  board: Board;
  move?: { x: number; y: number; flips: [number, number][] };
  parent?: MCTSNode;
  children: MCTSNode[];
  untried: { x: number; y: number; flips: [number, number][] }[];
  wins: number;
  visits: number;
  color: 1 | 2; // color to move at this node
};

function selectChild(node: MCTSNode, c: number): MCTSNode {
  let bestScore = -Infinity;
  let bestChild = node.children[0];
  for (const child of node.children) {
    const uct = child.visits === 0
      ? Infinity
      : (child.wins / child.visits) + c * Math.sqrt(Math.log(node.visits) / child.visits);
    if (uct > bestScore) {
      bestScore = uct;
      bestChild = child;
    }
  }
  return bestChild;
}

function rollout(board: Board, color: 1 | 2, rootColor: 1 | 2): number {
  let currentBoard = board.slice();
  let currentColor = color;
  while (true) {
    const moves = getAllValidMoves(currentColor, currentBoard);
    if (moves.length === 0) {
      const opp = getAllValidMoves((3 - currentColor) as 1 | 2, currentBoard);
      if (opp.length === 0) break;
      currentColor = (3 - currentColor) as 1 | 2;
      continue;
    }
    const m = moves[Math.floor(Math.random() * moves.length)];
    currentBoard = simulateMove(currentBoard, m, currentColor);
    currentColor = (3 - currentColor) as 1 | 2;
  }
  const { black, white } = countStones(currentBoard);
  if (rootColor === BLACK) {
    if (black > white) return 1;
    if (black === white) return 0.5;
    return 0;
  } else {
    if (white > black) return 1;
    if (white === black) return 0.5;
    return 0;
  }
}

function getBestMoveMCTS(board: Board, turn: 1 | 2, config: any) {
  const timeLimit = config.timeLimit ?? 1000;
  const simulations = config.simulations ?? 1000;
  const c = config.explorationConstant ?? 1.4;

  const root: MCTSNode = {
    board,
    children: [],
    untried: getAllValidMoves(turn, board),
    wins: 0,
    visits: 0,
    color: turn,
  };

  const start = Date.now();
  let iter = 0;
  while (Date.now() - start < timeLimit && iter < simulations) {
    let node = root;

    // Selection
    while (node.untried.length === 0 && node.children.length > 0) {
      node = selectChild(node, c);
    }

    // Expansion
    if (node.untried.length > 0) {
      const idx = Math.floor(Math.random() * node.untried.length);
      const move = node.untried.splice(idx, 1)[0];
      const nextBoard = simulateMove(node.board, move, node.color);
      const child: MCTSNode = {
        board: nextBoard,
        move,
        parent: node,
        children: [],
        untried: getAllValidMoves((3 - node.color) as 1 | 2, nextBoard),
        wins: 0,
        visits: 0,
        color: (3 - node.color) as 1 | 2,
      };
      node.children.push(child);
      node = child;
    }

    // Simulation
    const result = rollout(node.board, node.color, turn);

    // Backpropagation
    let backNode: MCTSNode | undefined = node;
    while (backNode) {
      backNode.visits += 1;
      backNode.wins += result;
      backNode = backNode.parent;
    }

    iter++;
  }

  let bestMove = null;
  let bestVisits = -1;
  for (const child of root.children) {
    if (child.visits > bestVisits) {
      bestVisits = child.visits;
      bestMove = child.move ?? null;
    }
  }

  return bestMove;
}
