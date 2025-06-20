import { useEffect, useRef, useState } from 'react';
import { getValidMoves } from '../logic/game';
import type { Cell } from '../types';

export type MatchType = 'open' | 'pass';

export interface OnlineState {
  board: Cell[][];
  turn: 1 | 2;
  myColor: 1 | 2 | null;
  waiting: boolean;
  gameOver: boolean;
  validMoves: { x: number; y: number; flips: [number, number][] }[];
  surrendered: 'me' | 'opponent' | null;
}

const SERVER_URL =
  import.meta.env.VITE_ONLINE_SERVER_URL ??
  'wss://othello-server-11z5.onrender.com/othello';

export function useOnlineGame() {
  const socketRef = useRef<WebSocket | null>(null);
  const lastMatch = useRef<{ type: MatchType; pass?: string } | null>(null);
  const [state, setState] = useState<OnlineState>({
    board: [],
    turn: 1,
    myColor: null,
    waiting: false,
    gameOver: false,
    validMoves: [],
    surrendered: null,
  });
  const [error, setError] = useState<string | null>(null);

  const computeNext = (
    board: Cell[][],
    turn: 1 | 2
  ): { moves: { x: number; y: number; flips: [number, number][] }[]; over: boolean } => {
    if (board.length < 8 || board.some(row => row.length < 8)) {
      // Not a full board yet (e.g. before connection), so avoid checking moves
      return { moves: [], over: false };
    }
    const moves = getValidMoves(turn, board);
    if (moves.length === 0) {
      const opp = getValidMoves(3 - turn as 1 | 2, board);
      if (opp.length === 0) {
        return { moves: [], over: true };
      }
    }
    return { moves, over: false };
  };

  const connect = (type: MatchType, pass?: string) => {
    lastMatch.current = { type, pass };
    setState({
      board: [],
      turn: 1,
      myColor: null,
      waiting: true,
      gameOver: false,
      validMoves: [],
      surrendered: null,
    });
    const ws = new WebSocket(SERVER_URL);
    socketRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', mode: type, key: pass ?? null }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case 'start': {
          const next = computeNext(msg.board, msg.turn);
          setState({
            board: msg.board,
            turn: msg.turn,
            myColor: msg.color,
            waiting: false,
            gameOver: next.over,
            validMoves: next.moves,
            surrendered: null,
          });
          break;
        }
        case 'update': {
          const next = computeNext(msg.board, msg.turn);
          setState(s => ({
            ...s,
            board: msg.board,
            turn: msg.turn,
            gameOver: next.over,
            validMoves: next.moves,
          }));
          break;
        }
        case 'end':
          setState(s => ({
            ...s,
            board: msg.board,
            gameOver: true,
            validMoves: [],
            surrendered: msg.surrendered
              ? msg.surrendered === s.myColor
                ? 'me'
                : 'opponent'
              : s.surrendered,
          }));
          break;
        case 'error':
          setError(msg.message || 'error');
          break;
      }
    };
    ws.onclose = () => {
      setState(s => {
        const next = computeNext(s.board, s.turn);
        return {
          ...s,
          waiting: false,
          gameOver: s.gameOver || next.over,
          validMoves: [],
          surrendered: s.surrendered,
        };
      });
    };
    ws.onerror = () => {
      setError('connection error');
    };
  };

  const sendMove = (x: number, y: number) => {
    const ws = socketRef.current;
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'move', x, y }));
  };

  const giveUp = () => {
    const ws = socketRef.current;
    if (ws) {
      ws.send(JSON.stringify({ type: 'giveup' }));
      ws.close();
    }
    socketRef.current = null;
    setState(s => ({
      ...s,
      waiting: false,
      gameOver: true,
      validMoves: [],
      surrendered: 'me',
    }));
  };

  const disconnect = (reset = false) => {
    socketRef.current?.close();
    socketRef.current = null;
    if (reset) {
      lastMatch.current = null;
      setState({
        board: [],
        turn: 1,
        myColor: null,
        waiting: false,
        gameOver: false,
        validMoves: [],
        surrendered: null,
      });
    } else {
      setState(s => ({
        ...s,
        waiting: false,
        validMoves: [],
      }));
    }
  };

  const reconnect = () => {
    if (lastMatch.current) {
      disconnect();
      connect(lastMatch.current.type, lastMatch.current.pass);
    }
  };

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  return { state, error, connect, sendMove, disconnect, reconnect, giveUp };
}
