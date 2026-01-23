import React from 'react';
import { CellData, Coordinate, GamePhase, Player, WallState } from '../types';
import Cell from './Cell';

interface BoardProps {
  board: CellData[][];
  validMoves: Coordinate[];
  selectedPiece: Coordinate | null;
  movedTo: Coordinate | null;
  phase: GamePhase;
  currentPlayer: Player; // Added prop
  onCellClick: (x: number, y: number) => void;
  onWallClick: (x: number, y: number, side: keyof WallState) => void;
}

const Board: React.FC<BoardProps> = ({ 
  board, 
  validMoves, 
  selectedPiece, 
  movedTo,
  phase, 
  currentPlayer,
  onCellClick,
  onWallClick
}) => {
  
  const isCoordInList = (list: Coordinate[], x: number, y: number) => {
    return list.some(c => c.x === x && c.y === y);
  };

  return (
    /* 
       Updated Container Constraints:
       - absolute inset-0: Fills the relative parent (the <main>).
       - m-auto: Centers content.
       - aspect-square: Forces 1:1 ratio strictly.
       - max-h-full max-w-full: Shrinks to fit whichever dimension is smaller.
       This prevents squashing because width/height are derived from the limiting dimension + aspect ratio.
    */
    <div className="absolute inset-0 m-auto aspect-square max-h-full max-w-full shadow-sm">
      <div 
        className="grid grid-rows-7 h-full w-full border-[4px] border-[var(--ink)] bg-white/20"
      >
        {board.map((row, y) => (
          <div key={`row-${y}`} className="grid grid-cols-7 h-full">
            {row.map((cell, x) => {
              const isValidMove = phase === GamePhase.ACTION_MOVE && isCoordInList(validMoves, x, y);
              const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;
              const showGhostWalls = phase === GamePhase.ACTION_WALL && movedTo?.x === x && movedTo?.y === y;

              return (
                <div key={`cell-${x}-${y}`} className="border-[0.5px] border-[rgba(0,0,0,0.08)]">
                    <Cell 
                    cell={cell}
                    isValidMove={isValidMove}
                    isSelected={isSelected}
                    isLastMoved={false} 
                    currentPlayer={currentPlayer}
                    showGhostWalls={showGhostWalls}
                    onClick={() => onCellClick(x, y)}
                    onWallClick={(side) => onWallClick(x, y, side)}
                    />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;