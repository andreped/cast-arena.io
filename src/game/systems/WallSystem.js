const Wall = require('../entities/Wall');
const gameConfig = require('../../config/gameConfig');

class WallSystem {
    constructor() {
        this.walls = new Map();
        this.wallThickness = 30; // Increased from 20
        this.minDistanceFromSpawn = 150; // Increased spawn protection area
        this.seed = 12345; // Fixed seed for consistent generation
        this.generateWalls();
    }

    // Seeded random number generator
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    generatePerimeterWalls(world) {
        const borderThickness = this.wallThickness;
        
        // Create solid perimeter walls without gaps
        // Top wall
        const topWall = new Wall('perimeter_top', 'perimeter', 0, 0, world.width, borderThickness, []);
        this.walls.set(topWall.id, topWall);
        
        // Bottom wall
        const bottomWall = new Wall('perimeter_bottom', 'perimeter', 0, world.height - borderThickness, world.width, borderThickness, []);
        this.walls.set(bottomWall.id, bottomWall);
        
        // Left wall
        const leftWall = new Wall('perimeter_left', 'perimeter', 0, 0, borderThickness, world.height, []);
        this.walls.set(leftWall.id, leftWall);
        
        // Right wall
        const rightWall = new Wall('perimeter_right', 'perimeter', world.width - borderThickness, 0, borderThickness, world.height, []);
        this.walls.set(rightWall.id, rightWall);
    }

