const gameConfig = require('../../config/gameConfig');

class Player {
    constructor(id) {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.color = this.getRandomColor();
        this.health = gameConfig.player.maxHealth;
        this.maxHealth = gameConfig.player.maxHealth;
        this.kills = 0;
        this.isBurning = false;
        this.burnEndTime = 0;
        this.isAlive = true;
        this.facingLeft = false;
        this.aimingAngle = 0; // Default aiming direction (right)
        this.hasSpawned = false;
        this.respawnImmunity = false;
        this.spawnProtection = false;
        this.speedBuffs = []; // Array to track multiple speed buffs
        this.currentSpeedMultiplier = 1.0;
    }

    getRandomColor() {
        return gameConfig.colors[Math.floor(Math.random() * gameConfig.colors.length)];
    }

    respawn(safePosition = null) {
        this.health = this.maxHealth;
        
        if (safePosition) {
            this.x = safePosition.x;
            this.y = safePosition.y;
        } else {
            // Fallback to random position if no safe position provided
            this.x = Math.random() * gameConfig.world.width;
            this.y = Math.random() * gameConfig.world.height;
        }
        
        this.isBurning = false;
        this.isAlive = true;
        this.burnEndTime = 0;
        this.respawnImmunity = true;
        this.spawnProtection = true;

        if (this.hasSpawned) {
            this.kills = 0;
        } else {
            this.hasSpawned = true;
        }

        return {
            id: this.id,
            x: this.x,
            y: this.y,
            health: this.health,
            kills: this.kills,
            isAlive: this.isAlive
        };
    }

    takeDamage(amount) {
        if (!this.isAlive || this.spawnProtection) return false;
        
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.isAlive = false;
        }
        return true;
    }

    addSpeedBuff(speedMultiplier, duration) {
        const currentTime = Date.now();
        const buff = {
            multiplier: speedMultiplier,
            endTime: currentTime + duration,
            createdAt: currentTime
        };
        
        this.speedBuffs.push(buff);
        this.updateSpeedMultiplier();
        
        console.log(`Player ${this.id} now has ${this.speedBuffs.length} speed buff(s), total multiplier: ${this.currentSpeedMultiplier}`);
    }

    updateSpeedBuffs() {
        const currentTime = Date.now();
        const initialLength = this.speedBuffs.length;
        
        // Remove expired buffs
        this.speedBuffs = this.speedBuffs.filter(buff => buff.endTime > currentTime);
        
        // Update speed multiplier if buffs changed
        if (this.speedBuffs.length !== initialLength) {
            this.updateSpeedMultiplier();
        }
    }

    updateSpeedMultiplier() {
        // Calculate total speed multiplier from all active buffs
        this.currentSpeedMultiplier = 1.0;
        
        for (const buff of this.speedBuffs) {
            this.currentSpeedMultiplier += buff.multiplier;
        }
        
        // Cap the maximum speed boost (optional - prevent crazy speeds)
        this.currentSpeedMultiplier = Math.min(this.currentSpeedMultiplier, 3.0); // Max 3x speed
    }

    getEffectiveSpeed() {
        return gameConfig.player.speed * this.currentSpeedMultiplier;
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            color: this.color,
            health: this.health,
            maxHealth: this.maxHealth,
            kills: this.kills,
            isBurning: this.isBurning,
            burnEndTime: this.burnEndTime,
            isAlive: this.isAlive,
            facingLeft: this.facingLeft,
            aimingAngle: this.aimingAngle,
            currentSpeedMultiplier: this.currentSpeedMultiplier,
            speedBuffs: this.speedBuffs
        };
    }
}

module.exports = Player;
