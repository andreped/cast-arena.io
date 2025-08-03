import { GAME_CONFIG } from '../config/gameConfig.js';

export class Spell {
    constructor(data) {
        this.id = data.id;
        this.casterId = data.casterId;
        this.type = data.type || 'fireball';
        this.x = data.x;
        this.y = data.y;
        this.targetX = data.targetX;
        this.targetY = data.targetY;
        this.angle = data.angle || Math.atan2(data.targetY - data.y, data.targetX - data.x);
        this.speed = GAME_CONFIG.spell.speed;
        this.damage = GAME_CONFIG.spell.damage;
        this.createdAt = Date.now();
        this.trail = [];
    }

    update(dt) {
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) {
            this.trail.shift();
        }

        // Update position based on angle and speed
        const dx = Math.cos(this.angle) * this.speed * (dt / 1000);
        const dy = Math.sin(this.angle) * this.speed * (dt / 1000);
        
        this.x += dx;
        this.y += dy;

        // Check if spell is out of bounds
        return this.x < 0 || this.x > GAME_CONFIG.world.width ||
               this.y < 0 || this.y > GAME_CONFIG.world.height;
    }

    isInViewport(cameraX, cameraY) {
        const padding = GAME_CONFIG.canvas.width; // Extra padding for spell trails
        return this.x >= cameraX - padding &&
               this.x <= cameraX + GAME_CONFIG.canvas.width + padding &&
               this.y >= cameraY - padding &&
               this.y <= cameraY + GAME_CONFIG.canvas.height + padding;
    }
}
