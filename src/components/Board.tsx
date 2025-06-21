// import React from 'react';

type Cell = 0 | 1 | 2;

interface FlipAnim {
  x: number;
  y: number;
  delay: number;
}

interface BoardAnimation {
  placed?: { x: number; y: number };
  flips: FlipAnim[];
}

interface BoardProps {
  board: Cell[][];
  validMoves: { x: number; y: number }[];
  onCellClick: (x: number, y: number) => void;
  animations?: BoardAnimation;
  disabled?: boolean;
}

const Board: React.FC<BoardProps> = ({ board, validMoves, onCellClick, animations, disabled }) => {
  return (
    <table id="board" style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
      <tbody>
        {board.map((row, y) => (
          <tr key={y}>
            {row.map((cell, x) => {
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
                      className={`piece black${isPlaced ? ' pop' : ''}${flip ? ' flip' : ''}`}
                      style={flip ? { animationDelay: `${flip.delay}ms` } : undefined}
                    />
                  )}
                  {cell === 2 && (
                    <div
                      className={`piece white${isPlaced ? ' pop' : ''}${flip ? ' flip' : ''}`}
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

export default Board;
