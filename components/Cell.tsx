
import React from 'react';
import { CellData, Player } from '../types';

interface CellProps {
  cell: CellData;
  isValidMove: boolean;
  isSelected: boolean;
  isLastMoved: boolean;
  currentPlayer?: Player; // Add current player to know which color to show
  onClick: () => void;
  showGhostWalls: boolean; 
  onWallClick: (side: 'top' | 'right' | 'bottom' | 'left') => void;
}

const getPlayerColorVar = (player: Player) => {
    switch(player) {
        case Player.RED: return 'var(--thread-red)';
        case Player.BLUE: return 'var(--thread-blue)';
        case Player.GREEN: return 'var(--thread-green)';
        case Player.YELLOW: return 'var(--thread-yellow)';
        default: return 'var(--ink)';
    }
};

const Cell: React.FC<CellProps> = ({ 
  cell, 
  isValidMove, 
  isSelected, 
  isLastMoved,
  currentPlayer,
  onClick, 
  showGhostWalls, 
  onWallClick 
}) => {
  
  // Base classes for the cell
  const baseClasses = "relative w-full h-full flex items-center justify-center border-box select-none";
  
  const activeColorVar = currentPlayer ? getPlayerColorVar(currentPlayer) : 'var(--ink)';

  return (
    <div 
      className={baseClasses}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Valid Move Marker (Colored Background & Dot) */}
      {isValidMove && !cell.occupant && (
        <>
            {/* Subtle background tint */}
            <div 
                className="absolute inset-1 rounded-sm opacity-10"
                style={{ backgroundColor: activeColorVar }}
            />
            {/* Center Dot */}
            <div 
                className="absolute w-3 h-3 rounded-full opacity-60 animate-pulse" 
                style={{ backgroundColor: activeColorVar }}
            />
        </>
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
            backgroundColor: getPlayerColorVar(cell.occupant),
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
      
      {['top', 'right', 'bottom', 'left'].map(side => {
          const owner = cell.walls[side as keyof typeof cell.walls];
          if (!owner) return null;
          
          const isVert = side === 'left' || side === 'right';
          const style: React.CSSProperties = { color: getPlayerColorVar(owner) };
          let className = "absolute z-10 ";
          
          if (side === 'top') className += "top-[-2px] left-[-2px] right-[-2px] h-[4px] wall-stitch";
          if (side === 'bottom') className += "bottom-[-2px] left-[-2px] right-[-2px] h-[4px] wall-stitch";
          if (side === 'left') className += "left-[-2px] top-[-2px] bottom-[-2px] w-[4px] wall-stitch-v";
          if (side === 'right') className += "right-[-2px] top-[-2px] bottom-[-2px] w-[4px] wall-stitch-v";
          
          return <div key={side} className={className} style={style} />;
      })}


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
