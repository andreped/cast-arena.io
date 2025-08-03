import { GAME_CONFIG } from './config/gameConfig.js';
import { Player } from './entities/Player.js';
import { Spell } from './entities/Spell.js';
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
            if (spell.update(deltaTime)) {
                this.spells.delete(id);
            }
        });
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
}

// Start the game when the window loads
window.addEventListener('load', () => {
    new Game();
});
