import React, { useEffect, useState, useRef } from 'react';
import Board from './components/Board';
import './style.css';
import { getFlips, getValidMoves, countStones } from './logic/game';
import { AI_CONFIG, TIMING_CONFIG } from './ai/config';
import { useCpuWorker } from './hooks/useCpuWorker';
import type { Cell } from './types';

const SIZE = 8;

type Mode = 'title' | 'cpu-select' | 'cpu' | 'pvp' | 'online';

function App() {
  const createInitialBoard = (): Cell[][] => {
    const b: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0 as Cell));
    b[3][3] = 2; b[3][4] = 1;
    b[4][3] = 1; b[4][4] = 2;
    return b;
  };

  const { calculateMove } = useCpuWorker();

  const [mode, setMode] = useState<Mode>('title');
  const [cpuLevel, setCpuLevel] = useState<number>(3);
  const [playerColor, setPlayerColor] = useState<'black' | 'white' | 'random'>('black');
  const [actualPlayerColor, setActualPlayerColor] = useState<1 | 2>(1);
  const [board, setBoard] = useState<Cell[][]>(createInitialBoard);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number; flips: [number, number][] }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [cpuThinking, setCpuThinking] = useState(false);

  const randomRef = useRef<boolean>(false);

  const resolvePlayerColor = () => {
    if (playerColor === 'random') {
      return Math.random() < 0.5 ? 1 : 2;
    } else {
      return playerColor === 'black' ? 1 : 2;
    }
  };

  useEffect(() => {
    if (mode === 'cpu') {
      const resolved = resolvePlayerColor();
      setActualPlayerColor(resolved);
      randomRef.current = playerColor === 'random';

      const firstTurn = 1;
      setBoard(createInitialBoard());
      setTurn(firstTurn);
      setGameOver(false);
      setMessage(firstTurn === 1 ? '黒の番です' : '白の番です');
    } else if (mode === 'pvp') {
      setBoard(createInitialBoard());
      setTurn(1);
      setGameOver(false);
      setMessage('黒の番です');
    }
  }, [mode]);

  useEffect(() => {
    if ((mode !== 'pvp' && mode !== 'cpu') || gameOver) return;

    const moves = getValidMoves(turn, board);
    if (moves.length === 0) {
      const opponentMoves = getValidMoves(3 - turn as 1 | 2, board);
      if (opponentMoves.length === 0) {
        const { black, white } = countStones(board);
        setMessage(`ゲーム終了！ 黒:${black} 白:${white} → ` +
          (black === white ? "引き分け" : (black > white ? "黒の勝ち！" : "白の勝ち！")));
        setGameOver(true);
        setValidMoves([]);
      } else {
        setMessage(`${turn === 1 ? "黒" : "白"}は打てません。パス！`);
        setTurn(3 - turn as 1 | 2);
      }
    } else {
      setValidMoves(moves);
      if (mode === 'pvp' || (mode === 'cpu' && turn === actualPlayerColor)) {
        setMessage(`${turn === 1 ? "黒" : "白"}の番です`);
      }
    }
  }, [turn, board, gameOver, mode, actualPlayerColor]);

  useEffect(() => {
    if (mode !== 'cpu' || gameOver || turn !== (3 - actualPlayerColor) || cpuThinking) return;

    const moves = getValidMoves(turn, board);
    if (moves.length === 0) {
      const opponentMoves = getValidMoves(3 - turn as 1 | 2, board);
      if (opponentMoves.length === 0) {
        const { black, white } = countStones(board);
        setMessage(`ゲーム終了！ 黒:${black} 白:${white} → ` +
          (black === white ? "引き分け" : (black > white ? "黒の勝ち！" : "白の勝ち！")));
        setGameOver(true);
        setValidMoves([]);
      } else {
        setMessage(`${turn === 1 ? "黒" : "白"}は打てません。パス！`);
        setTurn(3 - turn as 1 | 2);
      }
      return;
    }

    setMessage("CPU思考中...");
    setCpuThinking(true);
    const thinking = calculateMove({ board, turn, level: cpuLevel });

    setTimeout(async () => {
      const move = await thinking;
      if (!move) return;
      const newBoard = board.map(row => [...row]);
      newBoard[move.y][move.x] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[fy][fx] = turn);
      setBoard(newBoard);
      setTurn(3 - turn as 1 | 2);
      setCpuThinking(false);
    }, TIMING_CONFIG.cpuDelayMs);
  }, [turn, board, mode, gameOver, cpuLevel, actualPlayerColor, cpuThinking]);

  const handleClick = (x: number, y: number) => {
    if (gameOver) return;
    const isPlayerTurn = mode === 'pvp' || (mode === 'cpu' && turn === actualPlayerColor);
    if (isPlayerTurn) {
      const moves = getValidMoves(turn, board);
      const move = moves.find(m => m.x === x && m.y === y);
      if (!move) return;

      const newBoard = board.map(row => [...row]);
      newBoard[y][x] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[fy][fx] = turn);

      setBoard(newBoard);
      setTurn(3 - turn as 1 | 2);
    }
  };

  const restartGame = () => {
    const resolved = randomRef.current ? resolvePlayerColor() : (playerColor === 'black' ? 1 : 2);
    setActualPlayerColor(resolved);
    const firstTurn = 1;
    setBoard(createInitialBoard());
    setTurn(firstTurn);
    setGameOver(false);
    setMessage(firstTurn === 1 ? '黒の番です' : '白の番です');
  };

  if (mode === 'title') {
    return (
      <div>
        <h1>オセロ</h1>
        <div id="mode-selection">
          <h2>モードを選択してください</h2>
          <div className="mode-buttons">
            <button onClick={() => setMode('cpu-select')}>CPU対戦</button>
            <button onClick={() => setMode('pvp')}>2人対戦</button>
            <button onClick={() => alert('オンライン対戦は現在準備中です。')}>オンライン対戦</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'cpu-select') {
    return (
      <div>
        <h1>CPU対戦設定</h1>
        <div>
          <label>
            CPUレベル：
            <select
              value={cpuLevel}
              onChange={(e) => setCpuLevel(parseInt(e.target.value))}
              style={{ marginLeft: 8 }}
            >
              {Object.entries(AI_CONFIG).map(([key, cfg]) =>
                cfg.visible ? (
                  <option key={key} value={key}>
                    {cfg.name}
                  </option>
                ) : null
              )}
            </select>
          </label>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
            {AI_CONFIG[String(cpuLevel)]?.comment}
          </div>
          <div style={{ marginTop: 16 }}>
            <label>
              あなたの色：
              <select
                value={playerColor}
                onChange={(e) => setPlayerColor(e.target.value as 'black' | 'white' | 'random')}
                style={{ marginLeft: 8 }}
              >
                <option value="black">黒（先手）</option>
                <option value="white">白（後手）</option>
                <option value="random">ランダム</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setMode('cpu')}>対戦開始</button>
            <button onClick={() => setMode('title')} style={{ marginLeft: 8 }}>戻る</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>オセロ</h1>
      <p style={{ fontWeight: 'bold' }}>{mode === 'cpu' ? `VS CPU（${AI_CONFIG[String(cpuLevel)]?.name}）` : '2人対戦'}</p>
      <Board board={board} validMoves={gameOver ? [] : validMoves} onCellClick={handleClick} />
      <p>{message}</p>
      <button onClick={() => setMode('title')}>タイトルに戻る</button>
      {gameOver && <button onClick={restartGame}>再戦する</button>}
    </div>
  );
}

export default App;
