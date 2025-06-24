import type { FC } from 'react';
import Piece from './Piece';

interface CellProps {
  x: number;
  y: number;
  cell: number;
  isHint: boolean;
  isPlaced: boolean;
  flipDelay?: number;
  onClick: (x: number, y: number) => void;
}

const Cell: FC<CellProps> = ({ x, y, cell, isHint, isPlaced, flipDelay, onClick }) => (
  <td onClick={() => onClick(x, y)} className={isHint ? 'hint' : ''}>
    {cell === 1 && <Piece color="black" isPlaced={isPlaced} flipDelay={flipDelay} />}
    {cell === 2 && <Piece color="white" isPlaced={isPlaced} flipDelay={flipDelay} />}
  </td>
);

export default Cell;
