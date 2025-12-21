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
        this.drawEntitiesWithZOrder(); // Draw players, trees, and walls with proper z-ordering
        this.drawFallingLeaves();
        this.drawGrid();
        this.drawItems();
        this.drawSpells();
        this.drawExplosions();
        this.drawRingOfFireEffects();
        
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

    drawFallingLeaves() {
        this.ctx.save();
        
        this.game.fallingLeaves.forEach(leaf => {
            // Only draw leaves that are in viewport
            if (leaf.x >= this.game.camera.x - 20 && 
                leaf.x <= this.game.camera.x + this.game.canvas.width + 20 &&
                leaf.y >= this.game.camera.y - 20 && 
                leaf.y <= this.game.camera.y + this.game.canvas.height + 20) {
                
                this.ctx.save();
                this.ctx.globalAlpha = leaf.alpha;
                this.ctx.translate(leaf.x, leaf.y);
                this.ctx.rotate(leaf.rotation);
                
                this.ctx.fillStyle = leaf.color;
                
                if (leaf.leafType === 'pointed') {
                    // Draw pointed leaf
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -leaf.size);
                    this.ctx.quadraticCurveTo(-leaf.size/2, -leaf.size/3, -leaf.size/3, leaf.size/2);
                    this.ctx.quadraticCurveTo(0, leaf.size, leaf.size/3, leaf.size/2);
                    this.ctx.quadraticCurveTo(leaf.size/2, -leaf.size/3, 0, -leaf.size);
                    this.ctx.fill();
                } else {
                    // Draw oval leaf
                    this.ctx.beginPath();
                    this.ctx.ellipse(0, 0, leaf.size, leaf.size * 1.5, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                // Add subtle leaf vein
                this.ctx.strokeStyle = this.darkenColor(leaf.color, 20);
                this.ctx.lineWidth = 0.5;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -leaf.size);
                this.ctx.lineTo(0, leaf.size);
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        });
        
        this.ctx.restore();
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

        // Draw wall with angled top-down perspective (Stardew Valley style)
        this.drawAngledWall(x, y, width, height, baseColor, edgeColor, shadowColor, wallType);
    }

    drawAngledWall(x, y, width, height, baseColor, edgeColor, shadowColor, wallType) {
        const perspectiveDepth = 16; // Increased depth for more pronounced angle
        const cornerDepth = 8; // Increased corner depth
        
        this.ctx.save();
        
        // 1. Draw the main top face (what you see from above)
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(x, y, width, height);
        
        // 2. Draw the right side face (angled perspective)
        if (x + width < GAME_CONFIG.world.width) { // Don't draw right face if it's at world edge
            this.ctx.fillStyle = this.darkenColor(baseColor, 35); // Increased darkness for better depth
            this.ctx.beginPath();
            this.ctx.moveTo(x + width, y);
            this.ctx.lineTo(x + width + perspectiveDepth, y + perspectiveDepth);
            this.ctx.lineTo(x + width + perspectiveDepth, y + height + perspectiveDepth);
            this.ctx.lineTo(x + width, y + height);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // 3. Draw the bottom face (angled perspective)
        if (y + height < GAME_CONFIG.world.height) { // Don't draw bottom face if it's at world edge
            this.ctx.fillStyle = this.darkenColor(baseColor, 45); // Increased darkness for better depth
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + height);
            this.ctx.lineTo(x + perspectiveDepth, y + height + perspectiveDepth);
            this.ctx.lineTo(x + width + perspectiveDepth, y + height + perspectiveDepth);
            this.ctx.lineTo(x + width, y + height);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // 4. Draw corner piece if both right and bottom faces are visible
        if (x + width < GAME_CONFIG.world.width && y + height < GAME_CONFIG.world.height) {
            this.ctx.fillStyle = this.darkenColor(baseColor, 55); // Darkest corner for maximum depth
            this.ctx.beginPath();
            this.ctx.moveTo(x + width, y + height);
            this.ctx.lineTo(x + width + perspectiveDepth, y + height + perspectiveDepth);
            this.ctx.lineTo(x + width + cornerDepth, y + height + cornerDepth);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // 5. Add top face highlights and details
        this.ctx.fillStyle = edgeColor;
        this.ctx.fillRect(x, y, width, 2); // Top edge
        this.ctx.fillRect(x, y, 2, height); // Left edge
        
        // 6. Add subtle inner shadow on top face
        this.ctx.fillStyle = shadowColor;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(x + width - 3, y + 3, 3, height - 3); // Right inner shadow
        this.ctx.fillRect(x + 3, y + height - 3, width - 3, 3); // Bottom inner shadow
        this.ctx.globalAlpha = 1;
        
        // 7. Add angled texture to top face
        this.addAngledWallTexture(x, y, width, height, wallType);
        
        // 8. Add side face textures
        if (x + width < GAME_CONFIG.world.width) {
            this.addSideFaceTexture(x + width, y, perspectiveDepth, height, wallType, 'right');
        }
        if (y + height < GAME_CONFIG.world.height) {
            this.addSideFaceTexture(x, y + height, width, perspectiveDepth, wallType, 'bottom');
        }
        
        this.ctx.restore();
    }
    
    addAngledWallTexture(x, y, width, height, wallType) {
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
    
    addSideFaceTexture(x, y, width, height, wallType, face) {
        const textureSize = 6;
        let cols, rows;
        
        if (face === 'right') {
            cols = Math.floor(width / textureSize);
            rows = Math.floor(height / textureSize);
        } else { // bottom
            cols = Math.floor(width / textureSize);
            rows = Math.floor(height / textureSize);
        }
        
        this.ctx.globalAlpha = 0.6;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let textureX, textureY;
                
                if (face === 'right') {
                    textureX = x + col * textureSize;
                    textureY = y + row * textureSize;
                } else { // bottom
                    textureX = x + col * textureSize;
                    textureY = y + row * textureSize;
                }
                
                // Create texture pattern
                const seed = textureX * 19 + textureY * 23 + wallType.length * 11;
                const rand = this.seededRandom(seed);
                
                if (rand < 0.2) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    this.ctx.fillRect(textureX, textureY, textureSize, textureSize);
                } else if (rand > 0.8) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    this.ctx.fillRect(textureX, textureY, textureSize, textureSize);
                }
            }
        }
        
        this.ctx.globalAlpha = 1;
    }

    drawTrees() {
        if (!this.game.trees) return;
        
        this.game.trees.forEach(tree => {
            if (tree.isInViewport(this.game.camera.x, this.game.camera.y, this.game.canvas.width, this.game.canvas.height)) {
                this.drawTree(tree);
            }
        });
    }

    drawTree(tree) {
        const currentTheme = GAME_CONFIG.themes[GAME_CONFIG.themes.current];
        const treeConfig = currentTheme.trees[tree.type];
        
        if (!treeConfig) return;

        const x = tree.x;
        const y = tree.y;
        const width = tree.width;
        const height = tree.height;
        const trunkHeight = Math.floor(height * 0.4);
        const crownHeight = height - trunkHeight;
        const trunkWidth = Math.floor(width * 0.3);

        this.ctx.save();

        // Draw shadow
        this.ctx.fillStyle = treeConfig.shadowColor;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(x - width/2 + 2, y + height/2 + 2, width, 4);
        this.ctx.globalAlpha = 1;

        // Draw trunk with texture
        this.ctx.fillStyle = treeConfig.trunkColor;
        const trunkX = x - trunkWidth/2;
        const trunkY = y + crownHeight/2 - 2;
        this.ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);

        // Add bark texture
        this.ctx.fillStyle = this.darkenColor(treeConfig.trunkColor, 20);
        let barkSeed = x * 41 + y * 43 + width * 47;
        for (let i = 0; i < trunkHeight; i += 8) {
            for (let j = 0; j < trunkWidth; j += 6) {
                barkSeed = (barkSeed * 9301 + 49297) % 233280;
                const barkRand = barkSeed / 233280;
                if (barkRand > 0.7) {
                    this.ctx.fillRect(trunkX + j, trunkY + i, 2, 4);
                }
            }
        }

        // Draw trunk highlights and grooves
        this.ctx.fillStyle = this.lightenColor(treeConfig.trunkColor, 25);
        this.ctx.fillRect(trunkX, trunkY, 3, trunkHeight);
        
        // Add vertical bark lines
        this.ctx.strokeStyle = this.darkenColor(treeConfig.trunkColor, 30);
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const lineX = trunkX + (i + 1) * (trunkWidth / 4);
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, trunkY);
            this.ctx.lineTo(lineX, trunkY + trunkHeight);
            this.ctx.stroke();
        }

        // Draw crown based on shape
        this.ctx.fillStyle = treeConfig.topColor;
        
        if (treeConfig.crownShape === 'circle') {
            this.drawTreeCrown_Circle(x, y - trunkHeight/2, width, crownHeight, treeConfig);
        } else if (treeConfig.crownShape === 'triangle') {
            this.drawTreeCrown_Triangle(x, y - trunkHeight/2, width, crownHeight, treeConfig);
        } else if (treeConfig.crownShape === 'oval') {
            this.drawTreeCrown_Oval(x, y - trunkHeight/2, width, crownHeight, treeConfig);
        } else if (treeConfig.crownShape === 'square') {
            this.drawTreeCrown_Square(x, y - trunkHeight/2, width, crownHeight, treeConfig);
        } else if (treeConfig.crownShape === 'snowman') {
            this.drawSnowman(x, y, width, height, treeConfig);
        }

        // Add snow caps for winter trees
        if (treeConfig.snowCaps) {
            this.drawSnowCaps(x, y - trunkHeight/2, width, crownHeight, treeConfig);
        }
        
        // Add winter frosting effect for better visibility in winter theme
        if (GAME_CONFIG.themes.current === 'winter' && !treeConfig.isSnowman) {
            this.addWinterFrosting(tree, x, y - trunkHeight/2, width, crownHeight, treeConfig);
        }

        this.ctx.restore();
    }

    drawTreeCrown_Circle(x, y, width, height, config) {
        // Draw main crown with cloud-like texture
        this.ctx.fillStyle = config.topColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, width/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add cloud-like bumps around the crown
        const cloudBumps = 8;
        this.ctx.fillStyle = this.lightenColor(config.topColor, 10);
        for (let i = 0; i < cloudBumps; i++) {
            const angle = (i / cloudBumps) * Math.PI * 2;
            const bumpX = x + Math.cos(angle) * (width/3);
            const bumpY = y + Math.sin(angle) * (height/3);
            // Use deterministic size variation based on tree position and bump index
            const seedVariation = (x * 13 + y * 17 + i * 23) % 1000 / 1000;
            const bumpSize = width/6 + Math.sin(i * 1.7 + seedVariation) * 8;
            
            this.ctx.beginPath();
            this.ctx.arc(bumpX, bumpY, bumpSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Add individual leaves scattered around
        this.drawLeaves(x, y, width, height, config);
        
        // Add highlights
        this.ctx.fillStyle = this.lightenColor(config.topColor, 25);
        this.ctx.beginPath();
        this.ctx.arc(x - width/6, y - height/6, width/4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add some darker depth areas
        this.ctx.fillStyle = this.darkenColor(config.topColor, 15);
        this.ctx.beginPath();
        this.ctx.arc(x + width/8, y + height/8, width/6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawTreeCrown_Triangle(x, y, width, height, config) {
        // Draw main triangular crown
        this.ctx.fillStyle = config.topColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - height/2);
        this.ctx.lineTo(x - width/2, y + height/2);
        this.ctx.lineTo(x + width/2, y + height/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add layered needle-like sections for pine trees
        const layers = 4;
        for (let i = 0; i < layers; i++) {
            const layerY = y - height/2 + (i * height/layers);
            const layerWidth = width * (1 - i/layers);
            const needleColor = i % 2 === 0 ? config.topColor : this.darkenColor(config.topColor, 10);
            
            this.ctx.fillStyle = needleColor;
            this.ctx.beginPath();
            this.ctx.moveTo(x, layerY);
            this.ctx.lineTo(x - layerWidth/2, layerY + height/layers + 5);
            this.ctx.lineTo(x + layerWidth/2, layerY + height/layers + 5);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Add pine needles around the edges
        this.drawPineNeedles(x, y, width, height, config);
        
        // Add highlights
        this.ctx.fillStyle = this.lightenColor(config.topColor, 20);
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - height/2);
        this.ctx.lineTo(x - width/6, y - height/4);
        this.ctx.lineTo(x + width/6, y - height/4);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawTreeCrown_Oval(x, y, width, height, config) {
        // Draw main oval crown
        this.ctx.fillStyle = config.topColor;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, width/2, height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add organic cloud-like bumps
        const bumps = 6;
        this.ctx.fillStyle = this.lightenColor(config.topColor, 8);
        for (let i = 0; i < bumps; i++) {
            const angle = (i / bumps) * Math.PI * 2;
            const bumpX = x + Math.cos(angle) * (width/3);
            const bumpY = y + Math.sin(angle) * (height/4);
            // Use deterministic variations
            const seed1 = (x * 11 + y * 19 + i * 29) % 1000 / 1000;
            const seed2 = (x * 7 + y * 23 + i * 31) % 1000 / 1000;
            const bumpWidth = width/8 + Math.sin(i * 2.3 + seed1) * 5;
            const bumpHeight = height/8 + Math.cos(i * 1.8 + seed2) * 4;
            
            this.ctx.beginPath();
            this.ctx.ellipse(bumpX, bumpY, bumpWidth, bumpHeight, angle, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Add leaves
        this.drawLeaves(x, y, width, height, config);
        
        // Add highlights
        this.ctx.fillStyle = this.lightenColor(config.topColor, 20);
        this.ctx.beginPath();
        this.ctx.ellipse(x - width/8, y - height/8, width/3, height/4, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLeaves(x, y, width, height, config) {
        // Draw individual leaves scattered around the crown
        const leafCount = Math.floor(width/8); // More leaves for bigger trees
        this.ctx.save();
        
        // Use tree position as seed for consistent leaf placement
        let seed = x * 73 + y * 37 + width * 17;
        
        for (let i = 0; i < leafCount; i++) {
            // Generate deterministic "random" values based on seed
            seed = (seed * 9301 + 49297) % 233280;
            const rand1 = seed / 233280;
            seed = (seed * 9301 + 49297) % 233280;
            const rand2 = seed / 233280;
            seed = (seed * 9301 + 49297) % 233280;
            const rand3 = seed / 233280;
            seed = (seed * 9301 + 49297) % 233280;
            const rand4 = seed / 233280;
            
            const leafX = x + (rand1 - 0.5) * width * 0.8;
            const leafY = y + (rand2 - 0.5) * height * 0.8;
            const leafSize = 3 + rand3 * 4;
            const colorVariation = (rand4 - 0.5) * 30;
            const leafColor = this.varyColorDeterministic(config.topColor, colorVariation);
            
            this.ctx.fillStyle = leafColor;
            this.ctx.save();
            this.ctx.translate(leafX, leafY);
            this.ctx.rotate(rand1 * Math.PI * 2);
            
            // Draw leaf shape
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, leafSize, leafSize/2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }

    drawPineNeedles(x, y, width, height, config) {
        // Draw small needle clusters around pine tree edges
        const needleGroups = Math.floor(width/6);
        this.ctx.save();
        
        // Use tree position as seed for consistent needle placement
        let seed = x * 59 + y * 41 + width * 13;
        
        for (let i = 0; i < needleGroups; i++) {
            const angle = (i / needleGroups) * Math.PI * 2;
            const needleX = x + Math.cos(angle) * (width/2.5);
            const needleY = y + Math.sin(angle) * (height/2.5);
            
            this.ctx.strokeStyle = this.darkenColor(config.topColor, 20);
            this.ctx.lineWidth = 1;
            
            // Draw small needle lines with deterministic randomness
            for (let j = 0; j < 5; j++) {
                seed = (seed * 9301 + 49297) % 233280;
                const rand1 = seed / 233280;
                seed = (seed * 9301 + 49297) % 233280;
                const rand2 = seed / 233280;
                
                const needleAngle = angle + (rand1 - 0.5) * 0.5;
                const needleLength = 6 + rand2 * 4;
                
                this.ctx.beginPath();
                this.ctx.moveTo(needleX, needleY);
                this.ctx.lineTo(
                    needleX + Math.cos(needleAngle) * needleLength,
                    needleY + Math.sin(needleAngle) * needleLength
                );
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }

    drawTreeCrown_Square(x, y, width, height, config) {
        this.ctx.fillRect(x - width/2, y - height/2, width, height);
        
        // Add highlights
        this.ctx.fillStyle = this.lightenColor(config.topColor, 15);
        this.ctx.fillRect(x - width/2, y - height/2, width/3, height);
    }

    drawSnowman(x, y, width, height, config) {
        // Draw three stacked circles for snowman
        const bottomRadius = width/3;
        const middleRadius = width/4;
        const topRadius = width/5;
        
        this.ctx.fillStyle = config.trunkColor; // White
        
        // Bottom circle
        this.ctx.beginPath();
        this.ctx.arc(x, y + height/3, bottomRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Middle circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, middleRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Top circle (head)
        this.ctx.beginPath();
        this.ctx.arc(x, y - height/3, topRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add simple face
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - topRadius/3, y - height/3 - 2, 1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + topRadius/3, y - height/3 - 2, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSnowCaps(x, y, width, height, config) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.globalAlpha = 0.8;
        
        // Simple snow cap on top
        if (config.crownShape === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(x, y - height/2, width/3, 0, Math.PI);
            this.ctx.fill();
        } else if (config.crownShape === 'triangle') {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - height/2);
            this.ctx.lineTo(x - width/4, y - height/4);
            this.ctx.lineTo(x + width/4, y - height/4);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    addWinterFrosting(tree, x, y, width, height, treeConfig) {
        // Add white frosting highlights to make trees stand out in winter
        this.ctx.save();
        
        if (treeConfig.crownShape === 'triangle') {
            // Add bright snow highlights on triangle edges
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.9;
            this.ctx.beginPath();
            this.ctx.moveTo(x - width/2 + 5, y + height - 8);
            this.ctx.lineTo(x, y + 8);
            this.ctx.lineTo(x + width/2 - 5, y + height - 8);
            this.ctx.stroke();
            
            // Add contrast outline
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.moveTo(x - width/2, y + height);
            this.ctx.lineTo(x, y);
            this.ctx.lineTo(x + width/2, y + height);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (treeConfig.crownShape === 'circle' || treeConfig.crownShape === 'oval') {
            // Add bright snow patches and outline
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            if (treeConfig.crownShape === 'circle') {
                this.ctx.arc(x, y + height/2, width/2, 0, Math.PI * 2);
            } else {
                this.ctx.ellipse(x, y + height/2, width/2, height/2, 0, 0, Math.PI * 2);
            }
            this.ctx.stroke();
            
            // Add bright snow highlights
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.globalAlpha = 0.8;
            const numHighlights = 4;
            for (let i = 0; i < numHighlights; i++) {
                const angle = (i / numHighlights) * Math.PI * 2;
                const highlightX = x + Math.cos(angle) * width * 0.25;
                const highlightY = y + height/2 + Math.sin(angle) * height * 0.25;
                
                this.ctx.beginPath();
                this.ctx.arc(highlightX, highlightY, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }

    lightenColor(color, percent) {
        // Simple color lightening function
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        // Simple color darkening function
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R>0?R:0)*0x10000 + (G>0?G:0)*0x100 + (B>0?B:0)).toString(16).slice(1);
    }

    varyColor(color, variance) {
        // Add random variation to a color
        const num = parseInt(color.replace("#",""), 16);
        const R = Math.max(0, Math.min(255, (num >> 16) + (Math.random() - 0.5) * variance));
        const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + (Math.random() - 0.5) * variance));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + (Math.random() - 0.5) * variance));
        return "#" + (0x1000000 + R*0x10000 + G*0x100 + B).toString(16).slice(1);
    }

    varyColorDeterministic(color, variance) {
        // Add deterministic variation to a color (no random)
        const num = parseInt(color.replace("#",""), 16);
        const R = Math.max(0, Math.min(255, (num >> 16) + variance));
        const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + variance));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + variance));
        return "#" + (0x1000000 + Math.floor(R)*0x10000 + Math.floor(G)*0x100 + Math.floor(B)).toString(16).slice(1);
    }

    drawFallingLeaves() {
        this.ctx.save();
        
        this.game.fallingLeaves.forEach(leaf => {
            // Only draw leaves that are in viewport
            if (leaf.x >= this.game.camera.x - 20 && 
                leaf.x <= this.game.camera.x + this.game.canvas.width + 20 &&
                leaf.y >= this.game.camera.y - 20 && 
                leaf.y <= this.game.camera.y + this.game.canvas.height + 20) {
                
                this.ctx.save();
                this.ctx.globalAlpha = leaf.alpha;
                this.ctx.translate(leaf.x, leaf.y);
                this.ctx.rotate(leaf.rotation);
                
                this.ctx.fillStyle = leaf.color;
                
                if (leaf.leafType === 'pointed') {
                    // Draw pointed leaf
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -leaf.size);
                    this.ctx.quadraticCurveTo(-leaf.size/2, -leaf.size/3, -leaf.size/3, leaf.size/2);
                    this.ctx.quadraticCurveTo(0, leaf.size, leaf.size/3, leaf.size/2);
                    this.ctx.quadraticCurveTo(leaf.size/2, -leaf.size/3, 0, -leaf.size);
                    this.ctx.fill();
                } else {
                    // Draw oval leaf
                    this.ctx.beginPath();
                    this.ctx.ellipse(0, 0, leaf.size, leaf.size * 1.5, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                // Add subtle leaf vein
                this.ctx.strokeStyle = this.darkenColor(leaf.color, 20);
                this.ctx.lineWidth = 0.5;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -leaf.size);
                this.ctx.lineTo(0, leaf.size);
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        });
        
        this.ctx.restore();
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

    drawEntitiesWithZOrder() {
        // Create array of all entities (players, trees, and walls) with their y-positions for z-ordering
        const entities = [];
        
        // Add players
        this.game.players.forEach(player => {
            if (player && player.x !== undefined && player.y !== undefined) {
                entities.push({
                    type: 'player',
                    entity: player,
                    z: player.y + GAME_CONFIG.player.size // Use bottom of player for z-order
                });
            }
        });
        
        // Add trees
        this.game.trees.forEach(tree => {
            if (tree && tree.isInViewport(this.game.camera.x, this.game.camera.y, this.game.canvas.width, this.game.canvas.height)) {
                entities.push({
                    type: 'tree',
                    entity: tree,
                    z: tree.y + tree.height/2 // Use middle of tree for z-order
                });
            }
        });
        
        // Sort by z-position (back to front)
        entities.sort((a, b) => a.z - b.z);
        
        // Draw entities in correct order, with walls handled separately for each player
        entities.forEach(item => {
            if (item.type === 'player') {
                // First draw walls that should appear behind this player
                this.drawWallsForPlayer(item.entity, 'behind');
                
                // Then draw the player
                this.drawPlayer(item.entity, item.entity.id === this.game.myId);
                // Draw health bar after player
                if (item.entity.isAlive) {
                    this.drawHealthBar(item.entity);
                }
                
                // Finally draw walls that should appear in front of this player
                this.drawWallsForPlayer(item.entity, 'front');
            } else if (item.type === 'tree') {
                this.drawTree(item.entity);
            }
        });
    }
    
    drawWallsForPlayer(player, renderPhase) {
        this.game.walls.forEach(wall => {
            if (wall.isInViewport(this.game.camera.x, this.game.camera.y, this.game.canvas.width, this.game.canvas.height)) {
                if (wall.segments && wall.segments.length > 0) {
                    // For segmented walls, check each segment
                    wall.segments.forEach(segment => {
                        const wallX = wall.x + segment.x;
                        const wallY = wall.y + segment.y;
                        const wallWidth = segment.width;
                        const wallHeight = segment.height;
                        
                        if (this.shouldRenderWall(player, wallX, wallY, wallWidth, wallHeight, renderPhase)) {
                            this.drawWallSegment(wallX, wallY, wallWidth, wallHeight, wall.type);
                        }
                    });
                } else {
                    // Simple rectangular wall
                    if (this.shouldRenderWall(player, wall.x, wall.y, wall.width, wall.height, renderPhase)) {
                        this.drawWallSegment(wall.x, wall.y, wall.width, wall.height, wall.type);
                    }
                }
            }
        });
    }
    
    shouldRenderWall(player, wallX, wallY, wallWidth, wallHeight, renderPhase) {
        // Calculate player center
        const playerCenterX = player.x;
        const playerCenterY = player.y;
        
        // Calculate wall center
        const wallCenterX = wallX + wallWidth / 2;
        const wallCenterY = wallY + wallHeight / 2;
        
        // Determine if player is "behind" the wall based on the angled perspective
        // The perspective extends towards bottom-right, so players are "behind" when they are:
        // 1. To the left of the wall (lower X)
        // 2. Above the wall (lower Y)
        // But we need to weight this based on the perspective angle
        
        const deltaX = playerCenterX - wallCenterX;
        const deltaY = playerCenterY - wallCenterY;
        
        // Use a 45-degree perspective line to determine if player is behind wall
        // For angled perspective extending to bottom-right:
        // Player is "behind" if they are above and to the left of the perspective line
        const perspectiveOffset = deltaX + deltaY; // This creates a 45-degree dividing line
        
        const playerIsBehind = perspectiveOffset < 0;
        
        // Render wall in "behind" phase if player should be hidden by it
        // Render wall in "front" phase if player should be visible in front of it
        return (renderPhase === 'behind' && playerIsBehind) || 
               (renderPhase === 'front' && !playerIsBehind);
    }

    drawPlayers() {
        this.game.players.forEach(player => {
            if (player.isInViewport(this.game.camera.x, this.game.camera.y)) {
                this.drawPlayer(player, player.id === this.game.myId);
                // Show health bars with names above all players
                if (player.isAlive) {
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

        // Player names are now shown above health bars instead of separate tags
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
        this.ctx.fillText(player.name || player.id, player.x, player.y + GAME_CONFIG.player.size + 15);
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

        // Player name text
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name || player.id, x, y - 6);

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
