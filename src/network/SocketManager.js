const gameConfig = require('../config/gameConfig');

class SocketManager {
    constructor(io, gameState, burnSystem) {
        this.io = io;
        this.gameState = gameState;
        this.burnSystem = burnSystem;
        
        // Server performance monitoring
        this.tickCount = 0;
        this.lastTpsTime = Date.now();
        this.currentTps = 0;
        
        this.setupSocketHandlers();
        this.startTpsMonitoring();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('A player connected:', socket.id);
            this.handlePlayerConnection(socket);

            socket.on('playerMovement', (data) => this.handlePlayerMovement(socket, data));
            socket.on('playerAiming', (data) => this.handlePlayerAiming(socket, data));
            socket.on('castSpell', (data) => this.handleSpellCast(socket, data));
            socket.on('castRingOfFire', (data) => this.handleRingOfFireCast(socket, data));
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
        
        // Send initial mana state
        this.emitManaUpdate(player);
        
        this.setupRespawnImmunity(socket.id);
    }

    handlePlayerMovement(socket, movementData) {
        const player = this.gameState.getPlayer(socket.id);
        
        if (!player || !player.isAlive) {
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

            // Broadcast to other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: movementData.x,
                y: movementData.y,
                facingLeft: player.facingLeft,
                aimingAngle: player.aimingAngle,
                isAlive: player.isAlive
            });

            // Send reconciliation data back to the client with sequence number
            if (movementData.sequence) {
                socket.emit('playerMoved', {
                    id: socket.id,
                    x: player.x,
                    y: player.y,
                    sequence: movementData.sequence,
                    timestamp: Date.now()
                });
            }
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

        // Check if player has enough mana
        const gameConfig = require('../config/gameConfig');
        if (!player.consumeMana(gameConfig.spells.fireball.manaCost)) {
            // Not enough mana - send mana update to client
            this.emitManaUpdate(player);
            return;
        }

        const spell = this.gameState.castSpell(
            socket.id,
            spellData.x,
            spellData.y,
            spellData.targetX,
            spellData.targetY,
            spellData.angle
        );

        this.io.emit('spellCast', spell.toJSON());
        
        // Send mana update after spell cast
        this.emitManaUpdate(player);
    }

    handleRingOfFireCast(socket, ringOfFireData) {
        const player = this.gameState.getPlayer(socket.id);
        if (!player || !player.isAlive) return;

        // Check if player has Ring of Fire charges
        if (player.ringOfFireCharges <= 0) {
            console.log(`Player ${socket.id} tried to cast Ring of Fire without charges`);
            return;
        }

        // Check if player has enough mana
        if (player.mana < 25) {
            console.log(`Player ${socket.id} tried to cast Ring of Fire without enough mana`);
            return;
        }

        // Consume mana and charge
        player.mana -= 25;
        player.ringOfFireCharges--;

        console.log(`Player ${socket.id} cast Ring of Fire! Charges remaining: ${player.ringOfFireCharges}`);

        // Create Ring of Fire effect
        const ringOfFire = {
            id: `ringOfFire_${Date.now()}_${socket.id}`,
            x: ringOfFireData.x,
            y: ringOfFireData.y,
            casterId: socket.id,
            radius: 120, // Ring radius
            damage: 80, // 80% of max health
            createdAt: Date.now()
        };

        // Broadcast Ring of Fire cast to all players
        this.io.emit('ringOfFireCast', ringOfFire);

        // Check for damage to players within range
        this.processRingOfFireDamage(ringOfFire);

        // Send mana update after Ring of Fire cast
        this.emitManaUpdate(player);
    }

    processRingOfFireDamage(ringOfFire) {
        for (const [playerId, player] of this.gameState.players) {
            // Skip dead players only - Ring of Fire affects everyone including the caster
            if (!player.isAlive) continue;

            const dx = player.x - ringOfFire.x;
            const dy = player.y - ringOfFire.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if player is within Ring of Fire range
            if (distance <= ringOfFire.radius) {
                // Check if there's a wall between Ring of Fire center and player
                const wallBetween = this.gameState.checkWallLineCollision(
                    ringOfFire.x, ringOfFire.y,
                    player.x, player.y
                );

                if (!wallBetween) {
                    // Calculate damage (80% of current health)
                    const damage = Math.floor(player.health * 0.8);
                    const actualDamage = player.takeDamage(damage);

                    if (actualDamage) {
                        console.log(`Ring of Fire hit player ${playerId} for ${damage} damage`);
                        
                        // Send health update
                        this.io.emit('healthUpdate', {
                            playerId: playerId,
                            health: player.health,
                            maxHealth: player.maxHealth
                        });

                        // Check if player died
                        if (player.health <= 0) {
                            this.handlePlayerDeath(playerId, ringOfFire.casterId);
                        }
                    }
                }
            }
        }
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

    emitManaUpdate(player) {
        this.io.emit('manaUpdate', {
            id: player.id,
            mana: player.mana,
            maxMana: player.maxMana
        });
    }

    broadcastManaUpdates() {
        // Only send mana updates for players whose mana has changed significantly
        for (const [id, player] of this.gameState.players) {
            if (player.isAlive && player.hasManaChanged()) {
                this.emitManaUpdate(player);
                player.resetManaChangeFlag();
            }
        }
    }

    // Server performance monitoring
    startTpsMonitoring() {
        // Get target TPS from environment or default to 20
        this.targetTps = process.env.SERVER_TPS ? parseInt(process.env.SERVER_TPS) : 20;
        
        // Initialize timing properly
        this.lastTpsTime = Date.now();
        this.tickCount = 0;
        
        // Calculate TPS every second and broadcast to clients
        setInterval(() => {
            const now = Date.now();
            const timeDiff = now - this.lastTpsTime;
            
            // Only calculate if we have meaningful time difference
            if (timeDiff > 0) {
                this.currentTps = Math.round(this.tickCount * 1000 / timeDiff);
            } else {
                this.currentTps = 0;
            }
            
            // Broadcast TPS to all connected clients with target info
            this.io.emit('serverTps', { 
                tps: this.currentTps,
                target: this.targetTps
            });
            
            // Debug log for troubleshooting - both calculation and emission
            console.log(`📊 Server TPS: ${this.currentTps}/${this.targetTps} (${this.tickCount} ticks in ${timeDiff}ms)`);
            console.log(`📡 Broadcasting TPS to ${this.io.engine.clientsCount} clients: {tps: ${this.currentTps}, target: ${this.targetTps}}`);
            
            // Reset counters
            this.tickCount = 0;
            this.lastTpsTime = now;
            
            // Log performance issues with target comparison
            const tpsEfficiency = (this.currentTps / this.targetTps) * 100;
            if (this.currentTps < this.targetTps * 0.8) { // Less than 80% of target
                console.warn(`⚠️ Low server TPS: ${this.currentTps}/${this.targetTps} (${tpsEfficiency.toFixed(1)}%)`);
            } else if (this.currentTps > this.targetTps * 1.1) { // More than 110% of target
                console.log(`🚀 High server TPS: ${this.currentTps}/${this.targetTps} (${tpsEfficiency.toFixed(1)}%)`);
            }
        }, 1000);
    }

    // Call this method for each server tick/update
    registerTick() {
        this.tickCount++;
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
