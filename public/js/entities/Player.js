import { GAME_CONFIG } from '../config/gameConfig.js';

export class Player {
    constructor(id, data = {}) {
        this.id = id;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.color = data.color || '#FFFFFF';
        this.health = data.health || GAME_CONFIG.player.maxHealth;
        this.maxHealth = GAME_CONFIG.player.maxHealth;
        this.mana = data.mana || GAME_CONFIG.player.maxMana;
        this.maxMana = GAME_CONFIG.player.maxMana;
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
        
        // Ensure currentSpeedMultiplier is always a valid number
        if (typeof this.currentSpeedMultiplier !== 'number' || isNaN(this.currentSpeedMultiplier)) {
            this.currentSpeedMultiplier = 1.0;
        }
        
        // Track recent mana pickups for UI display
        this.recentManaPickups = data.recentManaPickups || [];
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

    getAimingData() {
        return {
            aimingAngle: this.aimingAngle
        };
    }

    isInViewport(cameraX, cameraY) {
        return this.x >= cameraX - GAME_CONFIG.world.viewportPadding &&
               this.x <= cameraX + GAME_CONFIG.canvas.width + GAME_CONFIG.world.viewportPadding &&
               this.y >= cameraY - GAME_CONFIG.world.viewportPadding &&
               this.y <= cameraY + GAME_CONFIG.canvas.height + GAME_CONFIG.world.viewportPadding;
    }
    
    // Add a recent mana pickup for UI display
    addRecentManaPickup(amount) {
        const pickup = {
            amount: amount,
            timestamp: Date.now(),
            duration: 3000 // Show for 3 seconds
        };
        this.recentManaPickups.push(pickup);
        
        // Clean up old pickups
        this.cleanupExpiredManaPickups();
    }
    
    // Clean up expired mana pickups
    cleanupExpiredManaPickups() {
        const now = Date.now();
        this.recentManaPickups = this.recentManaPickups.filter(
            pickup => now - pickup.timestamp < pickup.duration
        );
    }
    
    // Get total recent mana picked up (for display)
    getTotalRecentMana() {
        this.cleanupExpiredManaPickups();
        return this.recentManaPickups.reduce((total, pickup) => total + pickup.amount, 0);
    }
}
