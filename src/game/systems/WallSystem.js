const Wall = require('../entities/Wall');
const gameConfig = require('../../config/gameConfig');

class WallSystem {
    constructor() {
        this.walls = new Map();
        this.wallThickness = 20;
        this.minDistanceFromSpawn = 100;
        this.seed = 12345; // Fixed seed for consistent generation
        this.generateWalls();
    }

    // Seeded random number generator
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    generateWalls() {
        const { world } = gameConfig;
        const wallConfigs = [
            // Line walls
            { type: 'line', count: 8, minLength: 80, maxLength: 160 },
            // L-shaped walls
            { type: 'L', count: 4, minLength: 60, maxLength: 120 },
            // House-like structures
            { type: 'house', count: 3, minSize: 80, maxSize: 140 },
            // Window walls
            { type: 'window', count: 6, minLength: 100, maxLength: 180 }
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
        const doorWidth = 30;
        const id = `house_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        // Create house walls with 2-3 entrances
        const segments = [
            // Top wall
            { x: 0, y: 0, width: size, height: this.wallThickness },
            // Bottom wall with door
            { x: 0, y: size - this.wallThickness, width: size * 0.3, height: this.wallThickness },
            { x: size * 0.3 + doorWidth, y: size - this.wallThickness, width: size * 0.4 - doorWidth, height: this.wallThickness },
            { x: size * 0.7 + doorWidth, y: size - this.wallThickness, width: size * 0.3 - doorWidth, height: this.wallThickness },
            // Left wall
            { x: 0, y: 0, width: this.wallThickness, height: size * 0.4 },
            { x: 0, y: size * 0.4 + doorWidth, width: this.wallThickness, height: size * 0.6 - doorWidth },
            // Right wall
            { x: size - this.wallThickness, y: 0, width: this.wallThickness, height: size }
        ];
        
        return new Wall(id, 'house', x, y, size, size, segments);
    }

    createWindowWall(x, y, config) {
        const length = config.minLength + this.seededRandom() * (config.maxLength - config.minLength);
        const isHorizontal = this.seededRandom() > 0.5;
        const windowSize = 25;
        const windowCount = 1 + Math.floor(this.seededRandom() * 3); // 1-3 windows
        const id = `window_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        const segments = [];
        
        if (isHorizontal) {
            const segmentLength = length / (windowCount * 2 + 1);
            for (let i = 0; i <= windowCount * 2; i += 2) {
                segments.push({
                    x: i * segmentLength,
                    y: 0,
                    width: segmentLength,
                    height: this.wallThickness
                });
            }
            return new Wall(id, 'window', x, y, length, this.wallThickness, segments);
        } else {
            const segmentLength = length / (windowCount * 2 + 1);
            for (let i = 0; i <= windowCount * 2; i += 2) {
                segments.push({
                    x: 0,
                    y: i * segmentLength,
                    width: this.wallThickness,
                    height: segmentLength
                });
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
}

module.exports = WallSystem;
