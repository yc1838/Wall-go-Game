
import React from 'react';
import { CounterSource, GameMode, Player } from '../types';
import { Bot, Users, ArrowRight, ChevronLeft, Globe, Database, UserPlus } from 'lucide-react';

interface StartScreenProps {
  onStart: (mode: GameMode, playerCount: number, names: { [key in Player]?: string }) => void;
  matchCount: number | null;
  countSource: CounterSource;
  isLoadingCount: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, matchCount, countSource, isLoadingCount }) => {
  const [step, setStep] = React.useState<'MODE' | 'COUNT' | 'NAMES'>('MODE');
  const [selectedMode, setSelectedMode] = React.useState<GameMode | null>(null);
  const [playerCount, setPlayerCount] = React.useState(2);
  
  const [names, setNames] = React.useState<{ [key: string]: string }>({
      [Player.RED]: '',
      [Player.BLUE]: '',
      [Player.GREEN]: '',
      [Player.YELLOW]: ''
  });

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    if (mode === GameMode.PVAI) {
        setPlayerCount(2); // AI only supports 2 players
        setStep('NAMES');
        setNames(prev => ({ ...prev, [Player.BLUE]: 'Automata' }));
    } else {
        setStep('COUNT'); // Go to count selection for PVP
    }
  };

  const handleCountSelect = (count: number) => {
      setPlayerCount(count);
      setStep('NAMES');
  };

  const handleBack = () => {
    if (step === 'NAMES') {
        if (selectedMode === GameMode.PVAI) {
            setStep('MODE');
            setSelectedMode(null);
        } else {
            setStep('COUNT');
        }
    } else if (step === 'COUNT') {
        setStep('MODE');
        setSelectedMode(null);
    }
  };

  const updateName = (p: Player, val: string) => {
      setNames(prev => ({ ...prev, [p]: val }));
  };

  const handleStart = () => {
    if (!selectedMode) return;
    
    // Fill defaults
    const finalNames: { [key in Player]?: string } = {};
    const defaultNames = {
        [Player.RED]: 'Crimson',
        [Player.BLUE]: selectedMode === GameMode.PVAI ? 'Automata' : 'Azure',
        [Player.GREEN]: 'Emerald',
        [Player.YELLOW]: 'Golden'
    };

    const players = [Player.RED, Player.BLUE, Player.GREEN, Player.YELLOW].slice(0, playerCount);
    
    players.forEach(p => {
        finalNames[p] = names[p]?.trim() || defaultNames[p];
    });

    onStart(selectedMode, playerCount, finalNames);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[var(--parchment)]/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300 overflow-y-auto">
      
      <div className="text-center mb-6 w-full max-w-xs shrink-0">
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

        <h1 className="font-serif text-4xl font-bold italic text-[var(--ink)] mb-1 mt-2 leading-none">
            Stitched<br/>Territory
        </h1>
      </div>

      {step === 'MODE' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
           <p className="font-serif italic text-sm opacity-80 text-center mb-2">Choose your opponent.</p>
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
              <span className="mono text-[0.6rem] uppercase tracking-wider opacity-70">Pass & Play (Multiplayer)</span>
            </div>
          </button>
        </div>
      )}

      {step === 'COUNT' && (
          <div className="flex flex-col gap-4 w-full max-w-xs animate-in slide-in-from-right duration-300">
             <p className="font-serif italic text-sm opacity-80 text-center mb-2">How many tailors?</p>
             {[2, 3, 4].map(count => (
                 <button
                    key={count}
                    onClick={() => handleCountSelect(count)}
                    className="p-4 border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--parchment)] transition-colors font-serif font-bold text-xl flex justify-between items-center"
                 >
                    <span>{count} Players</span>
                    <div className="flex gap-1">
                        {Array.from({length: count}).map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-current opacity-60" />
                        ))}
                    </div>
                 </button>
             ))}
             <button onClick={handleBack} className="mt-4 text-xs mono border-b border-transparent hover:border-[var(--ink)] self-center">BACK</button>
          </div>
      )}

      {step === 'NAMES' && (
        <div className="flex flex-col gap-4 w-full max-w-xs animate-in slide-in-from-right duration-300">
           <p className="font-serif italic text-sm opacity-80 text-center mb-2">Identity your threads.</p>
           
           <div className="flex flex-col gap-3">
               <div className="flex flex-col gap-1">
                  <label className="mono text-[0.6rem] font-bold opacity-60 ml-1 text-[var(--thread-red)]">Red Tailor</label>
                  <input type="text" value={names[Player.RED]} onChange={(e) => updateName(Player.RED, e.target.value)} placeholder="Crimson" className="w-full bg-white/50 border-b-2 border-[var(--ink)] p-2 font-serif focus:outline-none" />
               </div>
               
               <div className="flex flex-col gap-1">
                  <label className="mono text-[0.6rem] font-bold opacity-60 ml-1 text-[var(--thread-blue)]">Blue Tailor</label>
                  <input type="text" value={names[Player.BLUE]} onChange={(e) => updateName(Player.BLUE, e.target.value)} placeholder={selectedMode === GameMode.PVAI ? "Automata" : "Azure"} disabled={selectedMode === GameMode.PVAI} className="w-full bg-white/50 border-b-2 border-[var(--ink)] p-2 font-serif focus:outline-none disabled:opacity-50" />
               </div>

               {playerCount > 2 && (
                   <div className="flex flex-col gap-1 animate-in fade-in">
                      <label className="mono text-[0.6rem] font-bold opacity-60 ml-1 text-[var(--thread-green)]">Green Tailor</label>
                      <input type="text" value={names[Player.GREEN]} onChange={(e) => updateName(Player.GREEN, e.target.value)} placeholder="Emerald" className="w-full bg-white/50 border-b-2 border-[var(--ink)] p-2 font-serif focus:outline-none" />
                   </div>
               )}

               {playerCount > 3 && (
                   <div className="flex flex-col gap-1 animate-in fade-in">
                      <label className="mono text-[0.6rem] font-bold opacity-60 ml-1 text-[var(--thread-yellow)]">Yellow Tailor</label>
                      <input type="text" value={names[Player.YELLOW]} onChange={(e) => updateName(Player.YELLOW, e.target.value)} placeholder="Golden" className="w-full bg-white/50 border-b-2 border-[var(--ink)] p-2 font-serif focus:outline-none" />
                   </div>
               )}
           </div>

           <div className="flex gap-3 mt-4">
             <button onClick={handleBack} className="p-3 border border-[var(--ink)] hover:bg-black/5 transition-colors rounded-sm"><ChevronLeft size={20} /></button>
             <button onClick={handleStart} className="flex-1 bg-[var(--ink)] text-[var(--parchment)] font-serif font-bold text-lg p-3 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
               BEGIN RITUAL <ArrowRight size={18} />
             </button>
           </div>
        </div>
      )}

      <div className="mt-6 text-center shrink-0">
        <p className="mono text-[0.55rem] opacity-40">SYSTEM V2.0 // MULTITHREADING</p>
      </div>
    </div>
  );
};

export default StartScreen;
