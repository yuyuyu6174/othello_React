import { useEffect, useState, useRef } from 'react';
import Board from './components/Board';
import './style.css';
import { getValidMoves, countStones } from './logic/game';
import { AI_CONFIG, TIMING_CONFIG } from './ai/config';
import { useCpuWorker } from './hooks/useCpuWorker';
import { useOnlineGame } from './hooks/useOnlineGame';
import type { Cell } from './types';

const DEFAULT_CPU_DELAY_MS = TIMING_CONFIG.cpuDelayMs;

const SIZE = 8;

interface FlipAnim {
  x: number;
  y: number;
  delay: number;
}

interface BoardAnimation {
  placed?: { x: number; y: number };
  flips: FlipAnim[];
}

type Mode =
  | 'title'
  | 'cpu-select'
  | 'cpu'
  | 'pvp'
  | 'online-select'
  | 'online'
  | 'cpu-cpu-select'
  | 'cpu-cpu'
  | 'cpu-cpu-result';

function App() {
  const createInitialBoard = (): Cell[][] => {
    const b: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0 as Cell));
    b[3][3] = 2; b[3][4] = 1;
    b[4][3] = 1; b[4][4] = 2;
    return b;
  };

  const { calculateMove } = useCpuWorker();
  const [mode, setMode] = useState<Mode>('title');
  // const [cpuLevel, setCpuLevel] = useState<number>(1);
  const [cpuLevel, setCpuLevel] = useState<keyof typeof AI_CONFIG>(1);
  const [playerColor, setPlayerColor] = useState<'black' | 'white' | 'random'>('black');
  const [actualPlayerColor, setActualPlayerColor] = useState<1 | 2>(1);
  // CPU vs CPU settings
  const [cpu1Level, setCpu1Level] = useState<keyof typeof AI_CONFIG>(1);
  const [cpu2Level, setCpu2Level] = useState<keyof typeof AI_CONFIG>(2);
  const [cpu1Color, setCpu1Color] = useState<'black' | 'white'>('black');
  const [cpuDelay, setCpuDelay] = useState(TIMING_CONFIG.cpuDelayMs);
  const [numMatches, setNumMatches] = useState(1);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [cpu1ActualColor, setCpu1ActualColor] = useState<1 | 2>(1);
  const {
    state: onlineState,
    connect: connectOnline,
    sendMove: sendOnlineMove,
    disconnect: disconnectOnline,
    reconnect: reconnectOnline,
    giveUp: giveUpOnline,
  } = useOnlineGame();
  const [passKey, setPassKey] = useState('');
  const cpuCpuCancelRef = useRef(false);
  const cpuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stats, setStats] = useState({
    games: 0,
    blackWins: 0,
    whiteWins: 0,
    blackScoreTotal: 0,
    whiteScoreTotal: 0,
    blackTimeTotal: 0,
    whiteTimeTotal: 0,
    blackMoveCount: 0,
    whiteMoveCount: 0,
    turnTotal: 0,
  });
  const [board, setBoard] = useState<Cell[][]>(createInitialBoard);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number; flips: [number, number][] }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [cpuThinking, setCpuThinking] = useState(false);
  const randomRef = useRef<boolean>(false);
  const prevOnlineBoardRef = useRef<Cell[][]>([]);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animations, setAnimations] = useState<BoardAnimation>({ placed: undefined, flips: [] });
  const [animating, setAnimating] = useState(false);

  const startAnimation = (
    placed: { x: number; y: number },
    flipsRaw: [number, number][]
  ) => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
      setAnimations({ placed: undefined, flips: [] });
    }
    setValidMoves([]); // hide hints during animation
    const flips = flipsRaw
      .map(([fx, fy]) => ({ x: fx, y: fy, dist: Math.abs(fx - placed.x) + Math.abs(fy - placed.y) }))
      .sort((a, b) => a.dist - b.dist)
      .map((c, idx) => ({ x: c.x, y: c.y, delay: idx * 100 }));
    setAnimations({ placed, flips });
    setAnimating(true);
    animTimerRef.current = setTimeout(() => {
      setAnimations({ placed: undefined, flips: [] });
      setAnimating(false);
      animTimerRef.current = null;
    }, flips.length * 100 + 400);
  };

  const resolvePlayerColor = () => {
    return playerColor === 'random'
      ? (Math.random() < 0.5 ? 1 : 2)
      : (playerColor === 'black' ? 1 : 2);
  };

  useEffect(() => {
    if (mode === 'cpu') {
      TIMING_CONFIG.cpuDelayMs = DEFAULT_CPU_DELAY_MS;
      const resolved = resolvePlayerColor();
      setActualPlayerColor(resolved);
      randomRef.current = playerColor === 'random';
      setBoard(createInitialBoard());
      setTurn(1);
      setGameOver(false);
      setMessage('黒の番です');
    } else if (mode === 'pvp') {
      setBoard(createInitialBoard());
      setTurn(1);
      setGameOver(false);
      setMessage('黒の番です');
    } else if (mode === 'cpu-cpu') {
      TIMING_CONFIG.cpuDelayMs = cpuDelay;
      setCpu1ActualColor(cpu1Color === 'black' ? 1 : 2);
      setBoard(createInitialBoard());
      setTurn(1);
      setGameOver(false);
      cpuCpuCancelRef.current = false;
      if (cpuTimeoutRef.current) {
        clearTimeout(cpuTimeoutRef.current);
        cpuTimeoutRef.current = null;
      }
      setStats({
        games: 0,
        blackWins: 0,
        whiteWins: 0,
        blackScoreTotal: 0,
        whiteScoreTotal: 0,
        blackTimeTotal: 0,
        whiteTimeTotal: 0,
        blackMoveCount: 0,
        whiteMoveCount: 0,
        turnTotal: 0,
      });
      setCurrentMatch(1);
      setMessage('対戦開始');
    } else if (mode === 'online') {
      const initial = onlineState.board.length ? onlineState.board : createInitialBoard();
      setBoard(initial);
      prevOnlineBoardRef.current = initial.map(row => [...row]);
      setTurn(onlineState.turn);
      setGameOver(onlineState.gameOver);
      if (onlineState.waiting) {
        setMessage('対戦相手を待っています...');
      } else {
        setMessage(onlineState.myColor === onlineState.turn ? 'あなたの番です' : '相手の番です');
      }
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'online') return;
    const newBoard = onlineState.board.length ? onlineState.board : createInitialBoard();
    if (prevOnlineBoardRef.current.length === SIZE && newBoard.length === SIZE) {
      const lastTurn = 3 - onlineState.turn as 1 | 2;
      let placed: { x: number; y: number } | null = null;
      const flips: [number, number][] = [];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const prev = prevOnlineBoardRef.current[y][x];
          const cur = newBoard[y][x];
          if (prev !== cur) {
            if (prev === 0 && cur === lastTurn) {
              placed = { x, y };
            } else if (cur === lastTurn) {
              flips.push([x, y]);
            }
          }
        }
      }
      if (placed) startAnimation(placed, flips);
    }
    setBoard(newBoard);
    prevOnlineBoardRef.current = newBoard.map(row => [...row]);
    setTurn(onlineState.turn);
    setGameOver(onlineState.gameOver);
    if (onlineState.waiting) {
      setMessage('対戦相手を待っています...');
    } else if (onlineState.surrendered === 'me') {
      setMessage('あなたの負け (降参)');
    } else if (onlineState.surrendered === 'opponent') {
      setMessage('相手が降参しました あなたの勝ち！');
    } else if (onlineState.gameOver) {
      const { black, white } = countStones(onlineState.board);
      setMessage(`ゲーム終了！ 黒:${black} 白:${white} → ${black === white ? '引き分け' : black > white ? '黒の勝ち！' : '白の勝ち！'}`);
    } else {
      setMessage(onlineState.myColor === onlineState.turn ? 'あなたの番です' : '相手の番です');
    }
  }, [onlineState, mode]);

  useEffect(() => {
    if (gameOver) return;

    if (mode === 'online') {
      setValidMoves(onlineState.validMoves);
      return;
    }

    if (mode !== 'pvp' && mode !== 'cpu' && mode !== 'cpu-cpu') return;
    const moves = getValidMoves(turn, board);
    if (moves.length === 0) {
      const opponentMoves = getValidMoves(3 - turn as 1 | 2, board);
      if (opponentMoves.length === 0) {
        const { black, white } = countStones(board);
        setMessage(`ゲーム終了！ 黒:${black} 白:${white} → ${black === white ? "引き分け" : black > white ? "黒の勝ち！" : "白の勝ち！"}`);
        setGameOver(true);
        setValidMoves([]);
        if (mode === 'cpu-cpu') {
          finishCpuCpuGame(black, white);
        }
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
  }, [turn, board, gameOver, mode, actualPlayerColor, onlineState.validMoves]);

  useEffect(() => {
    if ((mode !== 'cpu' && mode !== 'cpu-cpu') || gameOver || cpuThinking || animating) return;
    if (mode === 'cpu' && turn !== (3 - actualPlayerColor)) return;
    const moves = getValidMoves(turn, board);
    if (moves.length === 0) return;

    setMessage("CPU思考中...");
    setCpuThinking(true);
    const level = mode === 'cpu' ? cpuLevel : (turn === cpu1ActualColor ? cpu1Level : cpu2Level);
    const start = performance.now();
    const thinking = calculateMove({ board, turn, level }).then(move => ({ move, elapsed: performance.now() - start }));

    cpuTimeoutRef.current = setTimeout(async () => {
      const { move, elapsed } = await thinking;
      if (cpuCpuCancelRef.current) {
        setCpuThinking(false);
        cpuTimeoutRef.current = null;
        return;
      }
      if (!move) return;
      const newBoard = board.map(row => [...row]);
      newBoard[move.y][move.x] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[fy][fx] = turn);
      setBoard(newBoard);

      startAnimation({ x: move.x, y: move.y }, move.flips);
      if (mode === 'cpu-cpu') {
        if (turn === 1) {
          setStats(s => ({ ...s, blackTimeTotal: s.blackTimeTotal + elapsed, blackMoveCount: s.blackMoveCount + 1, turnTotal: s.turnTotal + 1 }));
        } else {
          setStats(s => ({ ...s, whiteTimeTotal: s.whiteTimeTotal + elapsed, whiteMoveCount: s.whiteMoveCount + 1, turnTotal: s.turnTotal + 1 }));
        }
      }
      setTurn(3 - turn as 1 | 2);
      setCpuThinking(false);
      cpuTimeoutRef.current = null;
    }, TIMING_CONFIG.cpuDelayMs);
  }, [turn, board, mode, gameOver, cpuLevel, cpu1Level, cpu2Level, actualPlayerColor, cpu1ActualColor, cpuThinking, animating]);

  const handleClick = (x: number, y: number) => {
    if (gameOver || animating) return;
    if (mode === 'online') {
      if (turn !== onlineState.myColor) return;
      const move = onlineState.validMoves.find(m => m.x === x && m.y === y);
      if (!move) return;
      const newBoard = board.map(row => [...row]);
      newBoard[y][x] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[fy][fx] = turn);
      setBoard(newBoard);
      prevOnlineBoardRef.current = newBoard.map(row => [...row]);
      startAnimation({ x, y }, move.flips);
      setTurn(3 - turn as 1 | 2);
      sendOnlineMove(x, y);
      return;
    }
    const isPlayerTurn = mode === 'pvp' || (mode === 'cpu' && turn === actualPlayerColor);
    if (isPlayerTurn) {
      const moves = getValidMoves(turn, board);
      const move = moves.find(m => m.x === x && m.y === y);
      if (!move) return;
      const newBoard = board.map(row => [...row]);
      newBoard[y][x] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[fy][fx] = turn);
      setBoard(newBoard);

      startAnimation({ x, y }, move.flips);

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

  const abortCpuCpu = (next: Mode = 'cpu-cpu-result') => {
    cpuCpuCancelRef.current = true;
    if (cpuTimeoutRef.current) {
      clearTimeout(cpuTimeoutRef.current);
      cpuTimeoutRef.current = null;
    }
    setCpuThinking(false);
    setGameOver(true);
    setCurrentMatch(numMatches);
    setMode(next);
  };

  const finishCpuCpuGame = (black: number, white: number) => {
    setStats(s => ({
      ...s,
      games: s.games + 1,
      blackWins: s.blackWins + (black > white ? 1 : 0),
      whiteWins: s.whiteWins + (white > black ? 1 : 0),
      blackScoreTotal: s.blackScoreTotal + black,
      whiteScoreTotal: s.whiteScoreTotal + white,
    }));
    if (cpuTimeoutRef.current) {
      clearTimeout(cpuTimeoutRef.current);
      cpuTimeoutRef.current = null;
    }
    if (currentMatch >= numMatches) {
      setMode('cpu-cpu-result');
    } else {
      setCurrentMatch(c => c + 1);
      setTimeout(() => {
        setBoard(createInitialBoard());
        setTurn(1);
        setGameOver(false);
      }, TIMING_CONFIG.cpuDelayMs);
    }
  };

  if (mode === 'title') {
    return (
      <div>
        <h1>オセロ</h1>
        <div id="mode-selection">
          <h2>モードを選択してください</h2>
          <div className="mode-buttons">
            <button onClick={() => setMode('cpu-select')}>CPU対戦</button>
            <button onClick={() => setMode('cpu-cpu-select')}>CPU vs CPU</button>
            <button onClick={() => setMode('pvp')}>2人対戦</button>
            <button onClick={() => setMode('online-select')}>オンライン対戦</button>
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
              onChange={(e) => setCpuLevel(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            >
              {Object.entries(AI_CONFIG).map(([key, cfg]) =>
                cfg.visible ? (
                  <option key={key} value={Number(key)}>
                    {cfg.name}
                  </option>
                ) : null
              )}
            </select>
          </label>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
            {AI_CONFIG[cpuLevel]?.comment}
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

  if (mode === 'cpu-cpu-select') {
    return (
      <div>
        <h1>CPU vs CPU 設定</h1>
        <div>
          <label>
            CPU1 レベル：
            <select
              value={cpu1Level}
              onChange={(e) => setCpu1Level(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            >
              {Object.entries(AI_CONFIG).map(([key, cfg]) =>
                cfg.visible ? (
                  <option key={key} value={Number(key)}>
                    {cfg.name}
                  </option>
                ) : null
              )}
            </select>
          </label>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
            {AI_CONFIG[cpu1Level]?.comment}
          </div>
          <div style={{ marginTop: 8 }}>
            CPU2 レベル：
            <select
              value={cpu2Level}
              onChange={(e) => setCpu2Level(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            >
              {Object.entries(AI_CONFIG).map(([key, cfg]) =>
                cfg.visible ? (
                  <option key={key} value={Number(key)}>
                    {cfg.name}
                  </option>
                ) : null
              )}
            </select>
            <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
              {AI_CONFIG[cpu2Level]?.comment}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              CPU1の色：
              <select
                value={cpu1Color}
                onChange={(e) => setCpu1Color(e.target.value as 'black' | 'white')}
                style={{ marginLeft: 8 }}
              >
                <option value="black">黒</option>
                <option value="white">白</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              待ち時間(ms)：
              <input
                type="number"
                min={0}
                value={cpuDelay}
                onChange={(e) => setCpuDelay(Number(e.target.value))}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              対戦回数：
              <input
                type="number"
                min={1}
                value={numMatches}
                onChange={(e) => setNumMatches(Number(e.target.value))}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setMode('cpu-cpu')}>開始</button>
            <button onClick={() => setMode('title')} style={{ marginLeft: 8 }}>戻る</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'online-select') {
    return (
      <div>
        <h1>オンライン対戦</h1>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              connectOnline('open');
              setMode('online');
            }}
          >
            誰とでも対戦
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <input
            value={passKey}
            onChange={(e) => setPassKey(e.target.value)}
            placeholder="合言葉"
          />
          <button
            onClick={() => {
              connectOnline('pass', passKey);
              setMode('online');
            }}
            style={{ marginLeft: 8 }}
          >
            合言葉で対戦
          </button>
        </div>
        <button onClick={() => setMode('title')} style={{ marginTop: 16 }}>戻る</button>
      </div>
    );
  }

  if (mode === 'cpu-cpu-result') {
    const cpuNames = `${AI_CONFIG[cpu1Level]?.name} vs ${AI_CONFIG[cpu2Level]?.name}`;
    const summary = `CPU対CPU対戦結果（${stats.games}戦）  ${new Date().toLocaleString()}
${cpuNames}
AI1（${cpu1ActualColor === 1 ? '黒' : '白'}）: ${AI_CONFIG[cpu1Level]?.name}
AI2（${cpu1ActualColor === 1 ? '白' : '黒'}）: ${AI_CONFIG[cpu2Level]?.name}

勝敗: 黒 ${stats.blackWins}勝 / 白 ${stats.whiteWins}勝
平均黒スコア: ${(stats.blackScoreTotal / stats.games).toFixed(1)} / 平均白スコア: ${(stats.whiteScoreTotal / stats.games).toFixed(1)}
黒の平均応答時間: ${(stats.blackTimeTotal / stats.blackMoveCount || 0).toFixed(1)}ms
白の平均応答時間: ${(stats.whiteTimeTotal / stats.whiteMoveCount || 0).toFixed(1)}ms
平均ターン数: ${(stats.turnTotal / stats.games).toFixed(1)}
黒の勝率: ${((stats.blackWins / stats.games) * 100).toFixed(0)}%`;

    const download = () => {
      if (!window.confirm('結果をダウンロードしますか？')) return;

      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `cvc_result_${timestamp}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div>
        <h1>結果</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{summary}</pre>
        <button onClick={download}>結果をダウンロード</button>
        <button onClick={() => setMode('cpu-cpu-select')} style={{ marginLeft: 8 }}>
          設定に戻る
        </button>
        <button onClick={() => setMode('title')} style={{ marginLeft: 8 }}>
          タイトルに戻る
        </button>
      </div>
    );
  }

  if (mode === 'online' && onlineState.waiting) {
    return (
      <div>
        <h1>マッチング中...</h1>
        <p>対戦相手を待っています</p>
        <button
          onClick={() => {
            disconnectOnline(true);
            setMode('online-select');
          }}
        >
          キャンセル
        </button>
      </div>
    );
  }

  if (mode === 'cpu' || mode === 'pvp' || mode === 'cpu-cpu' || mode === 'online') {
    const { black: blackCount, white: whiteCount } = countStones(board);
    return (
      <div>
        <h1>オセロ</h1>
        <p style={{ fontWeight: 'bold' }}>
          {mode === 'online'
            ? 'オンライン対戦'
            : mode === 'pvp'
            ? '2人対戦'
            : mode === 'cpu'
            ? `VS CPU（${AI_CONFIG[cpuLevel]?.name}）`
            : `CPU vs CPU ${currentMatch}/${numMatches}（${AI_CONFIG[cpu1Level]?.name} vs ${AI_CONFIG[cpu2Level]?.name}）`}
        </p>
        <Board
          board={board}
          validMoves={gameOver ? [] : validMoves}
          onCellClick={handleClick}
          animations={animations}
          disabled={animating}
        />
        <p id="score-board">黒:{blackCount} 白:{whiteCount}</p>
        <p>{message}</p>
        {mode === 'online' && !gameOver && (
          <button onClick={giveUpOnline}>降参</button>
        )}
        {(mode !== 'online' || gameOver) && (
          <button
            onClick={() => {
              if (mode === 'cpu-cpu') {
                abortCpuCpu('title');
              } else if (mode === 'online') {
                disconnectOnline(true);
                setMode('title');
              } else {
                setMode('title');
              }
            }}>
           タイトルに戻る
          </button>
        )}
        {(mode === 'cpu' || mode === 'pvp') && gameOver && (
          <button onClick={restartGame} style={{ marginLeft: 8 }}>
            再戦する
          </button>
        )}
        {mode === 'online' && gameOver && (
          <button onClick={reconnectOnline} style={{ marginLeft: 8 }}>
            再戦する
          </button>
        )}
        {mode === 'cpu-cpu' && (
          <button onClick={() => abortCpuCpu()} style={{ marginLeft: 8 }}>
            中止
          </button>
        )}
      </div>
    );
  }

  return null;
}

export default App;
