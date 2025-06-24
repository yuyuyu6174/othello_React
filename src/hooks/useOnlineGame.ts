import { useEffect, useRef, useState } from 'react';
import { Client, Room } from 'colyseus.js';
import { getValidMoves, SIZE, index } from '../logic/game';
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
  'wss://othello-server-11z5.onrender.com';

export function useOnlineGame() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);
  const ignoreLeaveRef = useRef(false);
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

  const toBoard = (b: number[][]): Board => {
    const arr = new Uint8Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        arr[index(x, y)] = b[y][x];
      }
    }
    return arr;
  };

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

  const connect = async (type: MatchType, pass?: string) => {
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
    setError(null);

    const client = new Client(SERVER_URL);
    clientRef.current = client;

    try {
      const room = await client.joinOrCreate('othello');
      roomRef.current = room;

      room.onMessage('wait', () => {
        setState(s => ({ ...s, waiting: true }));
      });

      room.onMessage('start', (msg: any) => {
        const board = toBoard(msg.board);
        const next = computeNext(board, msg.turn);
        setState({
          board,
          turn: msg.turn,
          myColor: msg.color,
          waiting: false,
          gameOver: next.over,
          validMoves: next.moves,
          surrendered: null,
        });
      });

      room.onMessage('update', (msg: any) => {
        const board = toBoard(msg.board);
        const next = computeNext(board, msg.turn);
        setState(s => ({
          ...s,
          board,
          turn: msg.turn,
          gameOver: next.over,
          validMoves: next.moves,
        }));
      });

      room.onMessage('end', (msg: any) => {
        const board = toBoard(msg.board);
        setState(s => ({
          ...s,
          board,
          gameOver: true,
          validMoves: [],
          surrendered: msg.surrendered
            ? msg.surrendered === s.myColor
              ? 'me'
              : 'opponent'
            : s.surrendered,
        }));
      });

      room.onMessage('error', (msg: any) => {
        setError(msg.message || 'error');
      });

      room.onLeave(() => {
        if (ignoreLeaveRef.current) {
          ignoreLeaveRef.current = false;
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
      });
    } catch (e) {
      setError('connection error');
    }
  };

  const sendMove = (x: number, y: number) => {
    const room = roomRef.current;
    if (!room) return;
    room.send('move', { x, y });
  };

  const giveUp = () => {
    const room = roomRef.current;
    if (room) {
      room.send('giveup');
      ignoreLeaveRef.current = true;
      room.leave();
    }
    roomRef.current = null;
    clientRef.current = null;
    setState(s => ({
      ...s,
      waiting: false,
      gameOver: true,
      validMoves: [],
      surrendered: 'me',
    }));
  };

  const disconnect = (reset = false) => {
    if (roomRef.current) {
      ignoreLeaveRef.current = true;
      roomRef.current.leave();
    }
    roomRef.current = null;
    clientRef.current = null;
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
      if (roomRef.current) {
        ignoreLeaveRef.current = true;
        roomRef.current.leave();
      }
      roomRef.current = null;
      clientRef.current = null;
      connect(lastMatch.current.type, lastMatch.current.pass);
    }
  };

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        ignoreLeaveRef.current = true;
        roomRef.current.leave();
      }
    };
  }, []);

  return { state, error, connect, sendMove, disconnect, reconnect, giveUp };
}
