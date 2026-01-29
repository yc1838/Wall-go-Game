
import React from 'react';
import { GameMode, GamePhase, Player } from '../types';
import { Cpu, X } from 'lucide-react';

interface ControlsProps {
  phase: GamePhase;
  currentPlayer: Player;
  timeLeft: number;
  winner: Player | 'DRAW' | null;
  onReset: () => void;
  onUnselect: () => void;
  scores: { [key in Player]?: number };
  isAiThinking?: boolean;
  gameMode: GameMode | null;
  activePlayers: Player[];
  playerNames: { [key in Player]?: string };
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

const Controls: React.FC<ControlsProps> = ({ 
  phase, 
  currentPlayer, 
  timeLeft, 
  winner,
  onReset,
  onUnselect,
  scores,
  isAiThinking,
  gameMode,
  activePlayers,
  playerNames
}) => {
  
  const getPhaseText = () => {
    if (isAiThinking) return "Automata is calculating...";

    switch (phase) {
      case GamePhase.PLACEMENT: return `${playerNames[currentPlayer]}: Place your button`;
      case GamePhase.ACTION_SELECT: return `${playerNames[currentPlayer]}: Select a button`;
      case GamePhase.ACTION_MOVE: return "Action: Move piece";
      case GamePhase.ACTION_WALL: return "Action: Stitch a wall";
      case GamePhase.GAME_OVER: return "Pattern Complete";
      default: return "";
    }
  };

  // Grid Layout for players: 
  // 2 players: 2 cols, 1 row
  // 3-4 players: 2 cols, 2 rows (more compact)
  const gridClass = activePlayers.length > 2 ? 'grid grid-cols-2 gap-2' : 'flex w-full gap-4';

  return (
    <div className="w-full flex flex-col gap-2">
      
      {/* Player Input Area */}
      <div className={gridClass}>
          {activePlayers.map(p => {
              const isActive = currentPlayer === p;
              const isWinner = winner === p;
              const bgColor = isActive ? 'bg-white/40' : 'bg-white/10';
              const borderColor = isActive ? 'border-[var(--ink)]' : 'border-dashed border-black/10';
              const colorVar = getPlayerColorVar(p);

              return (
                  <div 
                    key={p} 
                    className={`flex-1 flex items-center p-2 border-2 transition-all relative ${borderColor} ${bgColor}`}
                  >
                      {/* Active Indicator */}
                      {isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--ink)]" />}
                      
                      <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{backgroundColor: colorVar}} />
                      
                      {gameMode === GameMode.PVAI && p === Player.BLUE && <Cpu size={14} className="mr-1 opacity-60 shrink-0" style={{color: colorVar}} />}
                      
                      <div className="flex-1 min-w-0">
                          <div className="font-serif font-bold text-sm md:text-lg text-[var(--ink)] truncate leading-none">
                              {playerNames[p] || p}
                          </div>
                      </div>
                      <span className="font-serif font-bold text-lg ml-2">{scores[p]}</span>
                  </div>
              );
          })}
      </div>

      {/* Status Bar */}
      <div className="w-full border-y border-dashed border-black/10 py-2 my-2 bg-white/20 relative flex items-center justify-center min-h-[44px]">
          
          {/* Specific UI for Move Phase to allow Unselect */}
          {phase === GamePhase.ACTION_MOVE && !winner ? (
              <div className="flex items-center justify-between w-full px-4 animate-in fade-in duration-200">
                 <span className="font-serif italic text-[var(--ink)] text-sm md:text-base">
                    Select Destination...
                 </span>
                 
                 {/* Unselect Button (Paper Tag Style) */}
                 <button 
                    onClick={onUnselect}
                    className="flex items-center gap-1 bg-[var(--parchment)] border border-[var(--ink)] px-2 py-1 shadow-[2px_2px_0px_rgba(44,44,44,0.15)] hover:translate-y-[1px] hover:shadow-none transition-all active:scale-95"
                 >
                    <X size={12} className="text-[var(--ink)]" />
                    <span className="mono text-[0.6rem] font-bold text-[var(--ink)] uppercase tracking-wider">
                        Unselect
                    </span>
                 </button>
              </div>
          ) : (
              <span className="font-serif italic text-[var(--ink)] text-sm md:text-base px-2 text-center leading-tight">
                 {winner ? (winner === 'DRAW' ? 'Perfectly Balanced' : `${playerNames[winner as Player]} Wins`) : getPhaseText()}
              </span>
          )}

          {/* Subtle timer line if active */}
          {!winner && phase !== GamePhase.PLACEMENT && (
            <div className="absolute bottom-0 left-0 h-[1px] bg-[var(--ink)] opacity-20 transition-all duration-1000 linear" style={{ width: `${(timeLeft / 90) * 100}%` }} />
          )}
      </div>

      {/* Reset Button */}
      <div className="text-center">
          <button 
            onClick={onReset}
            className="mono text-[0.6rem] tracking-[0.2em] border-b border-black/20 hover:border-black/100 transition-colors pb-0.5 text-[var(--ink)] uppercase"
          >
            {winner ? 'NEW PATTERN' : 'RESET CANVAS'}
          </button>
      </div>

    </div>
  );
};

export default Controls;
