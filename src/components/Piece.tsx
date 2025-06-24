import type { FC } from 'react';

interface PieceProps {
  color: 'black' | 'white';
  isPlaced?: boolean;
  flipDelay?: number;
}

const Piece: FC<PieceProps> = ({ color, isPlaced, flipDelay }) => (
  <div
    className={`piece ${color}${isPlaced ? ' pop' : ''}${flipDelay !== undefined ? ' flip' : ''}`}
    style={flipDelay !== undefined ? { animationDelay: `${flipDelay}ms` } : undefined}
  />
);

export default Piece;
