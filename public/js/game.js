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
        // Store global reference for spell collision checking
        window.gameInstance = this;
        
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
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        
        this.update(deltaTime);
        this.renderer.render();
        
        this.lastUpdateTime = currentTime;
        requestAnimationFrame(this.gameLoop.bind(this));
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
        this.spells.forEach((spell, id) => {
            const shouldRemove = spell.update(deltaTime, this.players, this.network.socket);
            if (shouldRemove) {
                console.log('Spell should be removed:', spell.x, spell.y); // Debug log
                
                // Check if spell hit a wall by testing wall collision at current position
                if (this.checkWallLineCollision) {
                    const wallHit = this.checkWallLineCollision(
                        spell.x - spell.directionX * 20, 
                        spell.y - spell.directionY * 20,
                        spell.x, 
                        spell.y
                    );
                    if (wallHit) {
                        // Create explosion effect for wall hit
                        console.log('Wall hit detected, creating explosion at:', spell.x, spell.y);
                        this.addExplosion(spell.x, spell.y, 'wall');
                    } else {
                        console.log('No wall hit detected, creating explosion anyway for testing');
                        this.addExplosion(spell.x, spell.y, 'wall');
                    }
                } else {
                    console.log('checkWallLineCollision not available, creating explosion anyway');
                    this.addExplosion(spell.x, spell.y, 'wall');
                }
                this.spells.delete(id);
            }
        });
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
        this.explosions = this.explosions.filter(explosion => {
            const age = currentTime - explosion.startTime;
            return age < explosion.duration;
        });
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    new Game();
});
