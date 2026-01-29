
export enum Player {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW'
}

export enum GamePhase {
  PLACEMENT = 'PLACEMENT',
  ACTION_SELECT = 'ACTION_SELECT', // Choosing a piece to move
  ACTION_MOVE = 'ACTION_MOVE',     // Choosing destination
  ACTION_WALL = 'ACTION_WALL',     // Placing a wall
  GAME_OVER = 'GAME_OVER',
}

export enum GameMode {
  PVP = 'PVP',
  PVAI = 'PVAI'
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface WallState {
  top: Player | null;
  right: Player | null;
  bottom: Player | null;
  left: Player | null;
}

export interface CellData {
  x: number;
  y: number;
  occupant: Player | null;
  walls: WallState;
}

export interface GameState {
  board: CellData[][];
  currentPlayer: Player;
  activePlayers: Player[]; // NEW: Tracks who is in the current game
  phase: GamePhase;
  turnTimer: number;
  winner: Player | 'DRAW' | null;
  scores: { [key in Player]?: number }; // Optional because not all players might play
  
  // Game Mode
  gameMode: GameMode | null; // Null means we are in the menu
  
  // Placement phase specific
  placementQueue: Player[]; // Who needs to place next
  
  // Action phase specific
  selectedPiece: Coordinate | null; // The piece currently acting
  validMoves: Coordinate[]; // Where selected piece can go
  movedTo: Coordinate | null; // Where the piece moved to (waiting for wall)
  
  // UI State
  showRules: boolean;
  isAiThinking: boolean;
}

export type CounterSource = 'GLOBAL' | 'LOCAL' | 'OFFLINE';

export const TURN_TIME_LIMIT = 90; // seconds
