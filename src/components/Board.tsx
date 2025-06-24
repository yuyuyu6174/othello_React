import type { FC } from 'react';
import type { Board as BoardState } from '../types';

interface FlipAnim {
  x: number;
  y: number;
  delay: number;
  prev: 1 | 2;
}

interface BoardAnimation {
  placed?: { x: number; y: number };
  flips: FlipAnim[];
}

interface BoardProps {
  board: BoardState;
  validMoves: { x: number; y: number }[];
  onCellClick: (x: number, y: number) => void;
  animations?: BoardAnimation;
  disabled?: boolean;
}

const BoardComponent: FC<BoardProps> = ({ board, validMoves, onCellClick, animations, disabled }) => {
  return (
    <table id="board" style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
      <tbody>
        {Array.from({ length: 8 }).map((_, y) => (
          <tr key={y}>
            {Array.from({ length: 8 }).map((_, x) => {
              const cell = board[y * 8 + x];
              const isHint = validMoves.some(m => m.x === x && m.y === y);
              const isPlaced = animations?.placed && animations.placed.x === x && animations.placed.y === y;
              const flip = animations?.flips.find(f => f.x === x && f.y === y);
              return (
                <td
                  key={x}
                  onClick={() => onCellClick(x, y)}
                  className={isHint ? 'hint' : ''}
                >
                  {cell === 1 && (
                    <div
                      className={`piece black${isPlaced ? ' pop' : ''}${flip ? ' flip from-' + (flip.prev === 1 ? 'black' : 'white') : ''}`}
                      style={flip ? { animationDelay: `${flip.delay}ms` } : undefined}
                    />
                  )}
                  {cell === 2 && (
                    <div
                      className={`piece white${isPlaced ? ' pop' : ''}${flip ? ' flip from-' + (flip.prev === 1 ? 'black' : 'white') : ''}`}
                      style={flip ? { animationDelay: `${flip.delay}ms` } : undefined}
                    />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default BoardComponent;
