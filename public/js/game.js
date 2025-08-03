import { GAME_CONFIG } from './config/gameConfig.js';
import { Player } from './entities/Player.js';
import { Spell } from './entities/Spell.js';
import { Wall } from './entities/Wall.js';
import { SpeedItem } from './entities/SpeedItem.js';
import { InputSystem } from './systems/InputSystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { NetworkSystem } from './systems/NetworkSystem.js';
import { UISystem } from './ui/UISystem.js';

export class Game {
    constructor() {
        // Initialize main elements
        this.canvas = document.getElementById('gameCanvas');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.players = new Map();
        this.spells = new Map();
        this.walls = new Map();
        this.items = new Map();
        this.explosions = []; // Array to store active explosions
        this.myId = null;
        this.isDead = false;
        this.isDestroyed = false;
        
        // Camera position
        this.camera = {
            x: 0,
            y: 0
        };
        
        // Initialize systems
        this.network = new NetworkSystem(this);
        this.input = new InputSystem(this);
        this.renderer = new RenderSystem(this);
        this.ui = new UISystem(this);
        
        // Start game loop
        this.lastUpdateTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (this.isDestroyed) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        
        this.update(deltaTime);
        this.renderer.render();
        
        this.lastUpdateTime = currentTime;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    // Add cleanup method
    destroy() {
        this.isDestroyed = true;
        
        // Cleanup systems
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }
        
        if (this.input) {
            this.input.destroy();
            this.input = null;
        }
        
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        
        // Clear collections
        this.players.clear();
        this.spells.clear();
        this.walls.clear();
        this.items.clear();
        this.explosions.length = 0;
        
        // Clear references
        this.canvas = null;
        this.minimapCanvas = null;
        this.renderer = null;
    }

    update(deltaTime) {
        if (!this.isDead) {
            this.input.update();
        }
        this.updateCamera();
        this.updateSpells(deltaTime);
        this.updateExplosions(deltaTime);
    }

    updateCamera(instant = false) {
        if (!this.myId || !this.players.has(this.myId)) return;
        
        const player = this.players.get(this.myId);
        const targetX = player.x - this.canvas.width / 2;
        const targetY = player.y - this.canvas.height / 2;
        
        if (instant) {
            this.camera.x = targetX;
            this.camera.y = targetY;
        } else {
            // Smooth camera movement
            const smoothness = 0.1;
            this.camera.x += (targetX - this.camera.x) * smoothness;
            this.camera.y += (targetY - this.camera.y) * smoothness;
        }
        
        // Keep camera within world bounds
        this.camera.x = Math.max(0, Math.min(GAME_CONFIG.world.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(GAME_CONFIG.world.height - this.canvas.height, this.camera.y));
    }

    updateSpells(deltaTime) {
        // Use Array.from to avoid modification during iteration issues
        const spellEntries = Array.from(this.spells.entries());
        
        for (const [id, spell] of spellEntries) {
            const shouldRemove = spell.update(deltaTime, this.players, this.network.socket, this);
            if (shouldRemove) {
                this.spells.delete(id);
            }
        }
    }

    addWall(wallData) {
        const wall = new Wall(wallData);
        this.walls.set(wall.id, wall);
    }

    setWalls(wallsData) {
        this.walls.clear();
        Object.values(wallsData).forEach(wallData => {
            this.addWall(wallData);
        });
    }

    checkWallCollision(x, y, radius = 0) {
        for (const [id, wall] of this.walls) {
            if (wall.collidesWith(x, y, radius)) {
                return wall;
            }
        }
        return null;
    }

    checkWallLineCollision(x1, y1, x2, y2) {
        for (const [id, wall] of this.walls) {
            if (wall.intersectsLine(x1, y1, x2, y2)) {
                return wall;
            }
        }
        return null;
    }

    // Item management methods
    addItem(itemData) {
        const item = new SpeedItem(itemData);
        this.items.set(item.id, item);
    }

    setItems(itemsData) {
        this.items.clear();
        Object.values(itemsData).forEach(itemData => {
            this.addItem(itemData);
        });
    }

    removeItem(itemId) {
        this.items.delete(itemId);
    }

    checkItemPickup() {
        if (!this.canPlay()) return;
        
        const player = this.players.get(this.myId);
        if (!player) return;

        for (const [itemId, item] of this.items) {
            if (item.isCollidingWithPlayer(player.x, player.y)) {
                // Item will be picked up on server side
                break;
            }
        }
    }

    canPlay() {
        return this.myId && 
               this.players.has(this.myId) && 
               !this.isDead;
    }

    handleLocalPlayerDeath() {
        this.isDead = true;
        const player = this.players.get(this.myId);
        if (player) {
            player.isAlive = false;
            player.health = 0;
        }
        this.ui.showDeathModal();
    }

    handleLocalPlayerRespawn() {
        this.isDead = false;
        this.updateCamera(true);
        this.ui.hideDeathModal();
        
        setTimeout(() => {
            const player = this.players.get(this.myId);
            if (player) {
                player.isRespawning = false;
            }
        }, 1000);
    }

    addExplosion(x, y, type = 'hit') {
        const explosion = {
            x,
            y,
            type,
            startTime: Date.now(),
            duration: 500, // 500ms explosion (was 300ms)
            size: type === 'wall' ? 35 : 40 // Larger explosions
        };
        this.explosions.push(explosion);
        console.log('Added explosion:', explosion); // Debug log
    }

    updateExplosions(deltaTime) {
        const currentTime = Date.now();
        // Use a more efficient cleanup approach
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            const age = currentTime - explosion.startTime;
            if (age >= explosion.duration) {
                this.explosions.splice(i, 1);
            }
        }
    }
}

// Store game instance for cleanup
let gameInstance = null;

// Start the game when the window loads
window.addEventListener('load', () => {
    // Cleanup existing instance if any
    if (gameInstance) {
        gameInstance.destroy();
    }
    gameInstance = new Game();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameInstance) {
        gameInstance.destroy();
        gameInstance = null;
    }
});
