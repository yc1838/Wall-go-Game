import React from 'react';
import { GamePhase, Player } from '../types';
import { RotateCw } from 'lucide-react';

interface ControlsProps {
  phase: GamePhase;
  currentPlayer: Player;
  timeLeft: number;
  winner: Player | 'DRAW' | null;
  onReset: () => void;
  scores: { [key in Player]: number };
}

const Controls: React.FC<ControlsProps> = ({ 
  phase, 
  currentPlayer, 
  timeLeft, 
  winner,
  onReset,
  scores
}) => {
  
  const getPhaseText = () => {
    switch (phase) {
      case GamePhase.PLACEMENT: return "Placement: Tap empty square";
      case GamePhase.ACTION_SELECT: return "Action: Select your button";
      case GamePhase.ACTION_MOVE: return "Action: Move piece";
      case GamePhase.ACTION_WALL: return "Action: Stitch a wall";
      case GamePhase.GAME_OVER: return "Pattern Complete";
      default: return "";
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      
      {/* Player Cards (Top Section) */}
      <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 border transition-transform duration-300 relative ${currentPlayer === Player.RED ? 'border-2 border-[var(--ink)] scale-105 bg-white/40' : 'border border-dashed border-black/20 bg-white/20'}`}>
              {currentPlayer === Player.RED && <div className="absolute top-0 right-0 w-3 h-3 bg-[var(--ink)]" style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%)'}}></div>}
              <div className="mono text-[0.6rem] text-[var(--ink)] opacity-70 mb-1">Player 01</div>
              <div className="flex justify-between items-end">
                  <span className="font-serif font-bold text-[var(--thread-red)] leading-none">Crimson</span>
                  <span className="font-serif font-bold text-xl leading-none text-[var(--ink)]">{scores[Player.RED]}</span>
              </div>
          </div>
          
          <div className={`p-3 border transition-transform duration-300 relative ${currentPlayer === Player.BLUE ? 'border-2 border-[var(--ink)] scale-105 bg-white/40' : 'border border-dashed border-black/20 bg-white/20'}`}>
              {currentPlayer === Player.BLUE && <div className="absolute top-0 right-0 w-3 h-3 bg-[var(--ink)]" style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%)'}}></div>}
              <div className="mono text-[0.6rem] text-[var(--ink)] opacity-70 mb-1">Player 02</div>
              <div className="flex justify-between items-end">
                  <span className="font-serif font-bold text-[var(--thread-blue)] leading-none">Azure</span>
                  <span className="font-serif font-bold text-xl leading-none text-[var(--ink)]">{scores[Player.BLUE]}</span>
              </div>
          </div>
      </div>

      {/* Timer Bar */}
      {phase !== GamePhase.GAME_OVER && phase !== GamePhase.PLACEMENT && (
         <div className="w-full flex flex-col items-center gap-1">
             <div className="mono text-[0.7rem] opacity-60">Time Remaining</div>
             <div className="w-[80%] h-1 bg-black/10 overflow-hidden relative">
                 <div 
                    className="absolute left-0 top-0 h-full bg-[var(--ink)] transition-all duration-1000 linear" 
                    style={{ width: `${(timeLeft / 90) * 100}%` }}
                 />
             </div>
         </div>
      )}

      {/* Action / Status Area */}
      <div className="mt-2 text-center">
         {winner ? (
            <div className="animate-bounce">
                <div className="font-serif text-2xl font-bold text-[var(--ink)]">
                    {winner === 'DRAW' ? 'Perfectly Balanced' : `${winner === Player.RED ? 'Crimson' : 'Azure'} Dominance`}
                </div>
                <div className="mono text-xs mt-1">Stitching Complete</div>
            </div>
         ) : (
             <div className="p-2 border-y border-black/10">
                 <div className="font-serif italic text-lg text-[var(--ink)]">{getPhaseText()}</div>
             </div>
         )}
      </div>

      {/* Reset / End Game Button */}
      {phase === GamePhase.GAME_OVER && (
        <button 
            onClick={onReset}
            className="w-full py-3 border border-[var(--ink)] mono text-sm font-bold hover:bg-[var(--ink)] hover:text-[var(--parchment)] transition-colors flex items-center justify-center gap-2"
        >
            <RotateCw size={14} /> NEW PATTERN
        </button>
      )}

      {/* Bottom Reset helper during game */}
      {phase !== GamePhase.GAME_OVER && (
          <div className="flex justify-center mt-2 opacity-40 hover:opacity-100 transition-opacity">
               <button onClick={() => confirm("Restart?") && onReset()} className="mono text-[0.6rem] border-b border-black">Reset Canvas</button>
          </div>
      )}

    </div>
  );
};

export default Controls;