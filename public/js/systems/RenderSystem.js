import { GAME_CONFIG } from '../config/gameConfig.js';

export class RenderSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.canvas.getContext('2d');
        this.minimapCtx = game.minimapCanvas.getContext('2d');
        this.floorCache = null;
        this.initializeFloor();
    }

    render() {
        this.clearCanvas();
        this.ctx.save();
        this.ctx.translate(-this.game.camera.x, -this.game.camera.y);
        
        this.drawFloor();
        this.drawWorldBoundaries();
        this.drawGrid();
        this.drawSpells();
        this.drawPlayers();
        
        this.ctx.restore();
        this.renderMinimap();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    }

    drawWorldBoundaries() {
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, GAME_CONFIG.world.width, GAME_CONFIG.world.height);
    }

    drawGrid() {
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${GAME_CONFIG.grid.opacity})`;
        this.ctx.lineWidth = 1;

        const startX = Math.floor(this.game.camera.x / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;
        const endX = Math.ceil((this.game.camera.x + this.game.canvas.width) / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;
        const startY = Math.floor(this.game.camera.y / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;
        const endY = Math.ceil((this.game.camera.y + this.game.canvas.height) / GAME_CONFIG.grid.size) * GAME_CONFIG.grid.size;

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
                
                // Determine tile type based on weighted random
                let tileType = 'stone';
                if (rand1 < GAME_CONFIG.floor.patterns.darkStone.weight) {
                    tileType = 'darkStone';
                } else if (rand1 > (1 - GAME_CONFIG.floor.patterns.accent.weight)) {
                    tileType = 'accent';
                }
                
                // Choose variant within the tile type
                const variants = GAME_CONFIG.floor.patterns[tileType].variants;
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

    drawPlayers() {
        this.game.players.forEach(player => {
            if (player.isInViewport(this.game.camera.x, this.game.camera.y)) {
                this.drawPlayer(player, player.id === this.game.myId);
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
        this.ctx.scale(player.facingLeft ? -1 : 1, 1);
        const x = player.facingLeft ? -player.x : player.x;

        // Body
        this.ctx.fillStyle = player.color;
        this.ctx.beginPath();
        this.ctx.arc(x, player.y, GAME_CONFIG.player.size, 0, Math.PI * 2);
        this.ctx.fill();

        if (isMe) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.drawWizardRobe(x, player);
        this.drawWizardHat(x, player);
        this.drawWizardFace(x, player);
        this.drawWizardStaff(x, player);
    }

    drawWizardRobe(x, player) {
        this.ctx.fillStyle = player.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - GAME_CONFIG.player.size, player.y);
        this.ctx.lineTo(x - GAME_CONFIG.player.size + 5, player.y + GAME_CONFIG.player.size + 5);
        this.ctx.lineTo(x + GAME_CONFIG.player.size - 5, player.y + GAME_CONFIG.player.size + 5);
        this.ctx.lineTo(x + GAME_CONFIG.player.size, player.y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawWizardHat(x, player) {
        // Hat
        this.ctx.fillStyle = '#4A4A4A';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 15, player.y - 15);
        this.ctx.lineTo(x, player.y - 35);
        this.ctx.lineTo(x + 15, player.y - 15);
        this.ctx.closePath();
        this.ctx.fill();

        // Star
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⭐', x, player.y - 20);
    }

    drawWizardFace(x, player) {
        // Face
        this.ctx.fillStyle = '#FFE4C4';
        this.ctx.beginPath();
        this.ctx.arc(x, player.y - 2, 10, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, player.y - 5, 2, 0, Math.PI * 2);
        this.ctx.arc(x + 4, player.y - 5, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Beard
        this.ctx.fillStyle = '#DDDDDD';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 8, player.y - 2);
        this.ctx.lineTo(x, player.y + 10);
        this.ctx.lineTo(x + 8, player.y - 2);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawWizardStaff(x, player) {
        // Staff
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 20, player.y - 10);
        this.ctx.lineTo(x + 20, player.y + 25);
        this.ctx.stroke();

        // Staff orb
        this.ctx.fillStyle = '#9370DB';
        this.ctx.beginPath();
        this.ctx.arc(x + 20, player.y - 15, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPlayerTag(player) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('YOU', player.x, player.y + GAME_CONFIG.player.size + 15);
    }

    drawHealthBar(player) {
        const x = player.x;
        const y = player.y - GAME_CONFIG.player.size - 20;
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

    renderMinimap() {
        this.minimapCtx.clearRect(0, 0, this.game.minimapCanvas.width, this.game.minimapCanvas.height);
        
        const scale = this.game.minimapCanvas.width / GAME_CONFIG.world.width;
        
        // Draw world boundaries
        this.minimapCtx.strokeStyle = '#444';
        this.minimapCtx.strokeRect(0, 0, this.game.minimapCanvas.width, this.game.minimapCanvas.height);
        
        // Draw viewport area
        const vpX = this.game.camera.x * scale;
        const vpY = this.game.camera.y * scale;
        const vpW = GAME_CONFIG.canvas.width * scale;
        const vpH = GAME_CONFIG.canvas.height * scale;
        
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
    }
}
