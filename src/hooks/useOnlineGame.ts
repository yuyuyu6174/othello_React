import { useEffect, useRef, useState } from 'react';
import type { Cell } from '../types';

export type MatchType = 'open' | 'pass';

export interface OnlineState {
  board: Cell[][];
  turn: 1 | 2;
  myColor: 1 | 2 | null;
  waiting: boolean;
  gameOver: boolean;
}

const SERVER_URL =
  import.meta.env.VITE_ONLINE_SERVER_URL ??
  'wss://othello-server-11z5.onrender.com/othello';

export function useOnlineGame() {
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<OnlineState>({
    board: [],
    turn: 1,
    myColor: null,
    waiting: false,
    gameOver: false,
  });
  const [error, setError] = useState<string | null>(null);

  const connect = (type: MatchType, pass?: string) => {
    const ws = new WebSocket(SERVER_URL);
    socketRef.current = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({ type: 'join', mode: type, key: pass ?? null })
      );
      setState(s => ({ ...s, waiting: true }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case 'start':
          setState({
            board: msg.board,
            turn: msg.turn,
            myColor: msg.color,
            waiting: false,
            gameOver: false,
          });
          break;
        case 'update':
          setState(s => ({ ...s, board: msg.board, turn: msg.turn }));
          break;
        case 'end':
          setState(s => ({ ...s, board: msg.board, gameOver: true }));
          break;
        case 'error':
          setError(msg.message || 'error');
          break;
      }
    };
    ws.onclose = () => {
      setState(s => ({ ...s, waiting: false }));
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

  const disconnect = () => {
    socketRef.current?.close();
    socketRef.current = null;
    setState(s => ({ ...s, waiting: false }));
  };

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  return { state, error, connect, sendMove, disconnect };
}
