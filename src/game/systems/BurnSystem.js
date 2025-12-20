const gameConfig = require('../../config/gameConfig');

class BurnSystem {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
        this.burnInterval = null;
        this.startBurnLoop();
    }

    startBurnLoop() {
        // Clear any existing interval to prevent duplicates
        if (this.burnInterval) {
            clearInterval(this.burnInterval);
        }
        this.burnInterval = setInterval(() => this.processBurnEffects(), 100);
    }

    // Add cleanup method
    destroy() {
        if (this.burnInterval) {
            clearInterval(this.burnInterval);
            this.burnInterval = null;
        }
    }

    processBurnEffects() {
        const now = Date.now();
        
        for (const [playerId, burnEffect] of this.gameState.burnEffects) {
            const player = this.gameState.getPlayer(playerId);
            
            if (!player || !player.isAlive) {
                this.clearBurnEffect(playerId);
                continue;
            }

            if (now >= burnEffect.endTime) {
                this.clearBurnEffect(playerId);
            } else if (now - burnEffect.lastTick >= gameConfig.burnEffect.tickInterval) {
                this.applyBurnDamage(player, playerId, burnEffect, now);
            }
        }
    }

    applyBurnDamage(player, playerId, burnEffect, now) {
        if (player.takeDamage(gameConfig.burnEffect.tickDamage)) {
            burnEffect.lastTick = now;

            if (!player.isAlive) {
                this.handleBurnDeath(playerId, player);
            } else {
                this.emitHealthUpdate(player);
            }
        }
    }

    clearBurnEffect(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (player) {
            player.isBurning = false;
        }
        this.gameState.burnEffects.delete(playerId);
        this.io.emit('burnEnded', { id: playerId });
    }

    handleBurnDeath(playerId, player) {
        this.clearBurnEffect(playerId);
        
        this.io.to(playerId).emit('playerDied');
        this.io.emit('playerStateUpdate', {
            id: playerId,
            isAlive: false,
            health: 0
        });
        this.io.emit('playerDiedFromBurn', { id: playerId });
        
        // Check if there was a recent attacker to credit the kill
        const killData = player.handleKillReward();
        
        if (killData && killData.shouldReward) {
            // Use the same kill handling as other damage sources
            const killer = this.gameState.getPlayer(killData.killerId);
            if (killer && killer.isAlive) {
                // Grant kill rewards
                killer.kills = (killer.kills || 0) + 1;
                
                const healthReward = 35;
                const manaReward = 15;
                
                const actualHealthGained = killer.restoreHealth(healthReward);
                const actualManaGained = killer.restoreMana(manaReward);
                
                // Send health and mana updates to the killer
                if (actualHealthGained > 0) {
                    this.io.emit('healthUpdate', {
                        id: killer.id,
                        health: killer.health,
                        maxHealth: killer.maxHealth
                    });
                }
                
                if (actualManaGained > 0) {
                    this.io.emit('manaUpdate', {
                        id: killer.id,
                        mana: killer.mana,
                        maxMana: killer.maxMana
                    });
                }
                
                // Broadcast kill event with rewards (AFTER death events to match player kills)
                this.io.emit('playerKilled', {
                    killerId: killer.id,
                    victimId: playerId,
                    killerKills: killer.kills,
                    healthGained: actualHealthGained,
                    manaGained: actualManaGained,
                    deathType: 'burn'
                });
            }
        }

        setTimeout(() => {
            if (player) {
                const safePosition = this.gameState.getSafeSpawnPosition();
                const respawnData = player.respawn(safePosition);
                
                // Emit respawn events (same as SocketManager.emitRespawnEvents)
                this.io.emit('playerStateUpdate', {
                    ...respawnData,
                    isAlive: true
                });
                
                this.io.to(respawnData.id).emit('playerRespawned', {
                    ...respawnData,
                    isLocalPlayer: true
                });
                
                this.io.emit('playerRespawned', {
                    ...respawnData,
                    isLocalPlayer: false
                });
                
                this.io.emit('forceSyncPlayer', {
                    ...respawnData,
                    isBurning: false,
                    burnEndTime: 0
                });
            }
        }, gameConfig.player.respawnDelay);
    }

    emitHealthUpdate(player) {
        this.io.emit('healthUpdate', {
            id: player.id,
            health: player.health,
            isBurning: player.isBurning,
            burnEndTime: player.burnEndTime
        });
    }

    emitRespawnEvents(respawnData) {
        this.io.emit('playerStateUpdate', {
            ...respawnData,
            isAlive: true
        });
        
        this.io.to(respawnData.id).emit('playerRespawned', {
            ...respawnData,
            isLocalPlayer: true
        });
        
        this.io.emit('forceSyncPlayer', {
            ...respawnData,
            isBurning: false,
            burnEndTime: 0
        });
    }
}

module.exports = BurnSystem;
