
import React from 'react';
import { CellData, Coordinate, GamePhase, Player, WallState } from '../types';
import Cell from './Cell';

interface BoardProps {
  board: CellData[][];
  validMoves: Coordinate[];
  selectedPiece: Coordinate | null;
  movedTo: Coordinate | null;
  phase: GamePhase;
  currentPlayer: Player; 
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

  const size = board.length;

  return (
    <div className="absolute inset-0 m-auto aspect-square max-h-full max-w-full shadow-sm">
      {/* 
         Structure:
         - Outer Container: Flex Column. Stacks rows vertically.
         - Row Container: Flex-1 (fills vertical space evenly) + Grid (splits horizontal space).
      */}
      <div className="flex flex-col h-full w-full border-[4px] border-[var(--ink)] bg-white/20">
        {board.map((row, y) => (
            <div 
                key={`row-${y}`} 
                className="grid flex-1 w-full"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
                {row.map((cell, x) => {
                    const isValidMove = phase === GamePhase.ACTION_MOVE && isCoordInList(validMoves, x, y);
                    const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;
                    const showGhostWalls = phase === GamePhase.ACTION_WALL && movedTo?.x === x && movedTo?.y === y;

                    return (
                        <div key={`cell-${x}-${y}`} className="border-[0.5px] border-[rgba(0,0,0,0.08)] relative">
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
