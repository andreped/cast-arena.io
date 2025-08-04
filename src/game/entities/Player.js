const gameConfig = require('../../config/gameConfig');

class Player {
    constructor(id) {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.color = this.getRandomColor();
        this.health = gameConfig.player.maxHealth;
        this.maxHealth = gameConfig.player.maxHealth;
        this.mana = gameConfig.player.maxMana;
        this.maxMana = gameConfig.player.maxMana;
        this.lastManaRegenTime = Date.now();
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
        this.lastBroadcastMana = gameConfig.player.maxMana; // Track last broadcasted mana value
        this.manaChanged = false; // Flag for optimization
    }

    getRandomColor() {
        return gameConfig.colors[Math.floor(Math.random() * gameConfig.colors.length)];
    }

    respawn(safePosition = null) {
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.lastManaRegenTime = Date.now();
        
        if (safePosition) {
            this.x = safePosition.x;
            this.y = safePosition.y;
        } else {
            // Safe fallback to center if no safe position provided
            console.warn('Player respawn called without safe position, using center fallback');
            this.x = gameConfig.world.width / 2;
            this.y = gameConfig.world.height / 2;
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

    consumeMana(amount) {
        if (this.mana >= amount) {
            const oldMana = this.mana;
            this.mana -= amount;
            
            // Mark mana as changed if it changed significantly (at least 2 points)
            if (Math.abs(this.mana - this.lastBroadcastMana) >= 2) {
                this.manaChanged = true;
            }
            
            return true;
        }
        return false;
    }

    restoreMana(amount) {
        const oldMana = this.mana;
        this.mana = Math.min(this.maxMana, this.mana + amount);
        
        // Mark mana as changed if it changed significantly (at least 2 points)
        if (Math.abs(this.mana - this.lastBroadcastMana) >= 2) {
            this.manaChanged = true;
        }
        
        return this.mana - oldMana; // Return actual amount restored
    }

    updateMana() {
        const oldMana = this.mana;
        
        if (this.mana < this.maxMana) {
            const now = Date.now();
            const timeDiff = (now - this.lastManaRegenTime) / 1000; // Convert to seconds
            const manaToRestore = timeDiff * gameConfig.player.manaRegenRate;
            
            if (manaToRestore >= 1) { // Only regenerate when we have at least 1 point to add
                this.mana = Math.min(this.maxMana, this.mana + Math.floor(manaToRestore));
                this.lastManaRegenTime = now;
            }
        }
        
        // Mark mana as changed if it changed significantly (at least 2 points)
        if (Math.abs(this.mana - this.lastBroadcastMana) >= 2) {
            this.manaChanged = true;
        }
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

        // Cap the maximum speed boost at 250%
        this.currentSpeedMultiplier = Math.min(this.currentSpeedMultiplier, 2.5); // Max 2.5x speed (250%)
    }

    getEffectiveSpeed() {
        return gameConfig.player.speed * this.currentSpeedMultiplier;
    }

    // Mana change tracking methods for optimization
    hasManaChanged() {
        return this.manaChanged;
    }

    resetManaChangeFlag() {
        this.manaChanged = false;
        this.lastBroadcastMana = this.mana;
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            color: this.color,
            health: this.health,
            maxHealth: this.maxHealth,
            mana: this.mana,
            maxMana: this.maxMana,
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
