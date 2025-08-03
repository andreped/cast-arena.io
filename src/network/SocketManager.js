const gameConfig = require('../config/gameConfig');

class SocketManager {
    constructor(io, gameState, burnSystem) {
        this.io = io;
        this.gameState = gameState;
        this.burnSystem = burnSystem;
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('A player connected:', socket.id);
            this.handlePlayerConnection(socket);

            socket.on('playerMovement', (data) => this.handlePlayerMovement(socket, data));
            socket.on('castSpell', (data) => this.handleSpellCast(socket, data));
            socket.on('spellHit', (data) => this.handleSpellHit(socket, data));
            socket.on('disconnect', () => this.handleDisconnection(socket));
        });
    }

    handlePlayerConnection(socket) {
        const player = this.gameState.addPlayer(socket.id);
        
        socket.emit('currentPlayers', this.gameState.getCurrentState());
        socket.broadcast.emit('newPlayer', player.toJSON());
        
        const respawnData = player.respawn();
        this.emitRespawnEvents(respawnData);
        
        this.setupRespawnImmunity(socket.id);
    }

    handlePlayerMovement(socket, movementData) {
        const player = this.gameState.getPlayer(socket.id);
        
        if (!player || !player.isAlive || player.respawnImmunity) {
            return;
        }

        player.x = movementData.x;
        player.y = movementData.y;
        if (movementData.facingLeft !== undefined) {
            player.facingLeft = movementData.facingLeft;
        }

        socket.broadcast.emit('playerMoved', {
            id: socket.id,
            x: movementData.x,
            y: movementData.y,
            facingLeft: player.facingLeft,
            isAlive: player.isAlive
        });
    }

    handleSpellCast(socket, spellData) {
        const player = this.gameState.getPlayer(socket.id);
        
        if (!player || !player.isAlive) return;

        const spell = this.gameState.castSpell(
            socket.id,
            spellData.x,
            spellData.y,
            spellData.targetX,
            spellData.targetY,
            spellData.angle
        );

        this.io.emit('spellCast', spell.toJSON());
    }

    handleSpellHit(socket, hitData) {
        const { spellId, targetId } = hitData;
        const spell = this.gameState.spells.get(spellId);
        const target = this.gameState.getPlayer(targetId);
        const caster = this.gameState.getPlayer(spell?.casterId);

        if (!this.validateSpellHit(spell, target, caster, targetId)) return;

        if (target.takeDamage(spell.damage)) {
            this.gameState.applyBurnEffect(targetId);
            this.gameState.removeSpell(spellId);

            if (!target.isAlive) {
                this.handlePlayerDeath(target, caster);
            }

            this.emitHealthUpdate(target);
        }
    }

    handleDisconnection(socket) {
        console.log('Player disconnected:', socket.id);
        this.gameState.removePlayer(socket.id);
        this.io.emit('playerDisconnected', socket.id);
    }

    validateSpellHit(spell, target, caster, targetId) {
        return (
            spell && 
            target && 
            caster && 
            targetId !== spell.casterId &&
            !target.spawnProtection &&
            target.isAlive
        );
    }

    handlePlayerDeath(target, caster) {
        caster.kills++;
        
        this.io.to(target.id).emit('playerDied');
        this.io.emit('playerStateUpdate', {
            id: target.id,
            isAlive: false,
            health: 0
        });
        
        this.io.emit('playerKilled', {
            killerId: caster.id,
            victimId: target.id,
            killerKills: caster.kills
        });

        setTimeout(() => {
            const respawnData = target.respawn();
            this.emitRespawnEvents(respawnData);
        }, gameConfig.player.respawnDelay);
    }

    emitRespawnEvents(respawnData) {
        // Update all clients about the player state
        this.io.emit('playerStateUpdate', {
            ...respawnData,
            isAlive: true
        });
        
        // Notify the respawning player
        this.io.to(respawnData.id).emit('playerRespawned', {
            ...respawnData,
            isLocalPlayer: true
        });
        
        // Notify all clients about the respawn, they'll handle isLocalPlayer=false by default
        this.io.emit('playerRespawned', {
            ...respawnData,
            isLocalPlayer: false
        });
        
        // Force sync the player state to ensure consistency
        this.io.emit('forceSyncPlayer', {
            ...respawnData,
            isBurning: false,
            burnEndTime: 0
        });

        this.setupRespawnImmunity(respawnData.id);
    }

    setupRespawnImmunity(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) return;

        setTimeout(() => {
            if (player) {
                player.respawnImmunity = false;
            }
        }, 1000);

        setTimeout(() => {
            if (player) {
                player.spawnProtection = false;
                this.io.emit('spawnProtectionEnded', { id: playerId });
            }
        }, gameConfig.player.spawnProtectionDuration);
    }

    emitHealthUpdate(player) {
        this.io.emit('healthUpdate', {
            id: player.id,
            health: player.health,
            isBurning: player.isBurning,
            burnEndTime: player.burnEndTime
        });
    }
}

module.exports = SocketManager;
