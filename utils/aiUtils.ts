
import { 
    CellData, 
    Coordinate, 
    Player, 
    WallState
} from '../types';
import { 
    getValidMoves, 
    getReachableArea
} from './boardUtils';

// Helper to deep clone the board once
const deepCloneBoard = (board: CellData[][]): CellData[][] => {
    return board.map(row => row.map(cell => ({
        ...cell,
        walls: { ...cell.walls }
    })));
};

interface AiMove {
    from: Coordinate;
    to: Coordinate;
    wallSide: keyof WallState;
    score: number;
}

/**
 * The AI "Brain".
 * Optimized with backtracking to avoid excessive memory allocation.
 */
export const calculateBestMove = (originalBoard: CellData[][], aiPlayer: Player, opponent: Player): AiMove | null => {
    console.time("AI_THINK");
    const boardSize = originalBoard.length;
    let bestMove: AiMove | null = null;
    let maxScore = -Infinity;
    let evaluations = 0;

    // 1. Create a MUTABLE working copy of the board
    const board = deepCloneBoard(originalBoard);

    // 2. Find all AI pieces
    const aiPieces: Coordinate[] = [];
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (board[y][x].occupant === aiPlayer) {
                aiPieces.push({ x, y });
            }
        }
    }

    const possibleWalls: (keyof WallState)[] = ['top', 'right', 'bottom', 'left'];

    // 3. Iterate every piece
    for (const piece of aiPieces) {
        // Get valid moves (BFS is fast enough to run on the clone)
        const moves = getValidMoves(board, piece);

        for (const move of moves) {
            // --- DO MOVE ---
            board[piece.y][piece.x].occupant = null;
            board[move.y][move.x].occupant = aiPlayer;

            // 4. Iterate every possible wall placement
            for (const side of possibleWalls) {
                // Check if wall is already there
                if (board[move.y][move.x].walls[side] !== null) continue;

                // --- DO WALL ---
                // Manually apply wall to avoid creating new board objects
                applyWall(board, move.x, move.y, side, aiPlayer);

                // 5. Evaluate
                const score = evaluateBoardState(board, aiPlayer, opponent);
                evaluations++;

                // Add randomness
                const randomBias = Math.random() * 0.5;
                if (score + randomBias > maxScore) {
                    maxScore = score + randomBias;
                    bestMove = {
                        from: { ...piece },
                        to: { ...move },
                        wallSide: side,
                        score: maxScore
                    };
                }

                // --- UNDO WALL ---
                removeWall(board, move.x, move.y, side);
            }

            // --- UNDO MOVE ---
            board[move.y][move.x].occupant = null;
            board[piece.y][piece.x].occupant = aiPlayer;
        }
    }

    console.timeEnd("AI_THINK");
    console.log(`AI Evaluated ${evaluations} states. Best Score: ${maxScore}`);
    
    return bestMove;
};

// Apply wall in-place (Mutation)
const applyWall = (board: CellData[][], x: number, y: number, side: keyof WallState, player: Player) => {
    const size = board.length;
    board[y][x].walls[side] = player;
    if (side === 'top' && y > 0) board[y - 1][x].walls.bottom = player;
    if (side === 'bottom' && y < size - 1) board[y + 1][x].walls.top = player;
    if (side === 'left' && x > 0) board[y][x - 1].walls.right = player;
    if (side === 'right' && x < size - 1) board[y][x + 1].walls.left = player;
};

// Remove wall in-place (Backtracking)
const removeWall = (board: CellData[][], x: number, y: number, side: keyof WallState) => {
    const size = board.length;
    board[y][x].walls[side] = null;
    if (side === 'top' && y > 0) board[y - 1][x].walls.bottom = null;
    if (side === 'bottom' && y < size - 1) board[y + 1][x].walls.top = null;
    if (side === 'left' && x > 0) board[y][x - 1].walls.right = null;
    if (side === 'right' && x < size - 1) board[y][x + 1].walls.left = null;
};

/**
 * Heuristic Function.
 * Score = (AI Reachable Area) - (Opponent Reachable Area * AggressionFactor)
 */
const evaluateBoardState = (board: CellData[][], aiPlayer: Player, opponent: Player): number => {
    const aiReach = getReachableArea(board, aiPlayer).size;
    const opReach = getReachableArea(board, opponent).size;

    // We weight blocking the opponent slightly higher than expanding our own territory.
    const AGGRESSION_FACTOR = 1.2;

    return aiReach - (opReach * AGGRESSION_FACTOR);
};
