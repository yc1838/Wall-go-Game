import React from 'react';
import { CellData, Player } from '../types';

interface CellProps {
  cell: CellData;
  isValidMove: boolean;
  isSelected: boolean;
  isLastMoved: boolean;
  onClick: () => void;
  showGhostWalls: boolean; 
  onWallClick: (side: 'top' | 'right' | 'bottom' | 'left') => void;
}

const Cell: React.FC<CellProps> = ({ 
  cell, 
  isValidMove, 
  isSelected, 
  isLastMoved,
  onClick, 
  showGhostWalls, 
  onWallClick 
}) => {
  
  // Base classes for the cell
  const baseClasses = "relative w-full h-full flex items-center justify-center border-box select-none";
  
  // Interactions
  // We use inline styles for colors to match the exact CSS variables from index.html
  
  return (
    <div 
      className={baseClasses}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Grid Lines - subtle distinct borders handled by parent grid gap/border, 
          but we can add a faint internal border if needed. 
          The design shows a grid with solid borders. */}
      
      {/* Valid Move Marker (Stitched X or Dot) */}
      {isValidMove && !cell.occupant && (
        <div className="absolute w-3 h-3 rounded-full bg-[var(--thread-cyan)] opacity-50 animate-pulse" />
      )}

      {/* Selected Highlight */}
      {isSelected && (
        <div className="absolute inset-1 border-2 border-[var(--ink)] border-dashed rounded-full opacity-30" />
      )}
      
      {/* Last Moved Marker (Ghost trace) */}
      {isLastMoved && !cell.occupant && (
         <div className="absolute w-2 h-2 border border-[var(--ink)] rounded-full opacity-20" />
      )}

      {/* Render Occupant (Button Style) */}
      {cell.occupant && (
        <div 
          className={`piece-anim relative w-[75%] h-[75%] rounded-full shadow-md flex items-center justify-center transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}
          style={{
            backgroundColor: cell.occupant === Player.RED ? 'var(--thread-red)' : 'var(--thread-blue)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          {/* Inner dashed line for "button" look */}
          <div className="w-[80%] h-[80%] rounded-full border-2 border-dashed border-white/30" />
          
          {/* Thread holes (optional detail) */}
          <div className="absolute w-1 h-1 bg-black/20 rounded-full top-[40%] left-[40%]" />
          <div className="absolute w-1 h-1 bg-black/20 rounded-full top-[40%] right-[40%]" />
          <div className="absolute w-1 h-1 bg-black/20 rounded-full bottom-[40%] left-[40%]" />
          <div className="absolute w-1 h-1 bg-black/20 rounded-full bottom-[40%] right-[40%]" />
          
          {/* Thread Cross */}
          <div className="absolute w-[20%] h-[2px] bg-white/40 rotate-45" />
          <div className="absolute w-[20%] h-[2px] bg-white/40 -rotate-45" />
        </div>
      )}

      {/* --- WALLS --- */}
      {/* Wall styles use the 'wall-stitch' classes defined in index.html */}
      
      {/* Top Wall */}
      {cell.walls.top && (
        <div 
            className="absolute top-[-2px] left-[-2px] right-[-2px] h-[4px] wall-stitch z-10"
            style={{ color: cell.walls.top === Player.RED ? 'var(--thread-red)' : 'var(--thread-blue)' }} 
        />
      )}
      
      {/* Bottom Wall */}
      {cell.walls.bottom && (
        <div 
            className="absolute bottom-[-2px] left-[-2px] right-[-2px] h-[4px] wall-stitch z-10"
            style={{ color: cell.walls.bottom === Player.RED ? 'var(--thread-red)' : 'var(--thread-blue)' }}
        />
      )}
      
      {/* Left Wall */}
      {cell.walls.left && (
        <div 
            className="absolute left-[-2px] top-[-2px] bottom-[-2px] w-[4px] wall-stitch-v z-10"
            style={{ color: cell.walls.left === Player.RED ? 'var(--thread-red)' : 'var(--thread-blue)' }}
        />
      )}

      {/* Right Wall */}
      {cell.walls.right && (
        <div 
            className="absolute right-[-2px] top-[-2px] bottom-[-2px] w-[4px] wall-stitch-v z-10"
            style={{ color: cell.walls.right === Player.RED ? 'var(--thread-red)' : 'var(--thread-blue)' }}
        />
      )}


      {/* --- GHOST WALLS (Interaction Targets) --- */}
      {showGhostWalls && (
        <>
          {!cell.walls.top && (
            <div 
              className="absolute top-0 left-0 w-full h-[35%] z-20 cursor-pointer group flex justify-center items-start pt-1"
              onClick={(e) => { e.stopPropagation(); onWallClick('top'); }}
            >
               <div className="w-[80%] h-1 bg-[var(--ink)] opacity-10 group-hover:opacity-40 rounded-full transition-opacity" />
            </div>
          )}
          {!cell.walls.bottom && (
            <div 
              className="absolute bottom-0 left-0 w-full h-[35%] z-20 cursor-pointer group flex justify-center items-end pb-1"
              onClick={(e) => { e.stopPropagation(); onWallClick('bottom'); }}
            >
              <div className="w-[80%] h-1 bg-[var(--ink)] opacity-10 group-hover:opacity-40 rounded-full transition-opacity" />
            </div>
          )}
          {!cell.walls.left && (
            <div 
              className="absolute top-0 left-0 h-full w-[35%] z-20 cursor-pointer group flex items-center justify-start pl-1"
              onClick={(e) => { e.stopPropagation(); onWallClick('left'); }}
            >
              <div className="h-[80%] w-1 bg-[var(--ink)] opacity-10 group-hover:opacity-40 rounded-full transition-opacity" />
            </div>
          )}
          {!cell.walls.right && (
            <div 
              className="absolute top-0 right-0 h-full w-[35%] z-20 cursor-pointer group flex items-center justify-end pr-1"
              onClick={(e) => { e.stopPropagation(); onWallClick('right'); }}
            >
              <div className="h-[80%] w-1 bg-[var(--ink)] opacity-10 group-hover:opacity-40 rounded-full transition-opacity" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(Cell);