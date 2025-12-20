class Pathfinding {
    constructor(gameState, gridSize = 50) {
        this.gameState = gameState;
        this.gridSize = gridSize; // Size of each grid cell for pathfinding
        this.grid = null;
        this.gridWidth = 0;
        this.gridHeight = 0;
        this.lastGridUpdate = 0;
        this.gridUpdateInterval = 1000; // Update grid every 1 second
    }

    // Convert world coordinates to grid coordinates
    worldToGrid(x, y) {
        return {
            x: Math.floor(x / this.gridSize),
            y: Math.floor(y / this.gridSize)
        };
    }

    // Convert grid coordinates to world coordinates (center of cell)
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.gridSize + this.gridSize / 2,
            y: gridY * this.gridSize + this.gridSize / 2
        };
    }

    // Build collision grid from walls
    buildGrid() {
        const gameConfig = require('../../config/gameConfig');
        const world = gameConfig.world;
        this.gridWidth = Math.ceil(world.width / this.gridSize);
        this.gridHeight = Math.ceil(world.height / this.gridSize);
        
        // Initialize grid - false = walkable, true = blocked
        this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(false));
        
        // Mark cells that have walls as blocked
        for (let gridY = 0; gridY < this.gridHeight; gridY++) {
            for (let gridX = 0; gridX < this.gridWidth; gridX++) {
                const worldPos = this.gridToWorld(gridX, gridY);
                
                // Check if this grid cell intersects with any wall
                // Use a slightly smaller radius to allow movement near walls
                const cellRadius = this.gridSize * 0.3;
                if (this.gameState.checkWallCollision(worldPos.x, worldPos.y, cellRadius)) {
                    this.grid[gridY][gridX] = true; // Blocked
                }
            }
        }
        
        this.lastGridUpdate = Date.now();
    }

    // Get neighbors of a grid cell (8-directional movement)
    getNeighbors(gridX, gridY) {
        const neighbors = [];
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip center cell
                
                const newX = gridX + dx;
                const newY = gridY + dy;
                
                // Check bounds
                if (newX >= 0 && newX < this.gridWidth && newY >= 0 && newY < this.gridHeight) {
                    // Check if walkable
                    if (!this.grid[newY][newX]) {
                        neighbors.push({
                            x: newX,
                            y: newY,
                            cost: Math.abs(dx) + Math.abs(dy) > 1 ? 1.414 : 1 // Diagonal movement costs more
                        });
                    }
                }
            }
        }
        
        return neighbors;
    }

    // Heuristic function (Manhattan distance)
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    // A* pathfinding algorithm
    findPath(startX, startY, targetX, targetY) {
        // Update grid if needed
        if (!this.grid || Date.now() - this.lastGridUpdate > this.gridUpdateInterval) {
            this.buildGrid();
        }

        const start = this.worldToGrid(startX, startY);
        const goal = this.worldToGrid(targetX, targetY);
        
        // Check if start or goal are blocked
        if (this.grid[start.y] && this.grid[start.y][start.x]) {
            return null;
        }
        
        if (this.grid[goal.y] && this.grid[goal.y][goal.x]) {
            return null;
        }

        const openSet = [{
            x: start.x,
            y: start.y,
            g: 0,
            h: this.heuristic(start, goal),
            f: this.heuristic(start, goal),
            parent: null
        }];
        
        const closedSet = new Set();
        const openSetMap = new Map();
        openSetMap.set(`${start.x},${start.y}`, openSet[0]);

        while (openSet.length > 0) {
            // Get node with lowest f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            openSetMap.delete(currentKey);
            closedSet.add(currentKey);

            // Check if we reached the goal
            if (current.x === goal.x && current.y === goal.y) {
                // Reconstruct path
                const path = [];
                let node = current;
                
                while (node) {
                    const worldPos = this.gridToWorld(node.x, node.y);
                    path.unshift(worldPos);
                    node = node.parent;
                }
                
                return path;
            }

            // Check all neighbors
            const neighbors = this.getNeighbors(current.x, current.y);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) {
                    continue;
                }
                
                const tentativeG = current.g + neighbor.cost;
                
                let neighborNode = openSetMap.get(neighborKey);
                
                if (!neighborNode) {
                    neighborNode = {
                        x: neighbor.x,
                        y: neighbor.y,
                        g: tentativeG,
                        h: this.heuristic(neighbor, goal),
                        f: tentativeG + this.heuristic(neighbor, goal),
                        parent: current
                    };
                    
                    openSet.push(neighborNode);
                    openSetMap.set(neighborKey, neighborNode);
                } else if (tentativeG < neighborNode.g) {
                    neighborNode.g = tentativeG;
                    neighborNode.f = tentativeG + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }
        
        // No path found
        return null;
    }

    // Get next waypoint for a bot (simplified interface)
    getNextWaypoint(botX, botY, targetX, targetY) {
        const path = this.findPath(botX, botY, targetX, targetY);
        
        if (!path || path.length < 2) {
            return null; // No path or already at destination
        }
        
        // Return the second waypoint (first is current position)
        return path[1];
    }

    // Check if direct line of sight exists between two points
    hasLineOfSight(x1, y1, x2, y2) {
        const steps = 20; // Number of collision checks along the line
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            
            if (this.gameState.checkWallCollision(x, y, 15)) {
                return false;
            }
        }
        
        return true;
    }
}

module.exports = Pathfinding;