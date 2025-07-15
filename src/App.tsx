import { useEffect, useState, useRef } from 'react';
import BoardComponent from './components/Board';
import SettingsMenu from './components/SettingsMenu';
import './style.css';
import { getValidMoves, countStones, index } from './logic/game';
import { AI_CONFIG, TIMING_CONFIG } from './ai/config';
import { useCpuWorker } from './hooks/useCpuWorker';
import { useOnlineGame } from './hooks/useOnlineGame';
import { useTranslation } from 'react-i18next';
import type { Board as BoardState } from './types';

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
  const { t } = useTranslation();
  const createInitialBoard = (): BoardState => {
    const b = new Uint8Array(SIZE * SIZE) as BoardState;
    b[index(3,3)] = 2; b[index(4,3)] = 1;
    b[index(3,4)] = 1; b[index(4,4)] = 2;
    return b;
  };

  const { calculateMove, reset, abort } = useCpuWorker();
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
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number; flips: [number, number][] }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [cpuThinking, setCpuThinking] = useState(false);
  const randomRef = useRef<boolean>(false);
  const prevOnlineBoardRef = useRef<BoardState>(new Uint8Array());
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animEndRef = useRef(Date.now());
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
    const duration = flips.length * 100 + 400;
    animEndRef.current = Date.now() + duration;
    animTimerRef.current = setTimeout(() => {
      setAnimations({ placed: undefined, flips: [] });
      setAnimating(false);
      animTimerRef.current = null;
    }, duration);
  };

  const resolvePlayerColor = () => {
    return playerColor === 'random'
      ? (Math.random() < 0.5 ? 1 : 2)
      : (playerColor === 'black' ? 1 : 2);
  };

  useEffect(() => {
    if (mode === 'cpu') {
      reset();
      cpuCpuCancelRef.current = false;
      TIMING_CONFIG.cpuDelayMs = DEFAULT_CPU_DELAY_MS;
      const resolved = resolvePlayerColor();
      setActualPlayerColor(resolved);
      randomRef.current = playerColor === 'random';
      setBoard(createInitialBoard());
      setTurn(1);
      setGameOver(false);
      setMessage(t('blackTurn'));
    } else if (mode === 'pvp') {
      setBoard(createInitialBoard());
      setTurn(1);
      setGameOver(false);
      setMessage(t('blackTurn'));
    } else if (mode === 'cpu-cpu') {
      reset();
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
      setMessage(t('matchStart'));
    } else if (mode === 'online') {
      const initial = onlineState.board.length ? onlineState.board : createInitialBoard();
      setBoard(initial);
      prevOnlineBoardRef.current = initial.slice();
      setTurn(onlineState.turn);
      setGameOver(onlineState.gameOver);
      if (onlineState.waiting) {
        setMessage(t('waitingOpponent') + '...');
      } else {
        setMessage(t(onlineState.myColor === onlineState.turn ? 'yourTurn' : 'opponentTurn'));
      }
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      if (mode === 'cpu') {
        abortCpu();
      }
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'online') return;
    const newBoard = onlineState.board.length ? onlineState.board : createInitialBoard();
    if (prevOnlineBoardRef.current.length === SIZE * SIZE && newBoard.length === SIZE * SIZE) {
      const lastTurn = 3 - onlineState.turn as 1 | 2;
      let placed: { x: number; y: number } | null = null;
      const flips: [number, number][] = [];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const prev = prevOnlineBoardRef.current[index(x, y)];
          const cur = newBoard[index(x, y)];
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
    prevOnlineBoardRef.current = newBoard.slice();
    setTurn(onlineState.turn);
    setGameOver(onlineState.gameOver);
    if (onlineState.waiting) {
      setMessage(t('waitingOpponent') + '...');
    } else if (onlineState.surrendered === 'me') {
      setMessage(t('youLoseSurrender'));
    } else if (onlineState.surrendered === 'opponent') {
      setMessage(t('opponentSurrendered'));
    } else if (onlineState.gameOver) {
      const { black, white } = countStones(onlineState.board);
      const result =
        black === white ? t('draw') : black > white ? t('blackWin') : t('whiteWin');
      setMessage(t('gameOver', { black, white, result }));
    } else {
      setMessage(t(onlineState.myColor === onlineState.turn ? 'yourTurn' : 'opponentTurn'));
    }
  }, [onlineState, mode]);

  useEffect(() => {
    if (gameOver) return;

    if (animating) {
      setValidMoves([]);
      return;
    }

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
        const result =
          black === white ? t('draw') : black > white ? t('blackWin') : t('whiteWin');
        setMessage(t('gameOver', { black, white, result }));
        setGameOver(true);
        setValidMoves([]);
        if (mode === 'cpu-cpu') {
          finishCpuCpuGame(black, white);
        }
      } else {
        setMessage(t('cannotMove', { color: t(turn === 1 ? 'black' : 'white') }));
        animEndRef.current = Date.now();
        setTurn(3 - turn as 1 | 2);
      }
    } else {
      setValidMoves(moves);
      if (mode === 'pvp' || (mode === 'cpu' && turn === actualPlayerColor)) {
        setMessage(t(turn === 1 ? 'blackTurn' : 'whiteTurn'));
      }
    }
  }, [turn, board, gameOver, mode, actualPlayerColor, onlineState.validMoves, animating]);

  useEffect(() => {
    if ((mode !== 'cpu' && mode !== 'cpu-cpu') || gameOver || cpuThinking) return;
    if (mode === 'cpu' && turn !== (3 - actualPlayerColor)) return;
    const moves = getValidMoves(turn, board);
    if (moves.length === 0) return;

    setMessage(t('cpuThinking'));
    setCpuThinking(true);
    const level = mode === 'cpu' ? cpuLevel : (turn === cpu1ActualColor ? cpu1Level : cpu2Level);
    const start = performance.now();
    const thinking = calculateMove({ board, turn, level }).then(move => ({ move, elapsed: performance.now() - start }));

    const delay = Math.max(0, animEndRef.current - Date.now()) + TIMING_CONFIG.cpuDelayMs;
    cpuTimeoutRef.current = setTimeout(async () => {
      const { move, elapsed } = await thinking;
      if (cpuCpuCancelRef.current) {
        setCpuThinking(false);
        cpuTimeoutRef.current = null;
        return;
      }
      if (!move) return;
      const newBoard = board.slice();
      newBoard[index(move.x, move.y)] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[index(fx, fy)] = turn);
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
    }, delay);
  }, [turn, board, mode, gameOver, cpuLevel, cpu1Level, cpu2Level, actualPlayerColor, cpu1ActualColor, cpuThinking]);

  const handleClick = (x: number, y: number) => {
    if (gameOver || animating) return;
    if (mode === 'online') {
      if (turn !== onlineState.myColor) return;
      const move = onlineState.validMoves.find(m => m.x === x && m.y === y);
      if (!move) return;
      const newBoard = board.slice();
      newBoard[index(x, y)] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[index(fx, fy)] = turn);
      setBoard(newBoard);
      prevOnlineBoardRef.current = newBoard.slice();
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
      const newBoard = board.slice();
      newBoard[index(x, y)] = turn;
      move.flips.forEach(([fx, fy]) => newBoard[index(fx, fy)] = turn);
      setBoard(newBoard);

      startAnimation({ x, y }, move.flips);

      setTurn(3 - turn as 1 | 2);
    }
  };

  const restartGame = () => {
    reset();
    const resolved = randomRef.current ? resolvePlayerColor() : (playerColor === 'black' ? 1 : 2);
    setActualPlayerColor(resolved);
    const firstTurn = 1;
    setBoard(createInitialBoard());
    setTurn(firstTurn);
    setGameOver(false);
    animEndRef.current = Date.now();
    setMessage(t(firstTurn === 1 ? 'blackTurn' : 'whiteTurn'));
  };

  const initBoard = () => {
    setBoard(createInitialBoard());
    setTurn(1);
    setGameOver(false);
  };

  const abortCpu = () => {
    if (cpuTimeoutRef.current) {
      clearTimeout(cpuTimeoutRef.current);
      cpuTimeoutRef.current = null;
    }
    abort();
    reset();
    setCpuThinking(false);
  };

  const abortCpuCpu = (next: Mode = 'cpu-cpu-result') => {
    cpuCpuCancelRef.current = true;
    if (cpuTimeoutRef.current) {
      clearTimeout(cpuTimeoutRef.current);
      cpuTimeoutRef.current = null;
    }
    abort();
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
        abort();
        reset();
        setBoard(createInitialBoard());
        setTurn(1);
        setGameOver(false);
      }, TIMING_CONFIG.cpuDelayMs);
    }
  };

  if (mode === 'title') {
    return (
      <div>
        <SettingsMenu />
        <h1>{t('title')}</h1>
        <div id="mode-selection">
          <h2>{t('selectMode')}</h2>
          <div className="mode-buttons">
            <button onClick={() => setMode('cpu-select')}>{t('cpuMatch')}</button>
            <button onClick={() => setMode('cpu-cpu-select')}>{t('cpuVsCpu')}</button>
            <button onClick={() => setMode('pvp')}>{t('twoPlayers')}</button>
            <button onClick={() => setMode('online-select')}>{t('onlineMatch')}</button>
          </div>
        </div>
        <p id="build-time">
          {t('buildTime')}: {new Date(__BUILD_TIME__).toLocaleString()}
        </p>
      </div>
    );
  }

  if (mode === 'cpu-select') {
    return (
      <div>
        <SettingsMenu />
        <h1>{t('cpuMatchSettings')}</h1>
        <div>
          <label>
            {t('cpuLevel')}:
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
              {t('yourColor')}:
              <select
                value={playerColor}
                onChange={(e) => setPlayerColor(e.target.value as 'black' | 'white' | 'random')}
                style={{ marginLeft: 8 }}
              >
                <option value="black">{t('blackFirst')}</option>
                <option value="white">{t('whiteSecond')}</option>
                <option value="random">{t('random')}</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => {
                initBoard();
                setMode('cpu');
              }}
            >
              {t('start')}
            </button>
            <button onClick={() => setMode('title')} style={{ marginLeft: 8 }}>{t('back')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'cpu-cpu-select') {
    return (
      <div>
        <SettingsMenu />
        <h1>{t('cpuVsCpuSettings')}</h1>
        <div>
          <label>
            {t('cpu1Level')}:
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
            {t('cpu2Level')}:
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
              {t('cpu1Color')}:
              <select
                value={cpu1Color}
                onChange={(e) => setCpu1Color(e.target.value as 'black' | 'white')}
                style={{ marginLeft: 8 }}
              >
                <option value="black">{t('black')}</option>
                <option value="white">{t('white')}</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              {t('delayMs')}:
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
              {t('matches')}:
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
            <button
              onClick={() => {
                initBoard();
                setMode('cpu-cpu');
              }}
            >
              {t('start')}
            </button>
            <button onClick={() => setMode('title')} style={{ marginLeft: 8 }}>{t('back')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'online-select') {
    return (
      <div>
        <SettingsMenu />
        <h1>{t('onlineMatch')}</h1>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              connectOnline('open');
              setMode('online');
            }}
          >
            {t('playAnyone')}
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <input
            value={passKey}
            onChange={(e) => setPassKey(e.target.value)}
            placeholder={t('passcode')}
          />
          <button
            onClick={() => {
              connectOnline('pass', passKey);
              setMode('online');
            }}
            style={{ marginLeft: 8 }}
          >
            {t('matchWithPasscode')}
          </button>
        </div>
        <button onClick={() => setMode('title')} style={{ marginTop: 16 }}>{t('back')}</button>
      </div>
    );
  }

  if (mode === 'cpu-cpu-result') {
    const cpuNames = `${AI_CONFIG[cpu1Level]?.name} vs ${AI_CONFIG[cpu2Level]?.name}`;
    const summary = t('cpuVsCpuSummary', {
      games: stats.games,
      date: new Date().toLocaleString(),
      cpuNames,
      color1: t(cpu1ActualColor === 1 ? 'black' : 'white'),
      name1: AI_CONFIG[cpu1Level]?.name,
      color2: t(cpu1ActualColor === 1 ? 'white' : 'black'),
      name2: AI_CONFIG[cpu2Level]?.name,
      blackWins: stats.blackWins,
      whiteWins: stats.whiteWins,
      avgBlackScore: (stats.blackScoreTotal / stats.games).toFixed(1),
      avgWhiteScore: (stats.whiteScoreTotal / stats.games).toFixed(1),
      avgBlackTime: (stats.blackTimeTotal / stats.blackMoveCount || 0).toFixed(1),
      avgWhiteTime: (stats.whiteTimeTotal / stats.whiteMoveCount || 0).toFixed(1),
      avgTurns: (stats.turnTotal / stats.games).toFixed(1),
      blackRate: ((stats.blackWins / stats.games) * 100).toFixed(0),
    });

    const download = () => {
      if (!window.confirm(t('confirmDownload'))) return;

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
        <SettingsMenu />
        <h1>{t('results')}</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{summary}</pre>
        <button onClick={download}>{t('downloadResults')}</button>
        <button onClick={() => setMode('cpu-cpu-select')} style={{ marginLeft: 8 }}>
          {t('back')}
        </button>
        <button onClick={() => setMode('title')} style={{ marginLeft: 8 }}>
          {t('back')}
        </button>
      </div>
    );
  }

  if (mode === 'online' && onlineState.waiting) {
    return (
      <div>
        <SettingsMenu />
        <h1>{t('matching')}</h1>
        <p>{t('waitingOpponent')}</p>
        <button
          onClick={() => {
            disconnectOnline(true);
            setMode('online-select');
          }}
        >
          {t('back')}
        </button>
      </div>
    );
  }

  if (mode === 'cpu' || mode === 'pvp' || mode === 'cpu-cpu' || mode === 'online') {
    const { black: blackCount, white: whiteCount } = countStones(board);
    return (
      <div>
        <SettingsMenu />
        <h1>{t('title')}</h1>
        <p style={{ fontWeight: 'bold' }}>
          {mode === 'online'
            ? t('onlineMatch')
            : mode === 'pvp'
            ? t('twoPlayers')
            : mode === 'cpu'
            ? t('vsCpu', { name: AI_CONFIG[cpuLevel]?.name })
            : t('cpuVsCpuProgress', {
                current: currentMatch,
                total: numMatches,
                name1: AI_CONFIG[cpu1Level]?.name,
                name2: AI_CONFIG[cpu2Level]?.name,
              })}
        </p>
        <BoardComponent
          board={board}
          validMoves={gameOver ? [] : validMoves}
          onCellClick={handleClick}
          animations={animations}
          disabled={animating}
        />
        <p id="score-board">{t('score', { black: blackCount, white: whiteCount })}</p>
        <p>{message}</p>
        {mode === 'online' && !gameOver && (
          <button onClick={giveUpOnline}>{t('giveup')}</button>
        )}
        {(mode !== 'online' || gameOver) && (
          <button
            onClick={() => {
              if (mode === 'cpu-cpu') {
                abortCpuCpu('title');
              } else if (mode === 'online') {
                disconnectOnline(true);
                setMode('title');
              } else if (mode === 'cpu') {
                abortCpu();
                setMode('title');
              } else {
                setMode('title');
              }
            }}>
           {t('back')}
          </button>
        )}
        {(mode === 'cpu' || mode === 'pvp') && gameOver && (
          <button onClick={restartGame} style={{ marginLeft: 8 }}>
            {t('resume')}
          </button>
        )}
        {mode === 'online' && gameOver && (
          <button onClick={reconnectOnline} style={{ marginLeft: 8 }}>
            {t('resume')}
          </button>
        )}
        {mode === 'cpu-cpu' && (
          <button onClick={() => abortCpuCpu()} style={{ marginLeft: 8 }}>
            {t('stop')}
          </button>
        )}
      </div>
    );
  }

  return null;
}

export default App;
