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
          <p>Move your buttons and stitch walls to secure your territory. The tailor with the largest enclosed area wins.</p>
        </section>
        
        <section>
          <h3 className="mono font-bold text-sm mb-1">The Ritual</h3>
          <ol className="list-decimal pl-4 space-y-1 text-sm">
            <li><strong>Select</strong> a button to move.</li>
            <li><strong>Slide</strong> it 0, 1, or 2 spaces. No jumping over walls or other buttons.</li>
            <li><strong>Stitch</strong> a wall on any open side of your landing spot.</li>
          </ol>
        </section>

        <section>
          <h3 className="mono font-bold text-sm mb-1">Scoring</h3>
          <p className="text-sm">Game ends when territories are separated. Count reachable squares. Largest territory breaks ties.</p>
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
    phase: GamePhase.PLACEMENT,
    turnTimer: TURN_TIME_LIMIT,
    winner: null,
    scores: { [Player.RED]: 0, [Player.BLUE]: 0 },
    placementQueue: [Player.RED, Player.BLUE, Player.BLUE, Player.RED],
    selectedPiece: null,
    validMoves: [],
    movedTo: null,
    showRules: false,
    gameMode: null, // Starts at Menu
    isAiThinking: false
  });

  const [playerNames, setPlayerNames] = useState<{ [key in Player]: string }>({
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
  
  const switchPlayer = useCallback((current: Player) => {
    return current === Player.RED ? Player.BLUE : Player.RED;
  }, []);

  const endTurn = useCallback(() => {
    setGameState(prev => {
      // Check for win condition
      const isGameOver = checkGameEndCondition(prev.board);
      
      if (isGameOver) {
        // Calculate scores
        const scores = calculateScores(prev.board);
        let winner: Player | 'DRAW' | null = null;
        
        if (scores[Player.RED] > scores[Player.BLUE]) winner = Player.RED;
        else if (scores[Player.BLUE] > scores[Player.RED]) winner = Player.BLUE;
        else {
          // Tie breaker: Largest single territory
          const redMax = calculateLargestTerritory(prev.board, Player.RED);
          const blueMax = calculateLargestTerritory(prev.board, Player.BLUE);
          if (redMax > blueMax) winner = Player.RED;
          else if (blueMax > redMax) winner = Player.BLUE;
          else winner = 'DRAW';
        }

        // --- TRACKING: GAME COMPLETE ---
        logEvent('game_complete', {
          winner: winner,
          mode: prev.gameMode,
          score_red: scores[Player.RED],
          score_blue: scores[Player.BLUE]
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
        currentPlayer: switchPlayer(prev.currentPlayer),
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
    if (
        gameState.gameMode === GameMode.PVAI && 
        gameState.currentPlayer === Player.BLUE && 
        gameState.phase === GamePhase.ACTION_SELECT &&
        !gameState.isAiThinking
    ) {
        setGameState(prev => ({ ...prev, isAiThinking: true }));
    }
  }, [gameState.currentPlayer, gameState.phase, gameState.gameMode, gameState.isAiThinking]);

  // --- AI EXECUTION EFFECT ---
  // This watches ONLY the "Thinking" flag. When true, it runs the logic.
  // We split this from the Trigger Effect to avoid the cleanup-cancellation bug.
  useEffect(() => {
    if (!gameState.isAiThinking) return;

    // Use a timeout to allow the UI to render the "Thinking" state first
    const aiTimer = setTimeout(() => {
        try {
            const bestMove = calculateBestMove(gameState.board, Player.BLUE, Player.RED);

            if (bestMove) {
                // Apply the move logic
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

                // Short delay before officially ending turn so user sees the move
                setTimeout(() => endTurn(), 300);
            } else {
                // Fallback if trapped
                endTurn();
            }
        } catch (error) {
            console.error("AI Crashed:", error);
            endTurn(); // Force end turn so user isn't stuck
        }
    }, 500);

    return () => clearTimeout(aiTimer);
  }, [gameState.isAiThinking, gameState.board, endTurn]); // Dependencies needed for calculation


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

        if (pieceX === -1) return prev; 

        // Try to place wall on any open side
        const sides: (keyof WallState)[] = ['top', 'right', 'bottom', 'left'];
        // Shuffle sides
        for (let i = sides.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sides[i], sides[j]] = [sides[j], sides[i]];
        }
        
        let newBoard = prev.board;
        
        for (const side of sides) {
            // Check if wall exists (it's null if not exists)
            if (!prev.board[pieceY][pieceX].walls[side]) {
                 newBoard = placeWall(prev.board, pieceX, pieceY, side, prev.currentPlayer);
                 break;
            }
        }
        
        // CHECK GAME END
        const isGameOver = checkGameEndCondition(newBoard);
        if (isGameOver) {
             const scores = calculateScores(newBoard);
             let winner: Player | 'DRAW' | null = null;
             if (scores[Player.RED] > scores[Player.BLUE]) winner = Player.RED;
             else if (scores[Player.BLUE] > scores[Player.RED]) winner = Player.BLUE;
             else winner = 'DRAW'; 
             
             // --- TRACKING: GAME COMPLETE (TIMEOUT) ---
             logEvent('game_complete', {
                winner: winner,
                mode: prev.gameMode,
                reason: 'timeout_random_wall'
             });

             return {
                 ...prev,
                 board: newBoard,
                 phase: GamePhase.GAME_OVER,
                 winner,
                 scores,
                 isAiThinking: false
             };
        }

        return {
            ...prev,
            board: newBoard,
            currentPlayer: switchPlayer(prev.currentPlayer),
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


  // --- Initialization Effect (Placement Phase Setup) ---
  useEffect(() => {
    setGameState(prev => {
        const newBoard = [...prev.board];
        // Red Fixed
        newBoard[1][1] = { ...newBoard[1][1], occupant: Player.RED };
        newBoard[5][5] = { ...newBoard[5][5], occupant: Player.RED };
        // Blue Fixed
        newBoard[5][1] = { ...newBoard[5][1], occupant: Player.BLUE };
        newBoard[1][5] = { ...newBoard[1][5], occupant: Player.BLUE };
        
        return { ...prev, board: newBoard };
    });
  }, []);

  // --- Interaction Handlers ---

  const handleCellClick = (x: number, y: number) => {
    // Block interaction if Game Over OR if AI is thinking
    if (gameState.phase === GamePhase.GAME_OVER || gameState.isAiThinking) return;
    
    // Also block if it's AI turn (extra safety)
    if (gameState.gameMode === GameMode.PVAI && gameState.currentPlayer === Player.BLUE) return;

    // --- PLACEMENT PHASE ---
    if (gameState.phase === GamePhase.PLACEMENT) {
        if (gameState.board[y][x].occupant !== null) return; 

        const currentPlayerToPlace = gameState.placementQueue[0];
        if (!currentPlayerToPlace) return; 

        const newBoard = gameState.board.map(r => [...r]);
        newBoard[y][x] = { ...newBoard[y][x], occupant: currentPlayerToPlace };

        const newQueue = gameState.placementQueue.slice(1);
        
        if (newQueue.length === 0) {
            // All placed, start game
            setGameState(prev => ({
                ...prev,
                board: newBoard,
                phase: GamePhase.ACTION_SELECT,
                placementQueue: [],
                currentPlayer: Player.RED // Red starts action phase
            }));
        } else {
            setGameState(prev => ({
                ...prev,
                board: newBoard,
                placementQueue: newQueue,
                currentPlayer: newQueue[0]
            }));
        }
        return;
    }

    // --- ACTION: SELECT PIECE ---
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

    // --- ACTION: MOVE PIECE ---
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

  const handleStartGame = (mode: GameMode, names: { [key in Player]: string }) => {
      // --- TRACKING: GAME START (GA4) ---
      logEvent('game_start', {
        mode: mode,
        player1: names[Player.RED],
        player2: names[Player.BLUE]
      });

      // --- HYBRID INCREMENT ---
      // Optimistic update first
      setMatchCount(prev => (prev || 0) + 1);

      // Perform actual increment and update with REAL global data if successful
      incrementMatchCount().then(newGlobalCount => {
          if (newGlobalCount) {
             setMatchCount(newGlobalCount);
             setCountSource('GLOBAL');
          }
      });

      setGameState(prev => ({ ...prev, gameMode: mode }));
      setPlayerNames(names);
  };

  const resetGame = () => {
    // --- TRACKING: GAME RESET ---
    logEvent('game_reset');

    const freshBoard = createInitialBoard();
    freshBoard[1][1].occupant = Player.RED;
    freshBoard[5][5].occupant = Player.RED;
    freshBoard[5][1].occupant = Player.BLUE;
    freshBoard[1][5].occupant = Player.BLUE;

    setGameState({
        board: freshBoard,
        currentPlayer: Player.RED,
        phase: GamePhase.PLACEMENT,
        turnTimer: TURN_TIME_LIMIT,
        winner: null,
        scores: { [Player.RED]: 0, [Player.BLUE]: 0 },
        placementQueue: [Player.RED, Player.BLUE, Player.BLUE, Player.RED],
        selectedPiece: null,
        validMoves: [],
        movedTo: null,
        showRules: false,
        gameMode: null, // Go back to menu
        isAiThinking: false
    });
  };

  // Auto-Placement for AI (Blue) during placement phase
  useEffect(() => {
    if (gameState.gameMode === GameMode.PVAI && 
        gameState.phase === GamePhase.PLACEMENT && 
        gameState.placementQueue.length > 0 && 
        gameState.placementQueue[0] === Player.BLUE) {
        
        const timer = setTimeout(() => {
            setGameState(prev => {
                // Find first empty slot (simple logic for placement)
                let tx = -1, ty = -1;
                const emptySpots: Coordinate[] = [];
                for(let y=0; y<7; y++) {
                    for(let x=0; x<7; x++) {
                         if(prev.board[y][x].occupant === null) emptySpots.push({x,y});
                    }
                }
                
                if (emptySpots.length > 0) {
                    const randomIdx = Math.floor(Math.random() * emptySpots.length);
                    tx = emptySpots[randomIdx].x;
                    ty = emptySpots[randomIdx].y;
                }

                if (tx === -1) return prev; 

                const newBoard = prev.board.map(r => [...r]);
                newBoard[ty][tx] = { ...newBoard[ty][tx], occupant: Player.BLUE };

                const newQueue = prev.placementQueue.slice(1);
                const nextState = {
                    ...prev,
                    board: newBoard,
                    placementQueue: newQueue,
                };

                if (newQueue.length === 0) {
                    nextState.phase = GamePhase.ACTION_SELECT;
                    nextState.placementQueue = [];
                    nextState.currentPlayer = Player.RED;
                } else {
                    nextState.currentPlayer = newQueue[0];
                }
                return nextState;
            });
        }, 600);
        return () => clearTimeout(timer);
    }
  }, [gameState.gameMode, gameState.phase, gameState.placementQueue]);


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
                     <span className="mono text-xs tracking-widest">CALCULATING</span>
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
            isCompact={isCompact} 
            playerNames={playerNames}
        />
      </footer>
    </div>
  );
};

export default App;