const Wall = require('../entities/Wall');
const gameConfig = require('../../config/gameConfig');

class WallSystem {
    constructor() {
        this.walls = new Map();
        this.wallThickness = 30; // Increased from 20
        this.minDistanceFromSpawn = 150; // Increased spawn protection area
        this.seed = 12345; // Fixed seed for consistent wall layout across restarts
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
            // Line walls - more and varied sizes
            { type: 'line', count: 12, minLength: 80, maxLength: 280 },
            // L-shaped walls - more complex structures
            { type: 'L', count: 8, minLength: 80, maxLength: 200 },
            // House-like structures - more complete buildings
            { type: 'house', count: 6, minSize: 120, maxSize: 220 },
            // Window walls - varied openings
            { type: 'window', count: 8, minLength: 100, maxLength: 300 },
            // New: Cross-shaped intersections
            { type: 'cross', count: 4, minSize: 100, maxSize: 180 },
            // New: Maze-like corridors
            { type: 'corridor', count: 6, minLength: 150, maxLength: 250 },
            // New: Fortress-like structures
            { type: 'fortress', count: 3, minSize: 180, maxSize: 280 },
            // New: Small rooms/chambers
            { type: 'room', count: 10, minSize: 60, maxSize: 120 }
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
                case 'cross':
                    wall = this.createCrossWall(x, y, config);
                    break;
                case 'corridor':
                    wall = this.createCorridorWall(x, y, config);
                    break;
                case 'fortress':
                    wall = this.createFortressWall(x, y, config);
                    break;
                case 'room':
                    wall = this.createRoomWall(x, y, config);
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

    // New wall types for enhanced complexity
    
    createCrossWall(x, y, config) {
        const size = config.minSize + this.seededRandom() * (config.maxSize - config.minSize);
        const id = `cross_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        const segments = [
            // Horizontal beam
            { x: 0, y: size/2 - this.wallThickness/2, width: size, height: this.wallThickness },
            // Vertical beam
            { x: size/2 - this.wallThickness/2, y: 0, width: this.wallThickness, height: size }
        ];
        
        return new Wall(id, 'cross', x, y, size, size, segments);
    }

    createCorridorWall(x, y, config) {
        const length = config.minLength + this.seededRandom() * (config.maxLength - config.minLength);
        const isHorizontal = this.seededRandom() > 0.5;
        const corridorWidth = 80 + this.seededRandom() * 40; // 80-120 wide corridor
        const id = `corridor_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        
        const segments = [];
        
        if (isHorizontal) {
            // Top wall
            segments.push({ x: 0, y: 0, width: length, height: this.wallThickness });
            // Bottom wall
            segments.push({ x: 0, y: corridorWidth - this.wallThickness, width: length, height: this.wallThickness });
            return new Wall(id, 'corridor', x, y, length, corridorWidth, segments);
        } else {
            // Left wall
            segments.push({ x: 0, y: 0, width: this.wallThickness, height: length });
            // Right wall
            segments.push({ x: corridorWidth - this.wallThickness, y: 0, width: this.wallThickness, height: length });
            return new Wall(id, 'corridor', x, y, corridorWidth, length, segments);
        }
    }

    createFortressWall(x, y, config) {
        const size = config.minSize + this.seededRandom() * (config.maxSize - config.minSize);
        const id = `fortress_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        const gateSize = 60; // Entrance size
        
        const segments = [];
        
        // Outer walls with entrance
        const gatePosition = this.seededRandom() * 0.4 + 0.3; // Gate in middle third
        const gateStart = size * gatePosition;
        
        // Top wall
        segments.push({ x: 0, y: 0, width: size, height: this.wallThickness });
        // Bottom wall (with gate)
        segments.push({ x: 0, y: size - this.wallThickness, width: gateStart, height: this.wallThickness });
        segments.push({ x: gateStart + gateSize, y: size - this.wallThickness, width: size - gateStart - gateSize, height: this.wallThickness });
        // Left wall
        segments.push({ x: 0, y: 0, width: this.wallThickness, height: size });
        // Right wall
        segments.push({ x: size - this.wallThickness, y: 0, width: this.wallThickness, height: size });
        
        // Inner courtyard walls (smaller structures inside)
        const innerSize = size * 0.4;
        const innerX = size * 0.3;
        const innerY = size * 0.2;
        
        segments.push({ x: innerX, y: innerY, width: innerSize, height: this.wallThickness });
        segments.push({ x: innerX, y: innerY + innerSize - this.wallThickness, width: innerSize, height: this.wallThickness });
        segments.push({ x: innerX, y: innerY, width: this.wallThickness, height: innerSize });
        
        return new Wall(id, 'fortress', x, y, size, size, segments);
    }

    createRoomWall(x, y, config) {
        const size = config.minSize + this.seededRandom() * (config.maxSize - config.minSize);
        const id = `room_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
        const doorSize = 40; // Door opening
        
        const segments = [];
        
        // Create a simple room with one door
        const doorSide = Math.floor(this.seededRandom() * 4); // 0=top, 1=right, 2=bottom, 3=left
        const doorPosition = size * 0.3 + this.seededRandom() * size * 0.4; // Door position along wall
        
        switch (doorSide) {
            case 0: // Door on top
                segments.push({ x: 0, y: 0, width: doorPosition, height: this.wallThickness });
                segments.push({ x: doorPosition + doorSize, y: 0, width: size - doorPosition - doorSize, height: this.wallThickness });
                break;
            case 1: // Door on right
                segments.push({ x: size - this.wallThickness, y: 0, width: this.wallThickness, height: doorPosition });
                segments.push({ x: size - this.wallThickness, y: doorPosition + doorSize, width: this.wallThickness, height: size - doorPosition - doorSize });
                break;
            case 2: // Door on bottom
                segments.push({ x: 0, y: size - this.wallThickness, width: doorPosition, height: this.wallThickness });
                segments.push({ x: doorPosition + doorSize, y: size - this.wallThickness, width: size - doorPosition - doorSize, height: this.wallThickness });
                break;
            case 3: // Door on left
                segments.push({ x: 0, y: 0, width: this.wallThickness, height: doorPosition });
                segments.push({ x: 0, y: doorPosition + doorSize, width: this.wallThickness, height: size - doorPosition - doorSize });
                break;
        }
        
        // Add the other three walls (complete)
        if (doorSide !== 0) segments.push({ x: 0, y: 0, width: size, height: this.wallThickness }); // Top
        if (doorSide !== 1) segments.push({ x: size - this.wallThickness, y: 0, width: this.wallThickness, height: size }); // Right
        if (doorSide !== 2) segments.push({ x: 0, y: size - this.wallThickness, width: size, height: this.wallThickness }); // Bottom
        if (doorSide !== 3) segments.push({ x: 0, y: 0, width: this.wallThickness, height: size }); // Left
        
        return new Wall(id, 'room', x, y, size, size, segments);
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
        const maxAttempts = 200; // Increased attempts for better placement
        const margin = playerRadius + 20; // Extra safety margin
        const minDistanceFromWalls = playerRadius + 15; // Minimum distance from any wall
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate random position with margins from world edges
            const x = margin + Math.random() * (worldWidth - 2 * margin);
            const y = margin + Math.random() * (worldHeight - 2 * margin);
            
            // Check if this position collides with any wall (with extra safety margin)
            if (!this.checkCollision(x, y, minDistanceFromWalls)) {
                // Additional check: ensure we're not too close to any wall segment
                if (this.isPositionSafeFromAllWalls(x, y, minDistanceFromWalls)) {
                    return { x, y };
                }
            }
        }
        
        // Enhanced fallback: try predetermined safe zones
        const safeZones = [
            { x: worldWidth / 2, y: worldHeight / 2 }, // Center
            { x: worldWidth * 0.25, y: worldHeight * 0.25 }, // Top-left quadrant
            { x: worldWidth * 0.75, y: worldHeight * 0.25 }, // Top-right quadrant
            { x: worldWidth * 0.25, y: worldHeight * 0.75 }, // Bottom-left quadrant
            { x: worldWidth * 0.75, y: worldHeight * 0.75 }, // Bottom-right quadrant
        ];
        
        for (const zone of safeZones) {
            if (!this.checkCollision(zone.x, zone.y, minDistanceFromWalls) && 
                this.isPositionSafeFromAllWalls(zone.x, zone.y, minDistanceFromWalls)) {
                return zone;
            }
        }
        
        // Final fallback: return center (this should be safe due to minDistanceFromSpawn)
        console.warn('Could not find safe spawn position after all attempts, using center fallback');
        return { x: worldWidth / 2, y: worldHeight / 2 };
    }

