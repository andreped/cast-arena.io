const gameConfig = require('../../config/gameConfig');

class BurnSystem {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
        this.startBurnLoop();
    }

    startBurnLoop() {
        setInterval(() => this.processBurnEffects(), 100);
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
                this.handleBurnDeath(playerId);
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

    handleBurnDeath(playerId) {
        const player = this.gameState.getPlayer(playerId);
        this.clearBurnEffect(playerId);
        
        this.io.to(playerId).emit('playerDied');
        this.io.emit('playerDiedFromBurn', { id: playerId });
        this.io.emit('playerStateUpdate', {
            id: playerId,
            isAlive: false,
            health: 0
        });

        setTimeout(() => {
            if (player) {
                const respawnData = player.respawn();
                this.emitRespawnEvents(respawnData);
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