    generateWalls() {
        const { world } = gameConfig;
        
        // First, create perimeter walls around the entire map
        this.generatePerimeterWalls(world);
        
        const wallConfigs = [
            // Line walls - increased sizes
            { type: 'line', count: 6, minLength: 120, maxLength: 220 },
            // L-shaped walls - increased sizes
            { type: 'L', count: 3, minLength: 100, maxLength: 180 },
            // House-like structures - increased sizes
            { type: 'house', count: 2, minSize: 140, maxSize: 200 },
            // Window walls - increased sizes
            { type: 'window', count: 4, minLength: 150, maxLength: 250 }
        ];

        wallConfigs.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                this.generateWallOfType(config, world);
            }
        });
    }

    generateWallOfType(config, world) {
        const maxAttempts = 50;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const x = this.seededRandom() * (world.width - 200) + 100;
            const y = this.seededRandom() * (world.height - 200) + 100;
            
            // Check distance from center spawn area
            const centerX = world.width / 2;
            const centerY = world.height / 2;
            const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (distanceFromCenter < this.minDistanceFromSpawn) {
                continue;
            }
            
            let wall = null;
            
            switch (config.type) {
                case 'line':
                    wall = this.createLineWall(x, y, config);
                    break;
                case 'L':
                    wall = this.createLWall(x, y, config);
                    break;
                case 'house':
                    wall = this.createHouseWall(x, y, config);
                    break;
                case 'window':
                    wall = this.createWindowWall(x, y, config);
                    break;
            }
            
            if (wall && !this.checkCollisionWithExistingWalls(wall)) {
                this.walls.set(wall.id, wall);
                break;
            }
        }
    }

    createLineWall(x, y, config) {
        const length = config.minLength + this.seededRandom() * (config.maxLength - config.minLength);
        const isHorizontal = this.seededRandom() > 0.5;
        const id = `line_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        if (isHorizontal) {
            return new Wall(id, 'line', x, y, length, this.wallThickness);
        } else {
            return new Wall(id, 'line', x, y, this.wallThickness, length);
        }
    }

    createLWall(x, y, config) {
        const length1 = config.minLength + this.seededRandom() * (config.maxLength - config.minLength);
        const length2 = config.minLength + this.seededRandom() * (config.maxLength - config.minLength);
        const id = `L_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        // Create L-shape with two segments
        const segments = [
            { x: 0, y: 0, width: length1, height: this.wallThickness },
            { x: 0, y: 0, width: this.wallThickness, height: length2 }
        ];
        
        return new Wall(id, 'L', x, y, length1, length2, segments);
    }

    createHouseWall(x, y, config) {
        const size = config.minSize + this.seededRandom() * (config.maxSize - config.minSize);
        const doorWidth = 50; // Increased door width for easier player movement
        const id = `house_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        // Create house walls with 2-3 entrances
        const segments = [
            // Top wall
            { x: 0, y: 0, width: size, height: this.wallThickness },
            // Bottom wall with door
            { x: 0, y: size - this.wallThickness, width: size * 0.25, height: this.wallThickness },
            { x: size * 0.25 + doorWidth, y: size - this.wallThickness, width: size * 0.5 - doorWidth, height: this.wallThickness },
            { x: size * 0.75 + doorWidth, y: size - this.wallThickness, width: size * 0.25 - doorWidth, height: this.wallThickness },
            // Left wall with door
            { x: 0, y: 0, width: this.wallThickness, height: size * 0.3 },
            { x: 0, y: size * 0.3 + doorWidth, width: this.wallThickness, height: size * 0.7 - doorWidth },
            // Right wall
            { x: size - this.wallThickness, y: 0, width: this.wallThickness, height: size }
        ];
        
        return new Wall(id, 'house', x, y, size, size, segments);
    }

    createWindowWall(x, y, config) {
        const length = config.minLength + this.seededRandom() * (config.maxLength - config.minLength);
        const isHorizontal = this.seededRandom() > 0.5;
        const windowSize = 40; // Increased window size for easier shooting
        const windowCount = 1 + Math.floor(this.seededRandom() * 2); // 1-2 windows (reduced for larger windows)
        const id = `window_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        const segments = [];
        
        if (isHorizontal) {
            const totalGapSpace = windowCount * windowSize;
            const wallSpace = length - totalGapSpace;
            const segmentLength = wallSpace / (windowCount + 1);
            
            let currentX = 0;
            for (let i = 0; i <= windowCount; i++) {
                if (i < windowCount) {
                    // Add wall segment
                    segments.push({
                        x: currentX,
                        y: 0,
                        width: segmentLength,
                        height: this.wallThickness
                    });
                    currentX += segmentLength + windowSize;
                } else {
                    // Final wall segment
                    segments.push({
                        x: currentX,
                        y: 0,
                        width: segmentLength,
                        height: this.wallThickness
                    });
                }
            }
            return new Wall(id, 'window', x, y, length, this.wallThickness, segments);
        } else {
            const totalGapSpace = windowCount * windowSize;
            const wallSpace = length - totalGapSpace;
            const segmentLength = wallSpace / (windowCount + 1);
            
            let currentY = 0;
            for (let i = 0; i <= windowCount; i++) {
                if (i < windowCount) {
                    // Add wall segment
                    segments.push({
                        x: 0,
                        y: currentY,
                        width: this.wallThickness,
                        height: segmentLength
                    });
                    currentY += segmentLength + windowSize;
                } else {
                    // Final wall segment
                    segments.push({
                        x: 0,
                        y: currentY,
                        width: this.wallThickness,
                        height: segmentLength
                    });
                }
            }
            return new Wall(id, 'window', x, y, this.wallThickness, length, segments);
        }
    }

    checkCollisionWithExistingWalls(newWall) {
        const buffer = 30; // Minimum distance between walls
        
        for (const [id, existingWall] of this.walls) {
            if (newWall.x < existingWall.x + existingWall.width + buffer &&
                newWall.x + newWall.width > existingWall.x - buffer &&
                newWall.y < existingWall.y + existingWall.height + buffer &&
                newWall.y + newWall.height > existingWall.y - buffer) {
                return true;
            }
        }
        return false;
    }

    getWallsInArea(x, y, width, height) {
        const wallsInArea = [];
        for (const [id, wall] of this.walls) {
            if (wall.x < x + width && 
                wall.x + wall.width > x && 
                wall.y < y + height && 
                wall.y + wall.height > y) {
                wallsInArea.push(wall);
            }
        }
        return wallsInArea;
    }

    checkCollision(x, y, radius = 0) {
        for (const [id, wall] of this.walls) {
            if (wall.collidesWith(x, y, radius)) {
                return wall;
            }
        }
        return null;
    }

    checkLineCollision(x1, y1, x2, y2) {
        for (const [id, wall] of this.walls) {
            if (wall.intersectsLine(x1, y1, x2, y2)) {
                return wall;
            }
        }
        return null;
    }

    getAllWalls() {
        const walls = {};
        for (const [id, wall] of this.walls) {
            walls[id] = wall.toJSON();
        }
        return walls;
    }

    // Find a safe spawn position that doesn't collide with walls
    findSafeSpawnPosition(worldWidth, worldHeight, playerRadius = 25) {
        const maxAttempts = 100;
        const margin = playerRadius + 10; // Extra safety margin
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate random position with margins from world edges
            const x = margin + Math.random() * (worldWidth - 2 * margin);
            const y = margin + Math.random() * (worldHeight - 2 * margin);
            
            // Check if this position collides with any wall
            if (!this.checkCollision(x, y, playerRadius)) {
                return { x, y };
            }
        }
        
        // Fallback: return center position (should be safe due to minDistanceFromSpawn)
        return { x: worldWidth / 2, y: worldHeight / 2 };
    }
}

module.exports = WallSystem;
