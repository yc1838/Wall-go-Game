
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import Board from './components/Board';
import Controls from './components/Controls';
import StartScreen from './components/StartScreen';
import { 
  GameState, 
  Player, 
  GamePhase, 
  Coordinate, 
  TURN_TIME_LIMIT,
  WallState,
  GameMode,
  CounterSource
} from './types';
import { 
  createInitialBoard, 
  getValidMoves, 
  placeWall, 
  checkGameEndCondition, 
  calculateScores,
  calculateLargestTerritory
} from './utils/boardUtils';
import { calculateBestMove } from './utils/aiUtils';
import { getMatchCount, incrementMatchCount } from './utils/counterUtils';
import { X, Loader2, Globe, Database } from 'lucide-react';

// Extend window for Google Analytics type safety
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Analytics Helper
const logEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

const RulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-[var(--parchment)] border-2 border-[var(--ink)] shadow-[var(--paper-shadow)] max-w-lg w-full max-h-[80vh] flex flex-col relative rounded-sm">
      <div className="absolute top-2 right-2">
         <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors text-[var(--ink)]">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto text-[var(--ink)] space-y-4 font-serif leading-relaxed">
        <h2 className="text-2xl font-bold italic border-b border-black/10 pb-2">Manual of Stitching</h2>
        
        <section>
          <h3 className="mono font-bold text-sm mb-1">Objective</h3>
          <p>Secure the largest territory. The game ends when all players are completely separated by walls.</p>
        </section>
        
        <section>
          <h3 className="mono font-bold text-sm mb-1">Phase 1: Placement</h3>
          <p className="text-sm">Players take turns placing their buttons on the board. Each player places <strong>2 buttons</strong> in total.</p>
        </section>

        <section>
          <h3 className="mono font-bold text-sm mb-1">Phase 2: Action</h3>
          <ol className="list-decimal pl-4 space-y-1 text-sm">
            <li><strong>Select</strong> one of your buttons.</li>
            <li><strong>Slide</strong> it 0, 1, or 2 spaces. (No jumping over obstacles).</li>
            <li><strong>Stitch</strong> a wall on any open side of the square you landed on.</li>
          </ol>
        </section>

        <section>
          <h3 className="mono font-bold text-sm mb-1">Scoring</h3>
          <p className="text-sm">Count the total squares in your enclosed area. Highest score wins. Ties are broken by the largest single contiguous territory.</p>
        </section>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // --- State Initialization ---
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: Player.RED,
    activePlayers: [Player.RED, Player.BLUE], // Default 2
    phase: GamePhase.PLACEMENT,
    turnTimer: TURN_TIME_LIMIT,
    winner: null,
    scores: { [Player.RED]: 0, [Player.BLUE]: 0 },
    placementQueue: [], 
    selectedPiece: null,
    validMoves: [],
    movedTo: null,
    showRules: false,
    gameMode: null, // Starts at Menu
    isAiThinking: false
  });

  const [playerNames, setPlayerNames] = useState<{ [key in Player]?: string }>({
    [Player.RED]: 'Player 01',
    [Player.BLUE]: 'Player 02'
  });

  // Hybrid Counter State
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [countSource, setCountSource] = useState<CounterSource>('OFFLINE');
  const [isCountLoading, setIsCountLoading] = useState(true);

  // Initial Fetch using Hybrid Logic
  useEffect(() => {
    getMatchCount().then(result => {
        setMatchCount(result.count);
        setCountSource(result.source);
        setIsCountLoading(false);
    });
  }, []);

  const [isCompact, setIsCompact] = useState(false);
  const timerRef = useRef<number | null>(null);

  // --- Layout Effect for Screen Height ---
  useLayoutEffect(() => {
    const checkHeight = () => {
      // If height is less than 660px, enable compact mode to save vertical space
      setIsCompact(window.innerHeight < 660);
    };
    
    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => window.removeEventListener('resize', checkHeight);
  }, []);

  // --- Helpers ---
  
  const switchPlayer = useCallback((current: Player, activePlayers: Player[]) => {
    const idx = activePlayers.indexOf(current);
    const nextIdx = (idx + 1) % activePlayers.length;
    return activePlayers[nextIdx];
  }, []);

  const endTurn = useCallback(() => {
    setGameState(prev => {
      // Check for win condition
      const isGameOver = checkGameEndCondition(prev.board, prev.activePlayers);
      
      if (isGameOver) {
        // Calculate scores
        const scores = calculateScores(prev.board, prev.activePlayers);
        let winner: Player | 'DRAW' | null = null;
        let maxScore = -1;
        
        // Find highest score
        prev.activePlayers.forEach(p => {
            const s = scores[p] || 0;
            if (s > maxScore) maxScore = s;
        });

        // Identify candidates with max score
        const candidates = prev.activePlayers.filter(p => (scores[p] || 0) === maxScore);

        if (candidates.length === 1) {
            winner = candidates[0];
        } else {
            // Tie breaker: Largest single territory
            let maxTerritory = -1;
            let territoryWinner: Player | null = null;
            let tie = false;

            candidates.forEach(p => {
                const t = calculateLargestTerritory(prev.board, p);
                if (t > maxTerritory) {
                    maxTerritory = t;
                    territoryWinner = p;
                    tie = false;
                } else if (t === maxTerritory) {
                    tie = true;
                }
            });

            winner = tie ? 'DRAW' : territoryWinner;
        }

        // --- TRACKING: GAME COMPLETE ---
        logEvent('game_complete', {
          winner: winner,
          mode: prev.gameMode,
          players: prev.activePlayers.length
        });

        return {
          ...prev,
          phase: GamePhase.GAME_OVER,
          winner,
          scores,
          isAiThinking: false
        };
      }

      // If not game over, switch player
      return {
        ...prev,
        currentPlayer: switchPlayer(prev.currentPlayer, prev.activePlayers),
        phase: GamePhase.ACTION_SELECT,
        turnTimer: TURN_TIME_LIMIT,
        selectedPiece: null,
        validMoves: [],
        movedTo: null,
        isAiThinking: false // Reset thinking state
      };
    });
  }, [switchPlayer]);

  // --- AI TRIGGER EFFECT ---
  // This detects when it's the AI's turn and sets the "Thinking" flag.
  useEffect(() => {
    // TRIGGER CONDITION:
    // It is PVAI mode AND it is AI's turn (BLUE) AND AI is not currently thinking.
    // Works for both PLACEMENT and ACTION phases.
    if (
        gameState.gameMode === GameMode.PVAI && 
        gameState.currentPlayer === Player.BLUE && 
        !gameState.isAiThinking &&
        (gameState.phase === GamePhase.ACTION_SELECT || gameState.phase === GamePhase.PLACEMENT)
    ) {
        setGameState(prev => ({ ...prev, isAiThinking: true }));
    }
  }, [gameState.currentPlayer, gameState.phase, gameState.gameMode, gameState.isAiThinking]);

  // --- AI EXECUTION EFFECT ---
  // This watches ONLY the "Thinking" flag. When true, it runs the logic.
  useEffect(() => {
    if (!gameState.isAiThinking) return;

    // Use a timeout to allow the UI to render the "Thinking" state first
    const aiTimer = setTimeout(() => {
        try {
            if (gameState.phase === GamePhase.PLACEMENT) {
                // --- AI PLACEMENT LOGIC ---
                // Randomly select an empty spot
                setGameState(prev => {
                    const emptyCells: Coordinate[] = [];
                    prev.board.forEach(row => row.forEach(cell => {
                        if (!cell.occupant) emptyCells.push({x: cell.x, y: cell.y});
                    }));
                    
                    if (emptyCells.length === 0) return prev; // Should not happen
                    
                    // Simple logic: prefer somewhat central but random positions
                    // Or purely random for variety
                    const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                    
                    // Apply Placement
                    const newBoard = prev.board.map(r => r.map(c => ({...c})));
                    newBoard[choice.y][choice.x].occupant = Player.BLUE;
                    
                    // Handle Queue
                    const newQueue = [...prev.placementQueue];
                    const nextPlayer = newQueue.shift();

                    if (!nextPlayer) {
                         // End of Placement
                         return {
                             ...prev,
                             board: newBoard,
                             phase: GamePhase.ACTION_SELECT,
                             currentPlayer: Player.RED,
                             turnTimer: TURN_TIME_LIMIT,
                             isAiThinking: false
                         };
                    } else {
                         return {
                             ...prev,
                             board: newBoard,
                             currentPlayer: nextPlayer,
                             placementQueue: newQueue,
                             isAiThinking: false
                         };
                    }
                });

            } else {
                // --- AI MOVEMENT LOGIC (Existing) ---
                const bestMove = calculateBestMove(gameState.board, Player.BLUE, Player.RED);

                if (bestMove) {
                    setGameState(prev => {
                        const newBoard = prev.board.map(r => r.map(c => ({...c, walls: {...c.walls}})));
                        
                        // Move Piece
                        newBoard[bestMove.from.y][bestMove.from.x].occupant = null;
                        newBoard[bestMove.to.y][bestMove.to.x].occupant = Player.BLUE;
                        
                        // Place Wall
                        const boardWithWall = placeWall(newBoard, bestMove.to.x, bestMove.to.y, bestMove.wallSide, Player.BLUE);

                        return {
                            ...prev,
                            board: boardWithWall,
                            phase: GamePhase.ACTION_WALL, 
                            movedTo: bestMove.to 
                        };
                    });
                    setTimeout(() => endTurn(), 300);
                } else {
                    endTurn();
                }
            }
        } catch (error) {
            console.error("AI Crashed:", error);
            endTurn(); // Force end turn so user isn't stuck
        }
    }, 500);

    return () => clearTimeout(aiTimer);
  }, [gameState.isAiThinking, gameState.phase, gameState.board, endTurn]);


  // Handle Random Wall (Timeout)
  const handleRandomWallPlacement = useCallback(() => {
      setGameState(prev => {
        let pieceX = -1, pieceY = -1;
        
        // Determine which piece is acting
        if (prev.phase === GamePhase.ACTION_WALL && prev.movedTo) {
           pieceX = prev.movedTo.x;
           pieceY = prev.movedTo.y;
        } else {
           // Find a random piece of current player
           const pieces: Coordinate[] = [];
           prev.board.forEach(row => row.forEach(cell => {
               if(cell.occupant === prev.currentPlayer) pieces.push({x: cell.x, y: cell.y});
           }));
           if (pieces.length > 0) {
               const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
               pieceX = randomPiece.x;
               pieceY = randomPiece.y;
           }
        }

        if (pieceX === -1) {
            return {
                ...prev,
                currentPlayer: switchPlayer(prev.currentPlayer, prev.activePlayers),
                phase: GamePhase.ACTION_SELECT,
                turnTimer: TURN_TIME_LIMIT,
                selectedPiece: null,
                validMoves: [],
                movedTo: null,
                isAiThinking: false
            };
        }

        const sides: (keyof WallState)[] = ['top', 'right', 'bottom', 'left'];
        for (let i = sides.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sides[i], sides[j]] = [sides[j], sides[i]];
        }
        
        let newBoard = prev.board;
        
        for (const side of sides) {
            if (!prev.board[pieceY][pieceX].walls[side]) {
                 newBoard = placeWall(prev.board, pieceX, pieceY, side, prev.currentPlayer);
                 break;
            }
        }
        
        const isGameOver = checkGameEndCondition(newBoard, prev.activePlayers);
        if (isGameOver) {
             const scores = calculateScores(newBoard, prev.activePlayers);
             return {
                 ...prev,
                 board: newBoard,
                 phase: GamePhase.GAME_OVER,
                 winner: null,
                 scores,
                 isAiThinking: false
             };
        }

        return {
            ...prev,
            board: newBoard,
            currentPlayer: switchPlayer(prev.currentPlayer, prev.activePlayers),
            phase: GamePhase.ACTION_SELECT,
            turnTimer: TURN_TIME_LIMIT,
            selectedPiece: null,
            validMoves: [],
            movedTo: null,
            isAiThinking: false
        };
      });
  }, [switchPlayer]);

  // --- Timer Effect ---
  useEffect(() => {
    // Timer is paused during Placement to reduce pressure
    if (gameState.phase === GamePhase.GAME_OVER || gameState.phase === GamePhase.PLACEMENT || !gameState.gameMode) return;

    timerRef.current = window.setInterval(() => {
      setGameState(prev => {
        if (prev.turnTimer <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...prev, turnTimer: 0 };
        }
        return { ...prev, turnTimer: prev.turnTimer - 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.phase, gameState.currentPlayer, gameState.gameMode]); 

  // Handle Timeout Trigger
  useEffect(() => {
      if (gameState.turnTimer === 0 && gameState.phase !== GamePhase.GAME_OVER && gameState.phase !== GamePhase.PLACEMENT) {
          handleRandomWallPlacement();
      }
  }, [gameState.turnTimer, gameState.phase, handleRandomWallPlacement]);


  // --- Interaction Handlers ---

  const handleCellClick = (x: number, y: number) => {
    // Block interaction if Game Over OR if AI is thinking
    if (gameState.phase === GamePhase.GAME_OVER || gameState.isAiThinking) return;
    
    // Block if it's AI turn
    if (gameState.gameMode === GameMode.PVAI && gameState.currentPlayer === Player.BLUE) return;

    // --- PHASE: PLACEMENT ---
    if (gameState.phase === GamePhase.PLACEMENT) {
        if (gameState.board[y][x].occupant === null) {
            // Place Piece
            const newBoard = gameState.board.map(r => r.map(c => ({...c})));
            newBoard[y][x].occupant = gameState.currentPlayer;

            // Update State & Queue
            setGameState(prev => {
                const newQueue = [...prev.placementQueue];
                const nextPlayer = newQueue.shift();

                if (!nextPlayer) {
                    // Start Game!
                    return {
                        ...prev,
                        board: newBoard,
                        phase: GamePhase.ACTION_SELECT,
                        currentPlayer: Player.RED, // Player 1 always starts movement? Or next in rotation? usually P1.
                        turnTimer: TURN_TIME_LIMIT,
                        placementQueue: []
                    };
                } else {
                    return {
                        ...prev,
                        board: newBoard,
                        currentPlayer: nextPlayer,
                        placementQueue: newQueue
                    };
                }
            });
        }
        return;
    }

    // --- PHASE: SELECT PIECE ---
    if (gameState.phase === GamePhase.ACTION_SELECT) {
        const cell = gameState.board[y][x];
        if (cell.occupant === gameState.currentPlayer) {
            const moves = getValidMoves(gameState.board, { x, y });
            setGameState(prev => ({
                ...prev,
                selectedPiece: { x, y },
                validMoves: moves,
                phase: GamePhase.ACTION_MOVE
            }));
        }
        return;
    }

    // --- PHASE: MOVE PIECE ---
    if (gameState.phase === GamePhase.ACTION_MOVE) {
        const isValid = gameState.validMoves.some(m => m.x === x && m.y === y);
        
        if (isValid && gameState.selectedPiece) {
            const newBoard = gameState.board.map(r => r.map(c => ({...c})));
            
            newBoard[gameState.selectedPiece.y][gameState.selectedPiece.x].occupant = null;
            newBoard[y][x].occupant = gameState.currentPlayer;

            setGameState(prev => ({
                ...prev,
                board: newBoard,
                movedTo: { x, y },
                phase: GamePhase.ACTION_WALL
            }));
        } else if (gameState.board[y][x].occupant === gameState.currentPlayer) {
            // Allow changing selection
            const moves = getValidMoves(gameState.board, { x, y });
            setGameState(prev => ({
                ...prev,
                selectedPiece: { x, y },
                validMoves: moves
            }));
        }
        return;
    }
  };

  const handleWallClick = (x: number, y: number, side: keyof WallState) => {
      if (gameState.phase !== GamePhase.ACTION_WALL) return;
      if (!gameState.movedTo) return;
      
      // Block interaction if AI turn
      if (gameState.gameMode === GameMode.PVAI && gameState.currentPlayer === Player.BLUE) return;

      if (gameState.movedTo.x !== x || gameState.movedTo.y !== y) return;

      const newBoard = placeWall(gameState.board, x, y, side, gameState.currentPlayer);
      
      setGameState(prev => ({ ...prev, board: newBoard }));
      endTurn();
  };

  const handleUnselectPiece = () => {
      if (gameState.phase !== GamePhase.ACTION_MOVE) return;
      setGameState(prev => ({
          ...prev,
          phase: GamePhase.ACTION_SELECT,
          selectedPiece: null,
          validMoves: []
      }));
  };

  const handleStartGame = (mode: GameMode, playerCount: number, names: { [key in Player]?: string }) => {
      // --- TRACKING: GAME START (GA4) ---
      logEvent('game_start', {
        mode: mode,
        players: playerCount,
      });

      // --- HYBRID INCREMENT ---
      // Optimistic update first
      setMatchCount(prev => (prev || 0) + 1);
      incrementMatchCount().then(newGlobalCount => {
          if (newGlobalCount) {
             setMatchCount(newGlobalCount);
             setCountSource('GLOBAL');
          }
      });

      const activePlayers = [Player.RED, Player.BLUE, Player.GREEN, Player.YELLOW].slice(0, playerCount);

      // Create Placement Queue
      // Each player places 2 pieces. 
      // Order: P1, P2, P3... then P1, P2, P3...
      let queue: Player[] = [];
      for(let i=0; i<2; i++) { 
          queue = queue.concat(activePlayers);
      }
      
      // Setup Game for Placement Phase
      setGameState(prev => ({ 
          ...prev, 
          gameMode: mode,
          activePlayers,
          currentPlayer: queue[0], // First player to place
          placementQueue: queue.slice(1), // Remaining queue
          board: createInitialBoard(),
          phase: GamePhase.PLACEMENT,
          scores: activePlayers.reduce((acc, p) => ({...acc, [p]: 0}), {})
      }));
      setPlayerNames(names);
  };

  const resetGame = () => {
    // --- TRACKING: GAME RESET ---
    logEvent('game_reset');

    setGameState({
        board: createInitialBoard(),
        currentPlayer: Player.RED,
        activePlayers: [Player.RED, Player.BLUE],
        phase: GamePhase.PLACEMENT,
        turnTimer: TURN_TIME_LIMIT,
        winner: null,
        scores: { [Player.RED]: 0, [Player.BLUE]: 0 },
        placementQueue: [],
        selectedPiece: null,
        validMoves: [],
        movedTo: null,
        showRules: false,
        gameMode: null, // Go back to menu
        isAiThinking: false
    });
  };

  return (
    <div className="game-canvas flex flex-col justify-between w-[95vw] max-w-md h-[92vh] max-h-[900px] rounded-sm p-4 z-10 relative overflow-hidden">
      
      {/* Decorative Stitch Border */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none stitch-border z-0">
          <rect x="8" y="8" width="calc(100% - 16px)" height="calc(100% - 16px)" rx="4" />
      </svg>
      
      {!gameState.gameMode && (
          <StartScreen 
            onStart={handleStartGame} 
            matchCount={matchCount}
            countSource={countSource}
            isLoadingCount={isCountLoading}
          />
      )}
      
      {gameState.showRules && <RulesModal onClose={() => setGameState(prev => ({...prev, showRules: false}))} />}

      {/* Header */}
      <header className="relative z-10 flex justify-between items-start mb-2 flex-none">
         <div className="flex flex-col">
            <div className="flex items-center gap-1.5 opacity-60">
                 {/* Dynamic Label based on Source */}
                 {countSource === 'GLOBAL' ? (
                     <Globe size={10} className="text-[var(--ink)]" />
                 ) : (
                     <Database size={10} className="text-[var(--ink)]" />
                 )}
                 <span className="mono text-[0.6rem] tracking-widest">
                    {countSource === 'GLOBAL' ? 'GLOBAL MATCHES' : 'LOCAL MATCHES'} // {(matchCount || 0).toLocaleString()}
                 </span>
            </div>
            <h1 className="font-serif text-3xl font-bold italic leading-none text-[var(--ink)] mt-1">
                Stitched<br/>Territory
            </h1>
         </div>
         <button 
           onClick={() => setGameState(prev => ({...prev, showRules: true}))}
           className="w-8 h-8 flex items-center justify-center border border-[var(--ink)] rounded-full hover:bg-[var(--ink)] hover:text-[var(--parchment)] transition-colors mt-1"
         >
           <span className="mono font-bold text-lg">?</span>
         </button>
      </header>
      
      {/* Game Board Area - RELATIVE wrapper for absolute board positioning */}
      <main className="relative z-10 flex-1 min-h-0 w-full">
         {gameState.isAiThinking && (
             <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--parchment)]/20 backdrop-blur-[1px]">
                 <div className="bg-[var(--ink)] text-[var(--parchment)] px-4 py-2 rounded-sm flex items-center gap-2 shadow-lg animate-pulse">
                     <Loader2 className="animate-spin" size={16} />
                     <span className="mono text-xs tracking-widest">
                         {gameState.phase === GamePhase.PLACEMENT ? 'CHOOSING START' : 'CALCULATING'}
                     </span>
                 </div>
             </div>
         )}
         <Board 
            board={gameState.board} 
            validMoves={gameState.validMoves}
            selectedPiece={gameState.selectedPiece}
            movedTo={gameState.movedTo}
            phase={gameState.phase}
            currentPlayer={gameState.currentPlayer}
            onCellClick={handleCellClick}
            onWallClick={handleWallClick}
         />
      </main>

      {/* Footer Controls */}
      <footer className="relative z-10 flex-none mt-4 transition-all">
        <Controls 
            phase={gameState.phase}
            currentPlayer={gameState.currentPlayer}
            timeLeft={gameState.turnTimer}
            winner={gameState.winner}
            onReset={resetGame}
            onUnselect={handleUnselectPiece}
            scores={gameState.scores}
            isAiThinking={gameState.isAiThinking}
            gameMode={gameState.gameMode}
            activePlayers={gameState.activePlayers}
            playerNames={playerNames}
        />
      </footer>
    </div>
  );
};

export default App;
