import { useEffect, useRef, useState } from 'react';
import { getValidMoves, SIZE } from '../logic/game';
import type { Board } from '../types';

export type MatchType = 'open' | 'pass';

export interface OnlineState {
  board: Board;
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
  const ignoreCloseRef = useRef(false);
  const lastMatch = useRef<{ type: MatchType; pass?: string } | null>(null);
  const [state, setState] = useState<OnlineState>({
    board: new Uint8Array(),
    turn: 1,
    myColor: null,
    waiting: false,
    gameOver: false,
    validMoves: [],
    surrendered: null,
  });
  const [error, setError] = useState<string | null>(null);

  const computeNext = (
    board: Board,
    turn: 1 | 2
  ): { moves: { x: number; y: number; flips: [number, number][] }[]; over: boolean } => {
    if (board.length < SIZE * SIZE) {
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
      board: new Uint8Array(),
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
      if (ignoreCloseRef.current) {
        ignoreCloseRef.current = false;
        return;
      }
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
      ignoreCloseRef.current = true;
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
    if (socketRef.current) {
      ignoreCloseRef.current = true;
      socketRef.current.close();
    }
    socketRef.current = null;
    if (reset) {
      lastMatch.current = null;
      setState({
        board: new Uint8Array(),
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
      // Clear board immediately so the previous game isn't visible
      setState({
        board: new Uint8Array(),
        turn: 1,
        myColor: null,
        waiting: true,
        gameOver: false,
        validMoves: [],
        surrendered: null,
      });
      if (socketRef.current) {
        ignoreCloseRef.current = true;
        socketRef.current.close();
      }
      socketRef.current = null;
      connect(lastMatch.current.type, lastMatch.current.pass);
    }
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        ignoreCloseRef.current = true;
        socketRef.current.close();
      }
    };
  }, []);

  return { state, error, connect, sendMove, disconnect, reconnect, giveUp };
}
