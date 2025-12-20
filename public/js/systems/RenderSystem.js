import { GAME_CONFIG } from '../config/gameConfig.js';
import { SpriteSystem } from './SpriteSystem.js';

export class RenderSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.canvas.getContext('2d');
        this.minimapCtx = game.minimapCanvas.getContext('2d');
        this.floorCache = null;
        this.spriteSystem = new SpriteSystem();
        
        // Set up canvas for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        this.initializeFloor();
    }

    render() {
        this.clearCanvas();
        this.ctx.save();
        this.ctx.translate(-this.game.camera.x, -this.game.camera.y);
        
        this.drawFloor();
        this.drawWorldBoundaries();
        this.drawWalls();
        this.drawGrid();
        this.drawItems();
        this.drawSpells();
        this.drawExplosions();
        this.drawRingOfFireEffects();
        this.drawPlayers();
        
        this.ctx.restore();
        this.renderMinimap();
        
        // Update UI effects display
        if (this.game.ui) {
            this.game.ui.updateActiveEffects();
        }
    }

    clearCanvas() {
        const canvasWidth = GAME_CONFIG.viewport.getWidth();
        const canvasHeight = GAME_CONFIG.viewport.getHeight();
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    drawWorldBoundaries() {
        const theme = GAME_CONFIG.themes[GAME_CONFIG.themes.current];
        this.ctx.strokeStyle = theme.worldBoundaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, GAME_CONFIG.world.width, GAME_CONFIG.world.height);
    }

    drawGrid() {
        const theme = GAME_CONFIG.themes[GAME_CONFIG.themes.current];
        this.ctx.strokeStyle = theme.gridColor;
        this.ctx.lineWidth = 1;

        const canvasWidth = GAME_CONFIG.viewport.getWidth();
        const canvasHeight = GAME_CONFIG.viewport.getHeight();
        
        const startX = Math.floor(this.game.camera.x / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;
        const endX = Math.ceil((this.game.camera.x + canvasWidth) / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;
        const startY = Math.floor(this.game.camera.y / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;
        const endY = Math.ceil((this.game.camera.y + canvasHeight) / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;

        for (let x = startX; x <= endX; x += GAME_CONFIG.grid.size) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, GAME_CONFIG.world.height);
            this.ctx.stroke();
        }

        for (let y = startY; y <= endY; y += GAME_CONFIG.grid.size) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(GAME_CONFIG.world.width, y);
            this.ctx.stroke();
        }
    }

    initializeFloor() {
        this.floorData = this.generateFloorPattern();
    }

    // Seeded random number generator for consistent patterns
    seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    generateFloorPattern() {
        const { tileSize } = GAME_CONFIG.floor;
        const tilesX = Math.ceil(GAME_CONFIG.world.width / tileSize);
        const tilesY = Math.ceil(GAME_CONFIG.world.height / tileSize);
        const pattern = [];

        for (let y = 0; y < tilesY; y++) {
            pattern[y] = [];
            for (let x = 0; x < tilesX; x++) {
                // Create deterministic randomness based on position and seed
                const seedX = x * 73 + GAME_CONFIG.floor.seed;
                const seedY = y * 37 + GAME_CONFIG.floor.seed;
                const combinedSeed = seedX * seedY + GAME_CONFIG.floor.seed;
                
                const rand1 = this.seededRandom(combinedSeed);
                const rand2 = this.seededRandom(combinedSeed + 1000);
                
                // Get available patterns and their weights from current theme
                const patterns = GAME_CONFIG.floor.patterns;
                const patternNames = Object.keys(patterns);
                
                // Determine tile type based on weighted random
                let tileType = patternNames[0]; // Default to first pattern
                let currentWeight = 0;
                
                for (const patternName of patternNames) {
                    currentWeight += patterns[patternName].weight;
                    if (rand1 <= currentWeight) {
                        tileType = patternName;
                        break;
                    }
                }
                
                // Choose variant within the tile type
                const variants = patterns[tileType].variants;
                const variantIndex = Math.floor(rand2 * variants.length);
                const color = variants[variantIndex];
                
                pattern[y][x] = {
                    type: tileType,
                    color: color,
                    variant: variantIndex
                };
            }
        }
        
        return pattern;
    }

    drawFloor() {
        const { tileSize } = GAME_CONFIG.floor;
        
        // Calculate visible tiles based on camera position
        const startTileX = Math.max(0, Math.floor(this.game.camera.x / tileSize));
        const endTileX = Math.min(
            this.floorData[0].length - 1,
            Math.ceil((this.game.camera.x + this.game.canvas.width) / tileSize)
        );
        const startTileY = Math.max(0, Math.floor(this.game.camera.y / tileSize));
        const endTileY = Math.min(
            this.floorData.length - 1,
            Math.ceil((this.game.camera.y + this.game.canvas.height) / tileSize)
        );

        // Draw floor tiles
        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const tile = this.floorData[tileY][tileX];
                const x = tileX * tileSize;
                const y = tileY * tileSize;
                
                this.ctx.fillStyle = tile.color;
                this.ctx.fillRect(x, y, tileSize, tileSize);
                
                // Add subtle texture variation for pixel art effect
                this.addPixelTexture(x, y, tileSize, tile);
            }
        }
    }

    addPixelTexture(x, y, size, tile) {
        const pixelSize = 4; // Size of individual pixels within each tile
        const pixelsPerSide = size / pixelSize;
        
        for (let py = 0; py < pixelsPerSide; py++) {
            for (let px = 0; px < pixelsPerSide; px++) {
                // Create texture based on tile position and pixel position
                const seedPx = (x + px * pixelSize) * 13 + (y + py * pixelSize) * 17 + tile.variant;
                const rand = this.seededRandom(seedPx);
                
                // Add subtle brightness variation (±10%)
                if (rand < 0.3) {
                    const brightness = rand < 0.15 ? 0.9 : 1.1;
                    const baseColor = tile.color;
                    
                    // Parse hex color and adjust brightness
                    const hex = baseColor.replace('#', '');
                    const r = Math.min(255, Math.max(0, Math.floor(parseInt(hex.substr(0, 2), 16) * brightness)));
                    const g = Math.min(255, Math.max(0, Math.floor(parseInt(hex.substr(2, 2), 16) * brightness)));
                    const b = Math.min(255, Math.max(0, Math.floor(parseInt(hex.substr(4, 2), 16) * brightness)));
                    
                    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    this.ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    drawWalls() {
        this.game.walls.forEach(wall => {
            if (wall.isInViewport(this.game.camera.x, this.game.camera.y, this.game.canvas.width, this.game.canvas.height)) {
                this.drawWall(wall);
            }
        });
    }

    drawWall(wall) {
        if (wall.segments && wall.segments.length > 0) {
            // Draw segmented walls (L-shapes, houses, windows)
            wall.segments.forEach(segment => {
                const x = wall.x + segment.x;
                const y = wall.y + segment.y;
                this.drawWallSegment(x, y, segment.width, segment.height, wall.type);
            });
        } else {
            // Draw simple rectangular walls
            this.drawWallSegment(wall.x, wall.y, wall.width, wall.height, wall.type);
        }
    }

    drawWallSegment(x, y, width, height, wallType) {
        const theme = GAME_CONFIG.themes[GAME_CONFIG.themes.current];
        const walls = theme.walls;
        
        // Default colors
        let baseColor = '#666666';
        let edgeColor = '#888888';
        let shadowColor = '#333333';
        
        // For woods theme, add variety with different wood types
        if (GAME_CONFIG.themes.current === 'woods' && wallType !== 'perimeter') {
            // Create deterministic randomness based on wall position
            const seed = x * 73 + y * 37 + width * 17 + height * 23;
            const rand = this.seededRandom(seed);
            
            const woodTypes = ['oakWood', 'darkOak', 'weatheredWood', 'ageWood'];
            const selectedWood = woodTypes[Math.floor(rand * woodTypes.length)];
            const woodColors = walls[selectedWood];
            
            if (woodColors) {
                baseColor = woodColors.baseColor;
                edgeColor = woodColors.edgeColor;
                shadowColor = woodColors.shadowColor;
            }
        } else if (GAME_CONFIG.themes.current === 'winter' && wallType !== 'perimeter') {
            // Winter theme with dark frozen wood varieties
            const seed = x * 73 + y * 37 + width * 17 + height * 23;
            const rand = this.seededRandom(seed);
            
            const woodTypes = ['frozenOak', 'darkWood', 'weatheredWood', 'iceWood'];
            const selectedWood = woodTypes[Math.floor(rand * woodTypes.length)];
            const woodColors = walls[selectedWood];
            
            if (woodColors) {
                baseColor = woodColors.baseColor;
                edgeColor = woodColors.edgeColor;
                shadowColor = woodColors.shadowColor;
            }
        } else {
            // Use theme-specific colors or fallback to wallType-specific colors
            const wallColors = walls[wallType] || walls.stone || walls.oakWood || walls.frozenOak;
            if (wallColors) {
                baseColor = wallColors.baseColor;
                edgeColor = wallColors.edgeColor;
                shadowColor = wallColors.shadowColor;
            }
        }

        // Draw wall with 3D effect
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(x, y, width, height);
        
        // Add edge highlight
        this.ctx.fillStyle = edgeColor;
        this.ctx.fillRect(x, y, width, 2);
        this.ctx.fillRect(x, y, 2, height);
        
        // Add shadow
        this.ctx.fillStyle = shadowColor;
        this.ctx.fillRect(x + width - 2, y + 2, 2, height - 2);
        this.ctx.fillRect(x + 2, y + height - 2, width - 2, 2);
        
        // Add pixelated texture
        this.addWallTexture(x, y, width, height, wallType);
    }

    addWallTexture(x, y, width, height, wallType) {
        const textureSize = 8;
        const cols = Math.floor(width / textureSize);
        const rows = Math.floor(height / textureSize);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const textureX = x + col * textureSize;
                const textureY = y + row * textureSize;
                
                // Create texture pattern based on position
                const seed = textureX * 13 + textureY * 17 + wallType.length * 7;
                const rand = this.seededRandom(seed);
                
                if (rand < 0.15) {
                    // Add texture variation
                    const alpha = 0.3 + rand * 0.4;
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.fillRect(textureX, textureY, textureSize, textureSize);
                } else if (rand > 0.85) {
                    // Add darker spots
                    const alpha = 0.2 + (1 - rand) * 0.3;
                    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                    this.ctx.fillRect(textureX, textureY, textureSize, textureSize);
                }
            }
        }
    }

    drawItems() {
        this.game.items.forEach(item => {
            if (item.isInViewport(this.game.camera.x, this.game.camera.y, this.game.canvas.width, this.game.canvas.height)) {
                this.drawItem(item);
            }
        });
    }

    drawItem(item) {
        this.ctx.save();
        
        const time = Date.now() * 0.001; // Slower animation (was 0.005)
        const bounce = Math.sin(time + item.animationOffset) * 3; // Gentler bounce (was 5)
        const pulse = 0.95 + Math.sin(time * 1.5 + item.animationOffset) * 0.15; // Gentler pulsing (was time * 3 and 0.3)
        
        this.ctx.translate(item.x, item.y + bounce);
        this.ctx.scale(pulse, pulse);

        if (item.type === 'speed') {
            // Draw speed boost item with bright green colors
            const size = item.size;
            
            // Outer glow - bright green
            this.ctx.shadowColor = item.color; // Bright green
            this.ctx.shadowBlur = 20;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            
            // Draw multiple layered circles for a glowing effect
            // Outer ring
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Middle ring  
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size + 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Main body - bright green
            this.ctx.fillStyle = item.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner highlight
            this.ctx.fillStyle = '#80FF80';
            this.ctx.beginPath();
            this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Speed symbol (lightning bolt or arrow)
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `${size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⚡', 0, 0);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.moveTo(-size * 0.3, -size * 0.8);
            this.ctx.lineTo(size * 0.2, -size * 0.2);
            this.ctx.lineTo(-size * 0.1, -size * 0.1);
            this.ctx.lineTo(size * 0.3, size * 0.8);
            this.ctx.lineTo(-size * 0.2, size * 0.2);
            this.ctx.lineTo(size * 0.1, size * 0.1);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Inner highlight
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#FFFF99';
            this.ctx.beginPath();
            this.ctx.moveTo(-size * 0.2, -size * 0.6);
            this.ctx.lineTo(size * 0.1, -size * 0.3);
            this.ctx.lineTo(-size * 0.05, -size * 0.2);
            this.ctx.lineTo(size * 0.2, size * 0.6);
            this.ctx.lineTo(-size * 0.1, size * 0.3);
            this.ctx.lineTo(size * 0.05, size * 0.2);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (item.type === 'mana') {
            // Draw blue mana item with droplet symbol
            const size = 10;
            
            // Outer blue glow
            this.ctx.shadowColor = '#0080FF';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = 'rgba(0, 128, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Middle blue circle
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = 'rgba(0, 128, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner bright blue core
            this.ctx.shadowBlur = 5;
            this.ctx.fillStyle = 'rgba(100, 180, 255, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw mana droplet symbol
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            // Droplet shape - teardrop
            this.ctx.moveTo(0, -size * 0.5);
            this.ctx.quadraticCurveTo(size * 0.3, -size * 0.2, size * 0.3, size * 0.1);
            this.ctx.quadraticCurveTo(size * 0.3, size * 0.4, 0, size * 0.5);
            this.ctx.quadraticCurveTo(-size * 0.3, size * 0.4, -size * 0.3, size * 0.1);
            this.ctx.quadraticCurveTo(-size * 0.3, -size * 0.2, 0, -size * 0.5);
            this.ctx.fill();
        } else if (item.type === 'ringOfFire') {
            // Draw Ring of Fire item with fire colors and ring symbol
            const size = item.size;
            
            // Animated fire glow
            const fireIntensity = 0.8 + Math.sin(time * 4 + item.animationOffset) * 0.3;
            
            // Outer fire glow - orange-red
            this.ctx.shadowColor = '#FF4500';
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = `rgba(255, 69, 0, ${0.4 * fireIntensity})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size + 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Middle fire ring
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = `rgba(255, 140, 0, ${0.7 * fireIntensity})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner hot core
            this.ctx.shadowBlur = 8;
            this.ctx.fillStyle = `rgba(255, 255, 100, ${0.9 * fireIntensity})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw ring symbol
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Inner ring
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Fire particles around ring
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + time * 2;
                const radius = size * 0.9;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                this.ctx.fillStyle = `rgba(255, ${100 + i * 20}, 0, ${0.8 * fireIntensity})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }

    drawSpells() {
        this.game.spells.forEach(spell => {
            if (spell.isInViewport(this.game.camera.x, this.game.camera.y)) {
                this.drawSpell(spell);
            }
        });
    }

    drawSpell(spell) {
        this.ctx.save();

        // Draw trail
        if (spell.trail && spell.trail.length > 0) {
            for (let i = 0; i < spell.trail.length; i++) {
                const trailPoint = spell.trail[i];
                const alpha = (i + 1) / spell.trail.length * 0.6;
                const size = (i + 1) / spell.trail.length * (GAME_CONFIG.spell.size - 2);

                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#FF6500';
                this.ctx.beginPath();
                this.ctx.arc(trailPoint.x, trailPoint.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.globalAlpha = 1;
        this.ctx.translate(spell.x, spell.y);
        this.ctx.rotate(spell.angle);

        // Draw fireball
        this.ctx.fillStyle = '#FF4500';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, GAME_CONFIG.spell.size + 5, GAME_CONFIG.spell.size, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, GAME_CONFIG.spell.size + 2, GAME_CONFIG.spell.size - 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, GAME_CONFIG.spell.size / 2, GAME_CONFIG.spell.size / 3, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawExplosions() {
        if (this.game.explosions.length > 0) {
            console.log('Drawing explosions:', this.game.explosions.length); // Debug log
        }
        this.game.explosions.forEach(explosion => {
            this.drawExplosion(explosion);
        });
    }

    drawExplosion(explosion) {
        const currentTime = Date.now();
        const age = currentTime - explosion.startTime;
        const progress = age / explosion.duration;
        
        if (progress >= 1) return; // Explosion finished
        
        this.ctx.save();
        
        // Calculate animation properties
        const scale = 0.2 + progress * 1.3; // Start small, grow larger
        const alpha = Math.max(0, 1 - progress * 1.5); // Fade out faster
        const size = explosion.size * scale;
        
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(explosion.x, explosion.y);
        
        // Create flickering effect
        const flicker = Math.sin(currentTime * 0.01 + explosion.x * 0.1) * 0.3 + 0.7;
        
        // Draw fire explosion with multiple layers
        const layers = 5;
        for (let i = 0; i < layers; i++) {
            const layerProgress = Math.max(0, progress - (i * 0.05));
            const layerScale = 0.4 + layerProgress * 0.8;
            const layerAlpha = (1 - layerProgress) * flicker;
            const layerSize = size * (0.6 + i * 0.15) * layerScale;
            
            if (layerProgress > 0 && layerAlpha > 0.1) {
                this.ctx.globalAlpha = alpha * layerAlpha;
                
                // Fire colors - transition from white hot center to red edges
                let fillStyle;
                if (explosion.type === 'wall') {
                    // Sparks/debris for wall hits - yellows and whites
                    switch(i) {
                        case 0: fillStyle = '#FFFFFF'; break; // White hot center
                        case 1: fillStyle = '#FFFF99'; break; // Light yellow
                        case 2: fillStyle = '#FFD700'; break; // Gold
                        case 3: fillStyle = '#FFA500'; break; // Orange
                        case 4: fillStyle = '#FF8C00'; break; // Dark orange
                    }
                } else {
                    // Fire explosion for player hits - reds and oranges
                    switch(i) {
                        case 0: fillStyle = '#FFFFFF'; break; // White hot center
                        case 1: fillStyle = '#FFFF66'; break; // Yellow core
                        case 2: fillStyle = '#FF6600'; break; // Orange
                        case 3: fillStyle = '#FF3300'; break; // Red-orange
                        case 4: fillStyle = '#CC0000'; break; // Deep red
                    }
                }
                
                this.ctx.fillStyle = fillStyle;
                
                // Draw irregular explosion shape instead of perfect circles
                this.ctx.beginPath();
                const points = 8;
                for (let p = 0; p < points; p++) {
                    const angle = (p / points) * Math.PI * 2;
                    // Add randomness to make it look more like fire
                    const randomOffset = Math.sin(currentTime * 0.005 + angle * 3 + i) * 0.3 + 1;
                    const radius = layerSize * randomOffset;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    if (p === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();
                this.ctx.fill();
                
                // Add some particle effects for the outer layers
                if (i >= 2 && layerProgress > 0.3) {
                    this.drawFireParticles(layerSize, i, currentTime, explosion);
                }
            }
        }
        
        this.ctx.restore();
    }

    drawFireParticles(baseSize, layer, currentTime, explosion) {
        const particleCount = 6 - layer; // Fewer particles for outer layers
        
        for (let p = 0; p < particleCount; p++) {
            const angle = (p / particleCount) * Math.PI * 2 + currentTime * 0.001;
            const distance = baseSize * (0.8 + Math.sin(currentTime * 0.003 + p) * 0.4);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            const particleSize = 2 + Math.sin(currentTime * 0.01 + p) * 1;
            
            this.ctx.fillStyle = layer === 2 ? '#FFD700' : 
                               layer === 3 ? '#FF8C00' : '#FF4500';
            this.ctx.beginPath();
            this.ctx.arc(x, y, particleSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawRingOfFireEffects() {
        if (!this.spriteSystem.ringOfFireEffects) return;
        
        this.spriteSystem.ringOfFireEffects.forEach(effect => {
            this.drawRingOfFireEffect(effect);
        });
    }

    drawRingOfFireEffect(effect) {
        const currentTime = Date.now();
        const age = currentTime - effect.startTime;
        const progress = age / effect.duration;
        
        if (progress >= 1) return; // Effect finished
        
        this.ctx.save();
        this.ctx.translate(effect.x, effect.y);
        
        // Calculate animation phases
        let currentRadius = 0;
        let alpha = 1;
        
        if (age < effect.expandTime) {
            // Expanding phase
            const expandProgress = age / effect.expandTime;
            currentRadius = effect.maxRadius * expandProgress;
            alpha = 1;
        } else if (age < effect.expandTime + effect.holdTime) {
            // Holding phase
            currentRadius = effect.maxRadius;
            alpha = 1;
        } else {
            // Fading phase
            currentRadius = effect.maxRadius;
            const fadeProgress = (age - effect.expandTime - effect.holdTime) / effect.fadeTime;
            alpha = 1 - fadeProgress;
        }
        
        this.ctx.globalAlpha = alpha;
        
        // Draw multiple fire rings for effect
        const rings = 3;
        for (let i = 0; i < rings; i++) {
            const ringRadius = currentRadius - (i * 15);
            if (ringRadius <= 0) continue;
            
            const intensity = 1 - (i / rings);
            const flicker = Math.sin(currentTime * 0.01 + i) * 0.3 + 0.7;
            
            // Outer fire glow
            this.ctx.shadowColor = '#FF4500';
            this.ctx.shadowBlur = 20;
            this.ctx.strokeStyle = `rgba(255, ${69 + i * 50}, 0, ${intensity * flicker * 0.8})`;
            this.ctx.lineWidth = 8 - i * 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Inner bright core
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = `rgba(255, ${200 + i * 25}, 100, ${intensity * flicker})`;
            this.ctx.lineWidth = 4 - i;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Add fire particles around the ring
        const particleCount = Math.floor(currentRadius / 10);
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + currentTime * 0.002;
            const radius = currentRadius + Math.sin(currentTime * 0.005 + i) * 10;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            this.ctx.shadowBlur = 5;
            this.ctx.fillStyle = `rgba(255, ${150 + Math.random() * 105}, 0, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }

    drawPlayers() {
        this.game.players.forEach(player => {
            if (player.isInViewport(this.game.camera.x, this.game.camera.y)) {
                this.drawPlayer(player, player.id === this.game.myId);
                // Only show health bars above other players, not the local player
                // Mana is private - only show for local player in UI
                if (player.isAlive && player.id !== this.game.myId) {
                    this.drawHealthBar(player);
                }
            }
        });
    }

    drawPlayer(player, isMe) {
        if (!player) return;

        this.ctx.save();

        // Draw spawn protection effect
        if (player.spawnProtection && player.isAlive) {
            const time = Date.now();
            const pulse = Math.sin(time * 0.01) * 0.3 + 0.7;
            
            this.ctx.globalAlpha = pulse * 0.8;
            this.ctx.fillStyle = '#4169E1';
            this.drawProtectionAura(player, 10);
            
            this.ctx.globalAlpha = pulse * 0.5;
            this.ctx.fillStyle = '#6495ED';
            this.drawProtectionAura(player, 5);
        }

        // Draw speed boost aura
        if (player.currentSpeedMultiplier > 1.0 && player.isAlive) {
            const time = Date.now();
            const speedPulse = Math.sin(time * 0.008) * 0.4 + 0.6;
            const speedIntensity = Math.min((player.currentSpeedMultiplier - 1.0) * 2, 1.0);
            
            this.ctx.globalAlpha = speedPulse * speedIntensity * 0.7;
            this.ctx.fillStyle = '#00FF00';
            this.drawProtectionAura(player, 12);
            
            this.ctx.globalAlpha = speedPulse * speedIntensity * 0.4;
            this.ctx.fillStyle = '#80FF80';
            this.drawProtectionAura(player, 6);
        }

        // Draw burning effect
        if (player.isBurning && player.isAlive) {
            const time = Date.now();
            const flicker = Math.sin(time * 0.01) * 0.3 + 0.7;
            
            this.ctx.globalAlpha = flicker * 0.8;
            this.ctx.fillStyle = '#FF4500';
            this.drawBurningAura(player, 8);
            
            this.ctx.globalAlpha = flicker * 0.6;
            this.ctx.fillStyle = '#FF6B00';
            this.drawBurningAura(player, 4);
        }

        this.ctx.globalAlpha = 1;

        if (!player.isAlive) {
            this.drawGhost(player);
        } else {
            this.drawWizard(player, isMe);
        }

        this.ctx.restore();

        // Player tag
        if (isMe) {
            this.drawPlayerTag(player);
        }
    }

    drawProtectionAura(player, size) {
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, GAME_CONFIG.player.size + size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBurningAura(player, size) {
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, GAME_CONFIG.player.size + size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawGhost(player) {
        // Ghost body
        this.ctx.fillStyle = 'rgba(220, 220, 220, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, GAME_CONFIG.player.size - 2, 0, Math.PI, true);
        this.ctx.lineTo(player.x - GAME_CONFIG.player.size + 2, player.y + GAME_CONFIG.player.size - 2);
        this.ctx.lineTo(player.x - GAME_CONFIG.player.size / 2, player.y + GAME_CONFIG.player.size / 2);
        this.ctx.lineTo(player.x, player.y + GAME_CONFIG.player.size);
        this.ctx.lineTo(player.x + GAME_CONFIG.player.size / 2, player.y + GAME_CONFIG.player.size / 2);
        this.ctx.lineTo(player.x + GAME_CONFIG.player.size - 2, player.y + GAME_CONFIG.player.size - 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Ghost features
        this.drawGhostFeatures(player);
    }

    drawGhostFeatures(player) {
        // Eyes
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(player.x - 5, player.y - 2, 3, 0, Math.PI * 2);
        this.ctx.arc(player.x + 5, player.y - 2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Mouth
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y + 5, 5, 0.1 * Math.PI, 0.9 * Math.PI);
        this.ctx.stroke();
    }

    drawWizard(player, isMe) {
        this.ctx.save();
        
        // Get current animation state
        const pose = this.spriteSystem.getCastPose(player.id);
        const castAnimationRotation = this.spriteSystem.getStaffRotation(player.id);
        
        // Use aiming angle for smooth 360-degree staff rotation
        const aimingAngle = player.aimingAngle !== undefined ? player.aimingAngle : 0;
        
        // Determine wizard body direction (still use 4-directional for body sprite)
        let direction;
        if (player.aimingAngle !== undefined) {
            direction = this.spriteSystem.getDirectionFromAngle(player.aimingAngle);
        } else {
            direction = player.facingLeft ? 'left' : 'right';
        }
        
        // Get directional wizard and cape sprites
        const wizardSprite = this.spriteSystem.getWizardSpriteForDirection(direction, player.color, pose);
        const capeSprite = this.spriteSystem.getCapeSprite(direction, player.color);
        
        if (!wizardSprite) return;
        
        // Position and scale
        const scale = 2; // Scale up pixel art for better visibility
        
        // Detect if player is moving for leg animation and bounce effect
        const isMoving = this.isPlayerMoving(player);
        const bounceOffset = this.getBounceOffset(player, isMoving);
        
        // Move to player position with bounce offset
        this.ctx.translate(player.x, player.y + bounceOffset);
        
        // Draw legs first (bottom layer) - positioned below the body
        const legSprite = this.spriteSystem.getLegSprite(direction, player.color, isMoving, player.id);
        
        if (legSprite) {
            this.ctx.drawImage(
                legSprite,
                -(legSprite.width * scale) / 2,
                -(legSprite.height * scale) / 2 + 8, // Offset down to show below body
                legSprite.width * scale,
                legSprite.height * scale
            );
        }
        
        // Draw cape behind wizard for front/side views (cape should appear behind player)
        if (capeSprite && direction !== 'back') {
            // Cape appears behind the wizard for front and side views
            this.ctx.save();
            this.ctx.translate(0, 2); // Slightly lower to appear behind
            
            this.ctx.drawImage(
                capeSprite,
                -(capeSprite.width * scale) / 2,
                -(capeSprite.height * scale) / 2,
                capeSprite.width * scale,
                capeSprite.height * scale
            );
            
            this.ctx.restore();
        }
        
        // Draw wizard sprite centered at origin
        this.ctx.drawImage(
            wizardSprite,
            -(wizardSprite.width * scale) / 2,
            -(wizardSprite.height * scale) / 2,
            wizardSprite.width * scale,
            wizardSprite.height * scale
        );
        
        // Draw cape in front when facing away (we see the back of the cape)
        if (capeSprite && direction === 'back') {
            this.ctx.drawImage(
                capeSprite,
                -(capeSprite.width * scale) / 2,
                -(capeSprite.height * scale) / 2,
                capeSprite.width * scale,
                capeSprite.height * scale
            );
        }
        
        // Draw staff with 360-degree rotation following mouse
        this.drawStaffWithAngle(aimingAngle, castAnimationRotation, scale);
        
        this.ctx.restore();
    }

    drawStaffWithAngle(aimingAngle, castAnimationRotation, scale) {
        this.ctx.save();
        
        // Staff positioning relative to player center
        const staffDistance = 20; // Distance from player center
        
        // Normalize angle to 0-2π for consistent calculations
        const normalizedAngle = ((aimingAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        
        // Determine if staff should be flipped (Terraria-style)
        // Flip when pointing towards the left half of the circle (π/2 to 3π/2)
        const shouldFlip = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI / 2);
        
        // Calculate staff position based on aiming angle
        const staffX = Math.cos(aimingAngle) * staffDistance;
        const staffY = Math.sin(aimingAngle) * staffDistance;
        
        this.ctx.translate(staffX, staffY);
        
        // Apply staff rotation and flipping
        let finalRotation = aimingAngle;
        
        // Add casting animation rotation
        finalRotation += castAnimationRotation;
        
        // If flipped, we need to handle this differently
        if (shouldFlip) {
            // For left side, we want to flip the staff and adjust the rotation
            // First rotate, then flip
            this.ctx.rotate(finalRotation);
            this.ctx.scale(1, -1); // Flip vertically after rotation
        } else {
            // Normal rotation for right side
            this.ctx.rotate(finalRotation);
        }
        
        // Get base staff sprite (we'll use the horizontal one and rotate it)
        const staffSprite = this.spriteSystem.sprites.get('staff');
        
        if (staffSprite) {
            this.ctx.drawImage(
                staffSprite,
                -(staffSprite.width * scale) / 2,
                -(staffSprite.height * scale) / 2,
                staffSprite.width * scale,
                staffSprite.height * scale
            );
        }
        
        this.ctx.restore();
    }

    // Helper method to detect if player is moving
    isPlayerMoving(player) {
        const currentTime = Date.now();
        const moveThreshold = 150; // ms - if position changed recently, consider moving
        
        // Store previous positions for movement detection
        if (!this.playerPreviousPositions) {
            this.playerPreviousPositions = new Map();
        }
        
        const prevData = this.playerPreviousPositions.get(player.id);
        const currentData = {
            x: player.x,
            y: player.y,
            timestamp: currentTime
        };
        
        this.playerPreviousPositions.set(player.id, currentData);
        
        if (!prevData) {
            return false; // No previous data, assume not moving
        }
        
        // Calculate distance moved
        const dx = currentData.x - prevData.x;
        const dy = currentData.y - prevData.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeDiff = currentTime - prevData.timestamp;
        
        // Consider moving if traveled significant distance recently
        return distance > 1 && timeDiff < moveThreshold;
    }

    getBounceOffset(player, isMoving) {
        const currentTime = Date.now();
        
        if (isMoving) {
            // Walking bounce - faster and more pronounced
            const walkBounceSpeed = 0.008; // Faster bounce when walking
            const walkBounceAmplitude = 2.5; // Slightly larger bounce amplitude
            
            // Use player ID to offset the phase so all players don't bounce in sync
            const phaseOffset = (player.id ? player.id.charCodeAt(0) * 0.1 : 0);
            
            // Create a bouncing effect that matches walking rhythm
            // Use abs(sin) to create double-bounce per cycle (like footsteps)
            const walkCycle = Math.sin((currentTime * walkBounceSpeed) + phaseOffset);
            const bounce = Math.abs(walkCycle) * walkBounceAmplitude;
            
            return bounce;
        } else {
            // Idle bounce - slower and gentler
            const bounceSpeed = 0.002; // Slow, gentle bounce
            const bounceAmplitude = 1.5; // Small bounce amplitude (1.5 pixels)
            
            // Use player ID to offset the phase so all players don't bounce in sync
            const phaseOffset = (player.id ? player.id.charCodeAt(0) * 0.1 : 0);
            
            // Sine wave for smooth breathing motion
            const bounce = Math.sin((currentTime * bounceSpeed) + phaseOffset) * bounceAmplitude;
            
            return bounce;
        }
    }

    drawPlayerTag(player) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('YOU', player.x, player.y + GAME_CONFIG.player.size + 15);
    }

    drawHealthBar(player) {
        const x = player.x;
        const y = player.y - GAME_CONFIG.player.size - 30;
        const width = 40;
        const height = 6;

        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x - width/2, y, width, height);

        // Health fill
        const healthPercent = player.health / player.maxHealth;
        const healthWidth = width * healthPercent;

        this.ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : 
                            healthPercent > 0.3 ? '#FF9800' : '#F44336';
        this.ctx.fillRect(x - width/2, y, healthWidth, height);

        // Border
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - width/2, y, width, height);

        // Health text
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.ceil(player.health)}`, x, y - 2);

        // Kill count
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`💀${player.kills}`, x + width/2 + 5, y + height);
    }

    drawManaBar(player) {
        const x = player.x;
        const y = player.y - GAME_CONFIG.player.size - 30; // Below health bar
        const width = 40;
        const height = 4;

        // Background
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(x - width/2, y, width, height);

        // Mana fill
        const manaPercent = player.mana / player.maxMana;
        const manaWidth = width * manaPercent;

        this.ctx.fillStyle = manaPercent > 0.6 ? '#2196F3' : 
                            manaPercent > 0.3 ? '#FF9800' : '#F44336';
        this.ctx.fillRect(x - width/2, y, manaWidth, height);

        // Border
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - width/2, y, width, height);

        // Mana text
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '8px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.ceil(player.mana)}`, x, y - 1);
    }

    renderMinimap() {
        this.minimapCtx.clearRect(0, 0, this.game.minimapCanvas.width, this.game.minimapCanvas.height);
        
        const scale = this.game.minimapCanvas.width / GAME_CONFIG.world.width;
        
        // Draw world boundaries
        this.minimapCtx.strokeStyle = '#444';
        this.minimapCtx.strokeRect(0, 0, this.game.minimapCanvas.width, this.game.minimapCanvas.height);
        
        // Draw viewport area
        const vpX = this.game.camera.x * scale;
        const vpY = this.game.camera.y * scale;
        const vpW = GAME_CONFIG.viewport.getWidth() * scale;
        const vpH = GAME_CONFIG.viewport.getHeight() * scale;
        
        this.minimapCtx.strokeStyle = '#fff';
        this.minimapCtx.strokeRect(vpX, vpY, vpW, vpH);
        
        // Draw players
        this.game.players.forEach(player => {
            const dotSize = 2;
            const x = player.x * scale;
            const y = player.y * scale;
            
            this.minimapCtx.fillStyle = player.id === this.game.myId ? '#fff' : player.color;
            this.minimapCtx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
        });

        // Draw items
        this.game.items.forEach(item => {
            const dotSize = 3; // Slightly larger than players for visibility
            const x = item.x * scale;
            const y = item.y * scale;
            
            if (item.type === 'speed') {
                this.minimapCtx.fillStyle = '#00FF00'; // Bright green for speed items
                this.minimapCtx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
                
                // Add a small glow effect on minimap
                this.minimapCtx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                this.minimapCtx.fillRect(x - dotSize, y - dotSize, dotSize * 2, dotSize * 2);
            } else if (item.type === 'mana') {
                this.minimapCtx.fillStyle = '#0080FF'; // Bright blue for mana items
                this.minimapCtx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
                
                // Add a small blue glow effect on minimap
                this.minimapCtx.fillStyle = 'rgba(0, 128, 255, 0.5)';
                this.minimapCtx.fillRect(x - dotSize, y - dotSize, dotSize * 2, dotSize * 2);
            } else if (item.type === 'ringOfFire') {
                this.minimapCtx.fillStyle = '#FF4500'; // Orange-red for Ring of Fire items
                this.minimapCtx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
                
                // Add a small orange glow effect on minimap
                this.minimapCtx.fillStyle = 'rgba(255, 69, 0, 0.7)';
                this.minimapCtx.fillRect(x - dotSize, y - dotSize, dotSize * 2, dotSize * 2);
            }
        });
    }
}