    // Additional safety check to ensure position is far enough from all wall segments
    isPositionSafeFromAllWalls(x, y, minDistance) {
        for (const [id, wall] of this.walls) {
            if (wall.segments && wall.segments.length > 0) {
                // Check distance to each segment
                for (const segment of wall.segments) {
                    const segmentX = wall.x + segment.x;
                    const segmentY = wall.y + segment.y;
                    
                    // Calculate distance to rectangle (segment)
                    const distanceToSegment = this.distanceToRectangle(
                        x, y, 
                        segmentX, segmentY, 
                        segment.width, segment.height
                    );
                    
                    if (distanceToSegment < minDistance) {
                        return false;
                    }
                }
            } else {
                // Simple wall without segments
                const distanceToWall = this.distanceToRectangle(
                    x, y, 
                    wall.x, wall.y, 
                    wall.width, wall.height
                );
                
                if (distanceToWall < minDistance) {
                    return false;
                }
            }
        }
        return true;
    }

    // Calculate distance from point to rectangle
    distanceToRectangle(px, py, rx, ry, rw, rh) {
        const dx = Math.max(rx - px, 0, px - (rx + rw));
        const dy = Math.max(ry - py, 0, py - (ry + rh));
        return Math.sqrt(dx * dx + dy * dy);
    }
}

module.exports = WallSystem;
