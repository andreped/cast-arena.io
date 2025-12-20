import { GAME_CONFIG } from '../config/gameConfig.js';

export class Player {
    constructor(id, data = {}, game = null) {
        this.id = id;
        this.game = game; // Reference to game for camera access
        this.name = data.name || id; // Bot names or player ID
        this.isBot = data.isBot || false; // Flag to identify bots
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
        
        // Ring of Fire inventory
        this.ringOfFireCharges = data.ringOfFireCharges || 0;
        
        // Smooth movement system - velocity and acceleration
        this.velocityX = data.velocityX || 0;
        this.velocityY = data.velocityY || 0;
        this.maxVelocity = this.getEffectiveSpeed();
        this.acceleration = data.acceleration || GAME_CONFIG.player.acceleration || 800; // pixels per second²
        this.deceleration = data.deceleration || GAME_CONFIG.player.deceleration || 1200; // pixels per second²
        this.airResistance = data.airResistance || GAME_CONFIG.player.airResistance || 0.85; // friction when no input
        
        // Tactical movement boost system
        this.tacticalBoostActive = false;
        this.tacticalBoostEndTime = 0;
    }

    update(data) {
        Object.assign(this, data);
    }

    move(x, y) {
        // Enforce world boundaries with proper padding
        const minX = GAME_CONFIG.player.size;
        const maxX = GAME_CONFIG.world.width - GAME_CONFIG.player.size;
        const minY = GAME_CONFIG.player.size;
        const maxY = GAME_CONFIG.world.height - GAME_CONFIG.player.size;
        
        this.x = Math.max(minX, Math.min(maxX, x));
        this.y = Math.max(minY, Math.min(maxY, y));
        
        // Additional camera-based boundary enforcement to ensure player stays in visible area
        if (this.game && this.game.camera) {
            const viewportWidth = GAME_CONFIG.viewport.getWidth();
            const viewportHeight = GAME_CONFIG.viewport.getHeight();
            const padding = 50; // Minimum distance from screen edge
            
            const minVisibleX = this.game.camera.x + padding;
            const maxVisibleX = this.game.camera.x + viewportWidth - padding;
            const minVisibleY = this.game.camera.y + padding;
            const maxVisibleY = this.game.camera.y + viewportHeight - padding;
            
            this.x = Math.max(minVisibleX, Math.min(maxVisibleX, this.x));
            this.y = Math.max(minVisibleY, Math.min(maxVisibleY, this.y));
        }
    }

    // New smooth movement system
    updateVelocity(inputX, inputY, deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        this.maxVelocity = this.getEffectiveSpeed();
        
        // Calculate target velocity based on input
        const targetVelX = inputX * this.maxVelocity;
        const targetVelY = inputY * this.maxVelocity;
        
        // Apply acceleration towards target velocity
        if (inputX !== 0) {
            // Player is actively moving horizontally
            const velDiffX = targetVelX - this.velocityX;
            const accelX = Math.sign(velDiffX) * this.acceleration * deltaSeconds;
            
            if (Math.abs(accelX) >= Math.abs(velDiffX)) {
                this.velocityX = targetVelX;
            } else {
                this.velocityX += accelX;
            }
        } else {
            // No horizontal input - apply deceleration
            if (Math.abs(this.velocityX) > 0.1) {
                const decelX = Math.sign(this.velocityX) * this.deceleration * deltaSeconds;
                if (Math.abs(decelX) >= Math.abs(this.velocityX)) {
                    this.velocityX = 0;
                } else {
                    this.velocityX -= decelX;
                }
            } else {
                this.velocityX = 0;
            }
        }
        
        if (inputY !== 0) {
            // Player is actively moving vertically
            const velDiffY = targetVelY - this.velocityY;
            const accelY = Math.sign(velDiffY) * this.acceleration * deltaSeconds;
            
            if (Math.abs(accelY) >= Math.abs(velDiffY)) {
                this.velocityY = targetVelY;
            } else {
                this.velocityY += accelY;
            }
        } else {
            // No vertical input - apply deceleration
            if (Math.abs(this.velocityY) > 0.1) {
                const decelY = Math.sign(this.velocityY) * this.deceleration * deltaSeconds;
                if (Math.abs(decelY) >= Math.abs(this.velocityY)) {
                    this.velocityY = 0;
                } else {
                    this.velocityY -= decelY;
                }
            } else {
                this.velocityY = 0;
            }
        }
        
        // Check if tactical boost should expire
        if (this.tacticalBoostActive && Date.now() > this.tacticalBoostEndTime) {
            this.tacticalBoostActive = false;
        }
        
        // Cap velocity to max speed (unless tactical boost is active)
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (!this.tacticalBoostActive && currentSpeed > this.maxVelocity) {
            const scale = this.maxVelocity / currentSpeed;
            this.velocityX *= scale;
            this.velocityY *= scale;
        }
        
        // Calculate new position
        const newX = this.x + this.velocityX * deltaSeconds;
        const newY = this.y + this.velocityY * deltaSeconds;
        
        return { x: newX, y: newY };
    }

    // Handle collision by adjusting velocity
    handleCollision(newX, newY, originalX, originalY) {
        // If we hit a wall, we need to adjust our velocity accordingly
        const hitWallX = newX !== originalX && newX === this.x;
        const hitWallY = newY !== originalY && newY === this.y;
        
        if (hitWallX) {
            this.velocityX = 0;
        }
        if (hitWallY) {
            this.velocityY = 0;
        }
    }

    getEffectiveSpeed() {
        return GAME_CONFIG.player.speed * this.currentSpeedMultiplier;
    }

    applyRecoil(angle, force) {
        // Apply recoil force in the opposite direction of the spell
        const recoilAngle = angle + Math.PI;
        const recoilX = Math.cos(recoilAngle) * force;
        const recoilY = Math.sin(recoilAngle) * force;
        
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
                
                // Activate tactical boost to prevent speed limiting briefly
                this.tacticalBoostActive = true;
                this.tacticalBoostEndTime = Date.now() + 500; // 0.5 second boost duration
                
                console.log(`Tactical speed boost activated! Speed: ${Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY).toFixed(1)}`);
                return; // Exit early, we've applied the boosted recoil
            }
        }
        
        // Normal recoil
        this.velocityX += recoilX;
        this.velocityY += recoilY;
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
            velocityX: this.velocityX,
            velocityY: this.velocityY,
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
        const viewportWidth = GAME_CONFIG.viewport.getWidth();
        const viewportHeight = GAME_CONFIG.viewport.getHeight();
        return this.x >= cameraX - GAME_CONFIG.world.viewportPadding &&
               this.x <= cameraX + viewportWidth + GAME_CONFIG.world.viewportPadding &&
               this.y >= cameraY - GAME_CONFIG.world.viewportPadding &&
               this.y <= cameraY + viewportHeight + GAME_CONFIG.world.viewportPadding;
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
    
    // Ring of Fire methods
    addRingOfFireCharge() {
        this.ringOfFireCharges++;
    }
    
    useRingOfFire() {
        if (this.ringOfFireCharges > 0 && this.mana >= 25) {
            this.ringOfFireCharges--;
            this.mana -= 25;
            return true;
        }
        return false;
    }
    
    hasRingOfFire() {
        return this.ringOfFireCharges > 0;
    }
}
