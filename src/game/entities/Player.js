const gameConfig = require('../../config/gameConfig');

class Player {
    constructor(id) {
        this.id = id;
        this.name = this.generatePlayerName(); // Generate a friendly name
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
        this.spawnProtectionEndTime = 0; // Timestamp when spawn protection ends
        this.speedBuffs = []; // Array to track multiple speed buffs
        this.currentSpeedMultiplier = 1.0;
        this.lastBroadcastMana = gameConfig.player.maxMana; // Track last broadcasted mana value
        this.manaChanged = false; // Flag for optimization
        
        // Smooth movement system properties (mainly for client-server sync)
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Ring of Fire inventory
        this.ringOfFireCharges = 0;
        
        // Kill tracking
        this.lastAttackerId = null; // Who last damaged this player
        this.lastAttackerTime = 0;   // When the last attack happened
        this.attackerTimeoutMs = 10000; // 10 seconds to credit kills
        
        // Tactical movement boost
        this.tacticalBoostActive = false;
        this.tacticalBoostEndTime = 0;
    }

    getRandomColor() {
        return gameConfig.colors[Math.floor(Math.random() * gameConfig.colors.length)];
    }

    generatePlayerName() {
        const adjectives = ['Swift', 'Mighty', 'Wise', 'Brave', 'Noble', 'Fierce', 'Clever', 'Bold', 'Quick', 'Strong'];
        const nouns = ['Wizard', 'Mage', 'Sorcerer', 'Enchanter', 'Warlock', 'Mystic', 'Arcane', 'Scholar', 'Master', 'Sage'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adjective} ${noun}`;
    }

    generatePlayerName() {
        const adjectives = ['Swift', 'Mighty', 'Wise', 'Brave', 'Noble', 'Fierce', 'Clever', 'Bold', 'Quick', 'Strong'];
        const nouns = ['Wizard', 'Mage', 'Sorcerer', 'Enchanter', 'Warlock', 'Mystic', 'Arcane', 'Scholar', 'Master', 'Sage'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adjective} ${noun}`;
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
        this.spawnProtectionEndTime = Date.now() + gameConfig.player.spawnProtectionDuration;
        
        // Reset all item states on respawn
        this.ringOfFireCharges = 0;
        this.speedBuffs = [];
        this.currentSpeedMultiplier = 1.0;

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
            isAlive: this.isAlive,
            ringOfFireCharges: this.ringOfFireCharges,
            speedBuffs: this.speedBuffs,
            currentSpeedMultiplier: this.currentSpeedMultiplier,
            mana: this.mana
        };
    }

    takeDamage(amount, attackerId = null) {
        if (!this.isAlive || this.spawnProtection) return false;
        
        // Track who attacked this player (only if explicitly provided)
        if (attackerId !== null) {
            this.lastAttackerId = attackerId;
            this.lastAttackerTime = Date.now();
        }
        
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.isAlive = false;
            
            // Handle kill rewards if there's a valid attacker
            this.handleKillReward();
        }
        return true;
    }
    
    handleKillReward() {
        // Check if we have a valid recent attacker
        if (this.lastAttackerId && 
            Date.now() - this.lastAttackerTime <= this.attackerTimeoutMs) {
            
            // Store kill data for the calling system to handle
            this.lastKillData = {
                killerId: this.lastAttackerId,
                victimId: this.id,
                shouldReward: true
            };
            
            return this.lastKillData;
        }
        
        this.lastKillData = null; // No valid killer
        return null;
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

    restoreHealth(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health - oldHealth; // Return actual amount restored
    }

    updateSpawnProtection() {
        if (this.spawnProtection && Date.now() >= this.spawnProtectionEndTime) {
            this.spawnProtection = false;
        }
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

    // Bot physics simulation (same as client-side)
    updateVelocity(inputX, inputY, deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        const maxVelocity = this.getEffectiveSpeed() || 400; // Default speed if not defined
        const acceleration = gameConfig.player.acceleration;
        const deceleration = gameConfig.player.deceleration;
        
        // Calculate target velocity based on input
        const targetVelX = inputX * maxVelocity;
        const targetVelY = inputY * maxVelocity;
        
        // Apply acceleration towards target velocity (horizontal)
        if (inputX !== 0) {
            const velDiffX = targetVelX - this.velocityX;
            const accelX = Math.sign(velDiffX) * acceleration * deltaSeconds;
            
            if (Math.abs(accelX) >= Math.abs(velDiffX)) {
                this.velocityX = targetVelX;
            } else {
                this.velocityX += accelX;
            }
        } else {
            // No horizontal input - apply deceleration
            if (Math.abs(this.velocityX) > 0.1) {
                const decelX = Math.sign(this.velocityX) * deceleration * deltaSeconds;
                if (Math.abs(decelX) >= Math.abs(this.velocityX)) {
                    this.velocityX = 0;
                } else {
                    this.velocityX -= decelX;
                }
            } else {
                this.velocityX = 0;
            }
        }
        
        // Apply acceleration towards target velocity (vertical)
        if (inputY !== 0) {
            const velDiffY = targetVelY - this.velocityY;
            const accelY = Math.sign(velDiffY) * acceleration * deltaSeconds;
            
            if (Math.abs(accelY) >= Math.abs(velDiffY)) {
                this.velocityY = targetVelY;
            } else {
                this.velocityY += accelY;
            }
        } else {
            // No vertical input - apply deceleration
            if (Math.abs(this.velocityY) > 0.1) {
                const decelY = Math.sign(this.velocityY) * deceleration * deltaSeconds;
                if (Math.abs(decelY) >= Math.abs(this.velocityY)) {
                    this.velocityY = 0;
                } else {
                    this.velocityY -= decelY;
                }
            } else {
                this.velocityY = 0;
            }
        }
    }

    applyRecoil(angle, force) {
        // Apply recoil force in the opposite direction of the spell
        const recoilAngle = angle + Math.PI;
        const recoilX = Math.cos(recoilAngle) * force;
        const recoilY = Math.sin(recoilAngle) * force;
        
        // For bots, limit recoil to prevent wall tunneling
        if (this.isBot) {
            const maxRecoilVelocity = 50; // Much smaller recoil for bots to prevent tunneling
            const limitedRecoilX = Math.max(-maxRecoilVelocity, Math.min(maxRecoilVelocity, recoilX));
            const limitedRecoilY = Math.max(-maxRecoilVelocity, Math.min(maxRecoilVelocity, recoilY));
                        
            // For bots: NO recoil velocity at all to prevent any chance of wall tunneling
            // Recoil was causing the wall walking issue!
            // Do not add any recoil velocity to bots
        } else {
            // Check if tactical boost should expire
            if (this.tacticalBoostActive && Date.now() > this.tacticalBoostEndTime) {
                this.tacticalBoostActive = false;
            }
            
            // Check if player is casting in opposite direction for speed boost
            const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            
            if (currentSpeed > 20 && !this.tacticalBoostActive) { // Prevent stacking boosts
                // Calculate player's current movement direction
                const movementAngle = Math.atan2(this.velocityY, this.velocityX);
                
                // Calculate angle difference between movement and spell direction
                let angleDiff = Math.abs(movementAngle - angle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff; // Normalize to 0-π
                
                // If casting roughly opposite to movement direction (within 45° of opposite)
                const oppositeThreshold = Math.PI * 0.75; // 135 degrees (π - π/4)
                if (angleDiff >= oppositeThreshold) {
                    // Grant very modest speed boost to prevent going supersonic
                    const tacticalBoostMultiplier = 1.1; // Just 10% extra - subtle but useful
                    const boostedRecoilX = recoilX * tacticalBoostMultiplier;
                    const boostedRecoilY = recoilY * tacticalBoostMultiplier;
                    
                    // Apply the boost directly without speed limits
                    this.velocityX += boostedRecoilX;
                    this.velocityY += boostedRecoilY;
                    
                    // Activate boost flag to prevent stacking
                    this.tacticalBoostActive = true;
                    this.tacticalBoostEndTime = Date.now() + 500;
                    
                    console.log(`Player ${this.id} got tactical speed boost! Old speed: ${currentSpeed.toFixed(1)}, New speed: ${Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY).toFixed(1)}`);
                    return; // Exit early, we've applied the boosted recoil
                }
            }
            
            // Normal recoil for human players
            this.velocityX += recoilX;
            this.velocityY += recoilY;
        }
    }

    // Mana change tracking methods for optimization
    hasManaChanged() {
        return this.manaChanged;
    }

    resetManaChangeFlag() {
        this.manaChanged = false;
        this.lastBroadcastMana = this.mana;
    }

    // Ring of Fire methods
    addRingOfFireCharge() {
        this.ringOfFireCharges++;
        console.log(`Player ${this.id} now has ${this.ringOfFireCharges} Ring of Fire charges`);
    }

    useRingOfFire() {
        if (this.ringOfFireCharges > 0 && this.mana >= 25) {
            this.ringOfFireCharges--;
            this.consumeMana(25);
            console.log(`Player ${this.id} used Ring of Fire! Charges remaining: ${this.ringOfFireCharges}`);
            return true;
        }
        return false;
    }

    hasRingOfFire() {
        return this.ringOfFireCharges > 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name || this.id, // Include bot names
            isBot: this.isBot || false, // Flag for bots
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
            speedBuffs: this.speedBuffs,
            ringOfFireCharges: this.ringOfFireCharges
        };
    }
}

module.exports = Player;
