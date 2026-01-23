import React, { useEffect } from 'react';
import { CounterSource, GameMode, Player } from '../types';
import { Bot, Users, ArrowRight, ChevronLeft, Globe, Database } from 'lucide-react';

interface StartScreenProps {
  onStart: (mode: GameMode, names: { [key in Player]: string }) => void;
  matchCount: number | null;
  countSource: CounterSource;
  isLoadingCount: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, matchCount, countSource, isLoadingCount }) => {
  const [step, setStep] = React.useState<'MODE' | 'NAMES'>('MODE');
  const [selectedMode, setSelectedMode] = React.useState<GameMode | null>(null);
  const [p1Name, setP1Name] = React.useState('');
  const [p2Name, setP2Name] = React.useState('');

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setStep('NAMES');
    if (mode === GameMode.PVAI) {
      setP2Name('Automata');
    } else {
      setP2Name('');
    }
  };

  const handleBack = () => {
    setStep('MODE');
    setSelectedMode(null);
  };

  const handleStart = () => {
    if (!selectedMode) return;
    onStart(selectedMode, {
        [Player.RED]: p1Name.trim() || 'Player 01',
        [Player.BLUE]: p2Name.trim() || (selectedMode === GameMode.PVAI ? 'Automata' : 'Player 02')
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[var(--parchment)]/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      
      <div className="text-center mb-8 w-full max-w-xs">
        <div className="flex flex-col items-center gap-1 mb-2">
            <span className="mono text-xs opacity-60 tracking-widest">SESSION // NEW</span>
            
            {/* Global Counter Badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-[var(--ink)]/15 rounded-full min-h-[24px] transition-all">
                {countSource === 'GLOBAL' ? (
                   <Globe size={12} className="text-[var(--ink)] opacity-70" />
                ) : (
                   <Database size={12} className="text-[var(--ink)] opacity-70" />
                )}
                
                <span className="mono text-[0.65rem] font-bold text-[var(--ink)]">
                    {isLoadingCount ? (
                        "SYNCING..."
                    ) : (
                        `${countSource === 'GLOBAL' ? 'GLOBAL DUELS' : 'LOCAL DUELS'}: ${(matchCount || 0).toLocaleString()}`
                    )}
                </span>
            </div>
        </div>

        <h1 className="font-serif text-4xl font-bold italic text-[var(--ink)] mb-2 mt-2">
            Stitched<br/>Territory
        </h1>
        {step === 'MODE' ? (
          <p className="font-serif italic text-sm opacity-80 max-w-[200px] mx-auto">
            Choose your opponent in the battle of threads.
          </p>
        ) : (
          <p className="font-serif italic text-sm opacity-80 max-w-[200px] mx-auto">
             Enter the names of the tailors.
          </p>
        )}
      </div>

      {step === 'MODE' ? (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={() => handleModeSelect(GameMode.PVAI)}
            className="group relative flex items-center p-4 border-2 border-[var(--ink)] hover:bg-[var(--ink)] transition-colors text-left"
          >
            <div className="bg-[var(--ink)] text-[var(--parchment)] p-3 mr-4 group-hover:bg-[var(--parchment)] group-hover:text-[var(--ink)] transition-colors">
              <Bot size={24} />
            </div>
            <div className="flex flex-col group-hover:text-[var(--parchment)]">
              <span className="font-serif font-bold text-lg leading-none mb-1">Weaver Automata</span>
              <span className="mono text-[0.6rem] uppercase tracking-wider opacity-70">Single Player vs AI</span>
            </div>
          </button>

          <button 
            onClick={() => handleModeSelect(GameMode.PVP)}
            className="group relative flex items-center p-4 border border-dashed border-[var(--ink)] hover:bg-[var(--ink)] hover:border-solid transition-all text-left"
          >
            <div className="bg-black/5 p-3 mr-4 group-hover:bg-[var(--parchment)] transition-colors">
              <Users size={24} className="text-[var(--ink)]" />
            </div>
            <div className="flex flex-col group-hover:text-[var(--parchment)]">
              <span className="font-serif font-bold text-lg leading-none mb-1">Duel of Tailors</span>
              <span className="mono text-[0.6rem] uppercase tracking-wider opacity-70">Pass & Play (2 Players)</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full max-w-xs animate-in slide-in-from-right duration-300">
           
           {/* Player 1 Input */}
           <div className="flex flex-col gap-1">
              <label className="mono text-[0.6rem] font-bold opacity-60 ml-1">Crimson (Player 01)</label>
              <input 
                type="text" 
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Enter Name"
                className="w-full bg-white/50 border-b-2 border-[var(--ink)] p-2 font-serif text-lg focus:outline-none focus:bg-white/80 transition-colors placeholder:italic placeholder:opacity-40"
                autoFocus
              />
           </div>

           {/* Player 2 Input */}
           <div className="flex flex-col gap-1">
              <label className="mono text-[0.6rem] font-bold opacity-60 ml-1">Azure (Player 02)</label>
              <input 
                type="text" 
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder={selectedMode === GameMode.PVAI ? "Automata" : "Enter Name"}
                disabled={selectedMode === GameMode.PVAI}
                className="w-full bg-white/50 border-b-2 border-[var(--ink)] p-2 font-serif text-lg focus:outline-none focus:bg-white/80 transition-colors placeholder:italic placeholder:opacity-40 disabled:opacity-50 disabled:cursor-not-allowed"
              />
           </div>

           <div className="flex gap-3 mt-2">
             <button 
               onClick={handleBack}
               className="p-3 border border-[var(--ink)] hover:bg-black/5 transition-colors rounded-sm"
             >
               <ChevronLeft size={20} />
             </button>
             <button 
               onClick={handleStart}
               className="flex-1 bg-[var(--ink)] text-[var(--parchment)] font-serif font-bold text-lg p-3 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
             >
               BEGIN RITUAL <ArrowRight size={18} />
             </button>
           </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="mono text-[0.55rem] opacity-40">
            SYSTEM V1.0 // SEAMLESS INTEGRATION
        </p>
      </div>
    </div>
  );
};

export default StartScreen;