import { GAME_CONFIG } from '../config/gameConfig.js';

export class Player {
    constructor(id, data = {}) {
        this.id = id;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.color = data.color || '#FFFFFF';
        this.health = data.health || GAME_CONFIG.player.maxHealth;
        this.maxHealth = GAME_CONFIG.player.maxHealth;
        this.kills = data.kills || 0;
        this.isBurning = data.isBurning || false;
        this.burnEndTime = data.burnEndTime || 0;
        this.isAlive = data.isAlive !== undefined ? data.isAlive : true;
        this.facingLeft = data.facingLeft || false;
        this.aimingAngle = data.aimingAngle || 0; // New: current aiming direction in radians
        this.spawnProtection = data.spawnProtection || false;
        this.isRespawning = data.isRespawning || false;
        this.currentSpeedMultiplier = data.currentSpeedMultiplier || 1.0;
        this.speedBuffs = data.speedBuffs || [];
    }

    update(data) {
        Object.assign(this, data);
    }

    move(x, y) {
        this.x = Math.max(GAME_CONFIG.player.size, 
                         Math.min(GAME_CONFIG.world.width - GAME_CONFIG.player.size, x));
        this.y = Math.max(GAME_CONFIG.player.size, 
                         Math.min(GAME_CONFIG.world.height - GAME_CONFIG.player.size, y));
    }

    getEffectiveSpeed() {
        return GAME_CONFIG.player.speed * this.currentSpeedMultiplier;
    }

    setFacing(direction) {
        const oldFacing = this.facingLeft;
        this.facingLeft = direction < 0;
        return oldFacing !== this.facingLeft;
    }

    getMovementData() {
        return {
            x: this.x,
            y: this.y,
            facingLeft: this.facingLeft,
            aimingAngle: this.aimingAngle
        };
    }

    isInViewport(cameraX, cameraY) {
        return this.x >= cameraX - GAME_CONFIG.world.viewportPadding &&
               this.x <= cameraX + GAME_CONFIG.canvas.width + GAME_CONFIG.world.viewportPadding &&
               this.y >= cameraY - GAME_CONFIG.world.viewportPadding &&
               this.y <= cameraY + GAME_CONFIG.canvas.height + GAME_CONFIG.world.viewportPadding;
    }
}
