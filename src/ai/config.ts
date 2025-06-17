import {
  evaluateBoard,
  evaluateStrategicBoard,
  evaluateStrategicAdvancedBoard
} from './evaluators';

// 石の定数
export const SIZE = 8;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, 1], [-1, 1], [1, -1]
];

// config.ts

export const TIMING_CONFIG = {
  cpuDelayMs: 600,        // プレイヤーが打ってからCPUが置くまでの待機時間（ミリ秒）
};

// ========================
// AIレベル定義
// ========================

export interface AIConfig {
  visible?: boolean;
  name: string;
  comment: string;
  type: 'minimax' | 'iterative' | 'mcts';
  depth?: number;
  dynamicDepth?: boolean;
  depthTable?: { max: number; depth: number }[];
  timeLimit?: number;
  simulations?: number;
  explorationConstant?: number;
  evaluator: Function;
  useWeights?: boolean;
  weights?: number[][];
  avoidCornerTrap?: boolean;
  evaluateStableStones?: boolean;
  considerParity?: boolean;
  penalizeXSquare?: boolean;
  parityWeight?: number;
  stableStoneBonus?: number;
  xSquarePenalty?: number;
  trapPenalty?: number;

  useEndgameSolver?: boolean;
  endgame?: {
    maxEmpty: number;
    usePruning: boolean;
  };
}

export const AI_CONFIG: { [level: number]: AIConfig } = {
  1: {
    visible: true,
    name: "弱",
    comment: "浅い読みとシンプルな評価（初心者向け）",
    type: "minimax",
    depth: 1,
    evaluator: evaluateBoard
  },
  2: {
    visible: true,
    name: "中",
    comment: "標準的な深さのミニマックス探索",
    type: "minimax",
    depth: 2,
    evaluator: evaluateBoard
  },
  3: {
    visible: true,
    name: "強",
    comment: "さらに深い探索で安定したプレイ",
    type: "minimax",
    depth: 3,
    evaluator: evaluateBoard
  },
  4: {
    visible: true,
    name: "最強",
    comment: "深さ6の高精度ミニマックス探索（実践向け）",
    type: "minimax",
    depth: 6,
    evaluator: evaluateStrategicBoard,
    useWeights: false,
    avoidCornerTrap: true,
    penalizeXSquare: true
  },
  101: {
    visible: true,
    name: "AI Test1",
    comment: "戦略評価を導入",
    type: "minimax",
    depth: 6,
    evaluator: evaluateStrategicBoard,
    useWeights: true,
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true
  },
  102: {
    visible: true,
    name: "AI Test2",
    comment: "残りマス数に応じて深さを調整（動的読み）",
    type: "minimax",
    dynamicDepth: true,
    depthTable: [
      { max: 20, depth: 7 },
      { max: 40, depth: 5 },
      { max: 64, depth: 4 }
    ],
    evaluator: evaluateStrategicBoard,
    useWeights: true,
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true
  },
  103: {
    visible: true,
    name: "AI Test3",
    comment: "反復深化探索（時間制限あり）",
    type: "iterative",
    timeLimit: 800,
    evaluator: evaluateStrategicBoard,
    useWeights: true,
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true
  },
  104: {
    visible: true,
    name: "AI Test4",
    comment: "MCTS（モンテカルロ木探索）を使用",
    type: "mcts",
    simulations: 1000,
    timeLimit: 800,
    explorationConstant: 1.1,
    evaluator: evaluateStrategicAdvancedBoard,
    useWeights: true,
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true,
    parityWeight: 50,
    stableStoneBonus: 30,
    xSquarePenalty: 60
  },
  105: {
    visible: false,
    name: "AI Test5",
    comment: "評価カスタムを実装",
    type: "minimax",
    dynamicDepth: true,
    depthTable: [
      { max: 20, depth: 8 },
      { max: 40, depth: 6 },
      { max: 64, depth: 5 }
    ],
    evaluator: evaluateStrategicAdvancedBoard,
    useWeights: true,
    weights: [
      [100, -40, 20, 5, 5, 20, -40, 100],
      [-40, -80, -1, -1, -1, -1, -80, -40],
      [20, -1, 5, 1, 1, 5, -1, 20],
      [5, -1, 1, 0, 0, 1, -1, 5],
      [5, -1, 1, 0, 0, 1, -1, 5],
      [20, -1, 5, 1, 1, 5, -1, 20],
      [-40, -80, -1, -1, -1, -1, -80, -40],
      [100, -40, 20, 5, 5, 20, -40, 100]
    ],
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true,
    parityWeight: 40,
    stableStoneBonus: 20,
    xSquarePenalty: 50,
    useEndgameSolver: true,
    endgame: {
      maxEmpty: 12,
      usePruning: true
    }
  },
  106: {
    visible: true,
    name: "AI Test6",
    comment: "残り12マスになると完全終局読みを使用",
    type: "minimax",
    dynamicDepth: true,
    depthTable: [
      { max: 20, depth: 8 },
      { max: 40, depth: 6 },
      { max: 64, depth: 5 }
    ],
    evaluator: evaluateStrategicBoard,
    useWeights: true,
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true,
    useEndgameSolver: true,
    endgame: {
      maxEmpty: 12,
      usePruning: true
    }
  },
  999: {
    visible: true,
    name: "Noob",
    comment: "最深読みと戦略フル活用。",
    type: "minimax",
    dynamicDepth: true,
    depthTable: [
      { max: 20, depth: 8 },
      { max: 40, depth: 6 },
      { max: 64, depth: 5 }
    ],
    evaluator: evaluateStrategicAdvancedBoard,
    useWeights: true,
    weights: [
      [100, -40, 20, 5, 5, 20, -40, 100],
      [-40, -80, -1, -1, -1, -1, -80, -40],
      [20, -1, 5, 1, 1, 5, -1, 20],
      [5, -1, 1, 0, 0, 1, -1, 5],
      [5, -1, 1, 0, 0, 1, -1, 5],
      [20, -1, 5, 1, 1, 5, -1, 20],
      [-40, -80, -1, -1, -1, -1, -80, -40],
      [100, -40, 20, 5, 5, 20, -40, 100]
    ],
    avoidCornerTrap: true,
    evaluateStableStones: true,
    considerParity: true,
    penalizeXSquare: true,
    parityWeight: 60,
    stableStoneBonus: 30,
    xSquarePenalty: 60,
    trapPenalty: 40,
    useEndgameSolver: true,
    endgame: {
      maxEmpty: 12,
      usePruning: true
    }
  }
};
