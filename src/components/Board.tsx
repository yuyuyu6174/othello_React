import React from 'react';

type Cell = 0 | 1 | 2;

interface BoardProps {
  board: Cell[][];
  validMoves: { x: number; y: number }[];
  onCellClick: (x: number, y: number) => void;
}

const Board: React.FC<BoardProps> = ({ board, validMoves, onCellClick }) => {
  return (
    <table id="board">
      <tbody>
        {board.map((row, y) => (
          <tr key={y}>
            {row.map((cell, x) => {
              const isHint = validMoves.some(m => m.x === x && m.y === y);
              return (
                <td
                  key={x}
                  onClick={() => onCellClick(x, y)}
                  className={isHint ? 'hint' : ''}
                >
                  {cell === 1 && <div className="piece black" />}
                  {cell === 2 && <div className="piece white" />}
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
