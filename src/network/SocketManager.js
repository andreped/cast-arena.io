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
            socket.on('playerAiming', (data) => this.handlePlayerAiming(socket, data));
            socket.on('castSpell', (data) => this.handleSpellCast(socket, data));
            socket.on('spellHit', (data) => this.handleSpellHit(socket, data));
            socket.on('disconnect', () => this.handleDisconnection(socket));
        });
    }

    handlePlayerConnection(socket) {
        const player = this.gameState.addPlayer(socket.id);
        
        socket.emit('currentPlayers', this.gameState.getCurrentState());
        socket.emit('wallData', this.gameState.getWallState());
        socket.emit('itemsUpdate', this.gameState.getItemsState());
        socket.broadcast.emit('newPlayer', player.toJSON());
        
        // Use safe spawn position
        const safePosition = this.gameState.getSafeSpawnPosition();
        const respawnData = player.respawn(safePosition);
        this.emitRespawnEvents(respawnData);
        
        this.setupRespawnImmunity(socket.id);
    }

    handlePlayerMovement(socket, movementData) {
        const player = this.gameState.getPlayer(socket.id);
        
        if (!player || !player.isAlive || player.respawnImmunity) {
            return;
        }

        // Check wall collision before allowing movement
        const playerRadius = 20; // Player collision radius
        const wallCollision = this.gameState.checkWallCollision(movementData.x, movementData.y, playerRadius);
        
        if (!wallCollision) {
            player.x = movementData.x;
            player.y = movementData.y;
            if (movementData.facingLeft !== undefined) {
                player.facingLeft = movementData.facingLeft;
            }
            if (movementData.aimingAngle !== undefined) {
                player.aimingAngle = movementData.aimingAngle;
            }

            // Check for item pickups at new position
            this.checkItemPickupsForPlayer(socket.id, player);

            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: movementData.x,
                y: movementData.y,
                facingLeft: player.facingLeft,
                aimingAngle: player.aimingAngle,
                isAlive: player.isAlive
            });
        }
    }

    handlePlayerAiming(socket, aimingData) {
        const player = this.gameState.getPlayer(socket.id);
        
        if (!player || !player.isAlive) {
            return;
        }

        // Update only the aiming angle, not position
        if (aimingData.aimingAngle !== undefined) {
            player.aimingAngle = aimingData.aimingAngle;
        }

        // Broadcast only the aiming update to other players
        socket.broadcast.emit('playerAimed', {
            id: socket.id,
            aimingAngle: player.aimingAngle
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
        const { spellId, targetId, position } = hitData;
        const spell = this.gameState.spells.get(spellId);
        const target = this.gameState.getPlayer(targetId);
        const caster = this.gameState.getPlayer(spell?.casterId);

        // CRITICAL: Server-side wall collision validation
        // Check if there's a wall between the spell position and the target
        if (spell && target && position) {
            const wallBetween = this.gameState.checkWallLineCollision(
                spell.x, spell.y, 
                target.x, target.y
            );
            
            if (wallBetween) {
                console.log('Server detected wall between spell and target - rejecting hit');
                // Remove spell but don't apply damage
                this.gameState.removeSpell(spellId);
                // Emit explosion at wall instead
                this.io.emit('spellExplosion', {
                    x: spell.x,
                    y: spell.y,
                    type: 'wall'
                });
                return;
            }
        }

        // Always emit explosion at hit position, even if validation fails
        if (position && target) {
            this.io.emit('spellExplosion', {
                x: target.x,
                y: target.y,
                type: 'hit'
            });
        }

        if (!this.validateSpellHit(spell, target, caster, targetId)) {
            // Still remove spell even if validation fails
            if (spell) {
                this.gameState.removeSpell(spellId);
            }
            return;
        }

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
            const safePosition = this.gameState.getSafeSpawnPosition();
            const respawnData = target.respawn(safePosition);
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

    checkItemPickupsForPlayer(playerId, player) {
        // Check if this specific player picked up any items at their current position
        for (const [itemId, item] of this.gameState.itemSystem.items) {
            if (item.isCollidingWithPlayer(player.x, player.y)) {
                const pickup = this.gameState.itemSystem.pickupItem(playerId, itemId);
                if (pickup) {
                    console.log(`Instant pickup: Player ${playerId} picked up ${pickup.itemType} item`);
                    // The game loop will send updates, but we could also send immediate update here
                    break; // Player can only pick up one item per movement
                }
            }
        }
    }
}

module.exports = SocketManager;
