import { BOARD_SIZE, CellData, Coordinate, Player, WallState } from '../types';

// Create initial empty board
export const createInitialBoard = (): CellData[][] => {
  const board: CellData[][] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: CellData[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push({
        x,
        y,
        occupant: null,
        walls: { top: null, right: null, bottom: null, left: null },
      });
    }
    board.push(row);
  }
  return board;
};

// Check if a coordinate is within bounds
export const isValidCoordinate = (c: Coordinate): boolean => {
  return c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE;
};

// Add a wall between two cells or on the edge
export const placeWall = (board: CellData[][], x: number, y: number, side: keyof WallState, player: Player): CellData[][] => {
  const newBoard = board.map(row => row.map(cell => ({ ...cell, walls: { ...cell.walls } })));
  
  // Set wall on current cell
  newBoard[y][x].walls[side] = player;

  // Set wall on adjacent cell if it exists
  if (side === 'top' && y > 0) newBoard[y - 1][x].walls.bottom = player;
  if (side === 'bottom' && y < BOARD_SIZE - 1) newBoard[y + 1][x].walls.top = player;
  if (side === 'left' && x > 0) newBoard[y][x - 1].walls.right = player;
  if (side === 'right' && x < BOARD_SIZE - 1) newBoard[y][x + 1].walls.left = player;

  return newBoard;
};

// Check if movement is blocked by a wall between two adjacent cells
export const isBlocked = (from: CellData, to: CellData): boolean => {
  if (to.x === from.x && to.y === from.y - 1) return from.walls.top !== null;    // Moving Up
  if (to.x === from.x && to.y === from.y + 1) return from.walls.bottom !== null; // Moving Down
  if (to.x === from.x - 1 && to.y === from.y) return from.walls.left !== null;   // Moving Left
  if (to.x === from.x + 1 && to.y === from.y) return from.walls.right !== null;  // Moving Right
  return true; // Should be adjacent
};

// BFS to find valid moves (0, 1, or 2 steps)
export const getValidMoves = (board: CellData[][], start: Coordinate): Coordinate[] => {
  const validMoves: Coordinate[] = [];
  const queue: { coord: Coordinate; dist: number }[] = [{ coord: start, dist: 0 }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  
  // 0 steps is a valid move (staying in place)
  validMoves.push(start);

  while (queue.length > 0) {
    const { coord, dist } = queue.shift()!;
    
    if (dist >= 2) continue;

    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];

    for (const dir of directions) {
      const nextX = coord.x + dir.dx;
      const nextY = coord.y + dir.dy;
      const nextCoord = { x: nextX, y: nextY };

      if (isValidCoordinate(nextCoord)) {
        const currentCell = board[coord.y][coord.x];
        const targetCell = board[nextY][nextX];

        // Check walls and occupants
        if (!isBlocked(currentCell, targetCell) && targetCell.occupant === null) {
           const key = `${nextX},${nextY}`;
           if (!visited.has(key)) {
             visited.add(key);
             validMoves.push(nextCoord);
             queue.push({ coord: nextCoord, dist: dist + 1 });
           }
        }
      }
    }
  }

  return validMoves;
};

// Flood fill to calculate territory size and check connectivity
// Returns a set of reachable coordinates strings "x,y"
export const getReachableArea = (board: CellData[][], player: Player): Set<string> => {
  const queue: Coordinate[] = [];
  const visited = new Set<string>();

  // Initialize with all pieces of the player
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x].occupant === player) {
        queue.push({ x, y });
        visited.add(`${x},${y}`);
      }
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = curr.x + dir.dx;
      const ny = curr.y + dir.dy;

      if (isValidCoordinate({ x: nx, y: ny })) {
        const currentCell = board[curr.y][curr.x];
        const nextCell = board[ny][nx];
        const key = `${nx},${ny}`;

        if (!isBlocked(currentCell, nextCell)) {
           if (!visited.has(key) && nextCell.occupant === null) {
             visited.add(key);
             queue.push({ x: nx, y: ny });
           }
        }
      }
    }
  }
  return visited;
};

export const checkGameEndCondition = (board: CellData[][]): boolean => {
  // Game ends when Red pieces cannot reach Blue pieces.
  
  const queue: Coordinate[] = [];
  const visited = new Set<string>();
  
  // Start from all Red pieces
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (board[y][x].occupant === Player.RED) {
        queue.push({x,y});
        visited.add(`${x},${y}`);
      }
    }
  }

  while(queue.length > 0) {
    const curr = queue.shift()!;
    const directions = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
        const nx = curr.x + dir.dx;
        const ny = curr.y + dir.dy;
        
        if (isValidCoordinate({x: nx, y: ny})) {
            const currentCell = board[curr.y][curr.x];
            const nextCell = board[ny][nx];
            const key = `${nx},${ny}`;

            if (!isBlocked(currentCell, nextCell)) {
                // If we found a BLUE piece, there is still a path!
                if (nextCell.occupant === Player.BLUE) {
                    return false; // Not separated yet
                }
                
                if (nextCell.occupant === null && !visited.has(key)) {
                    visited.add(key);
                    queue.push({x: nx, y: ny});
                }
            }
        }
    }
  }

  return true; // No path found to any Blue piece
};

export const calculateScores = (board: CellData[][]): { [key in Player]: number } => {
  const redReach = getReachableArea(board, Player.RED);
  const blueReach = getReachableArea(board, Player.BLUE);
  
  return {
    [Player.RED]: redReach.size,
    [Player.BLUE]: blueReach.size
  };
};

export const calculateLargestTerritory = (board: CellData[][], player: Player): number => {
    let maxTerritory = 0;
    const visitedGlobal = new Set<string>();

    const playerPieces: Coordinate[] = [];
    for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
            if (board[y][x].occupant === player) {
                playerPieces.push({x,y});
            }
        }
    }

    for (const startPiece of playerPieces) {
        const key = `${startPiece.x},${startPiece.y}`;
        if (visitedGlobal.has(key)) continue;

        let currentSize = 0;
        const queue = [startPiece];
        const visitedLocal = new Set<string>();
        visitedLocal.add(key);
        visitedGlobal.add(key);
        currentSize++;

        while(queue.length > 0) {
            const curr = queue.shift()!;
            
            const directions = [
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
            ];

            for (const dir of directions) {
                const nx = curr.x + dir.dx;
                const ny = curr.y + dir.dy;
                if (isValidCoordinate({x:nx, y:ny})) {
                    const currentCell = board[curr.y][curr.x];
                    const nextCell = board[ny][nx];
                    const nKey = `${nx},${ny}`;
                    
                    if (!isBlocked(currentCell, nextCell)) {
                        if ((nextCell.occupant === null || nextCell.occupant === player) && !visitedLocal.has(nKey)) {
                             if (nextCell.occupant === null && !visitedLocal.has(nKey)) {
                                 visitedLocal.add(nKey);
                                 visitedGlobal.add(nKey);
                                 queue.push({x:nx, y:ny});
                                 currentSize++;
                             }
                        }
                    }
                }
            }
        }
        if (currentSize > maxTerritory) maxTerritory = currentSize;
    }
    return maxTerritory;
}