import { GAME_CONFIG } from '../config/gameConfig.js';
import { Player } from '../entities/Player.js';
import { Spell } from '../entities/Spell.js';

export class NetworkSystem {
    constructor(game) {
        this.game = game;
        this.socket = io();
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            this.game.myId = this.socket.id;
            console.log('Connected to server with ID:', this.game.myId);
        });

        this.socket.on('currentPlayers', this.handleCurrentPlayers.bind(this));
        this.socket.on('wallData', this.handleWallData.bind(this));
        this.socket.on('newPlayer', this.handleNewPlayer.bind(this));
        this.socket.on('playerMoved', this.handlePlayerMoved.bind(this));
        this.socket.on('playerAimed', this.handlePlayerAimed.bind(this));
        this.socket.on('playerPositionUpdate', this.handlePlayerPositionUpdate.bind(this));
        this.socket.on('forceSyncPlayer', this.handleForceSyncPlayer.bind(this));
        this.socket.on('playerDisconnected', this.handlePlayerDisconnected.bind(this));
        this.socket.on('playerStateUpdate', this.handlePlayerStateUpdate.bind(this));
        this.socket.on('spellCast', this.handleSpellCast.bind(this));
        this.socket.on('healthUpdate', this.handleHealthUpdate.bind(this));
        this.socket.on('playerKilled', this.handlePlayerKilled.bind(this));
        this.socket.on('playerRespawned', this.handlePlayerRespawned.bind(this));
        this.socket.on('burnEnded', this.handleBurnEnded.bind(this));
        this.socket.on('playerDied', this.handlePlayerDied.bind(this));
        this.socket.on('spawnProtectionEnded', this.handleSpawnProtectionEnded.bind(this));
        this.socket.on('itemsUpdate', this.handleItemsUpdate.bind(this));
        this.socket.on('gameStateUpdate', this.handleGameStateUpdate.bind(this));
        this.socket.on('spellExplosion', this.handleSpellExplosion.bind(this));
        this.socket.on('ringOfFireCast', this.handleRingOfFireCast.bind(this));
        this.socket.on('manaUpdate', this.handleManaUpdate.bind(this));
        this.socket.on('serverTps', this.handleServerTps.bind(this));
        this.socket.on('playerRecoil', this.handlePlayerRecoil.bind(this));
        
        // Throttling for movement updates
        this.lastMovementUpdate = 0;
        this.movementUpdateInterval = 1000 / 30; // 30 updates per second max
    }

    // Add cleanup method
    destroy() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.game = null;
    }

    handleCurrentPlayers(serverPlayers) {
        Object.entries(serverPlayers).forEach(([id, data]) => {
            this.game.players.set(id, new Player(id, data));
        });
        this.game.ui.updatePlayerCount();
        this.game.ui.updateLeaderboard();  // Update leaderboard with initial players
    }

    handleWallData(wallData) {
        this.game.setWalls(wallData);
        console.log('Received wall data:', Object.keys(wallData).length, 'walls');
    }

    handleItemsUpdate(itemsData) {
        // Store old items before updating for pickup sound detection
        const oldItemsMap = new Map(this.game.items);
        
        this.game.setItems(itemsData);
        
        // Check for removed items (someone picked them up)
        for (const [oldItemId, oldItem] of oldItemsMap) {
            if (!itemsData[oldItemId]) {
                // Item was removed - play pickup sound if local player is close
                const player = this.game.players.get(this.game.myId);
                if (player && oldItem) {
                    const distance = Math.sqrt(
                        Math.pow(player.x - oldItem.x, 2) + 
                        Math.pow(player.y - oldItem.y, 2)
                    );
                    
                    // Only play sound if player is close (likely picked it up)
                    if (distance < 50 && this.game.audio) {
                        console.log(`Playing pickup sound for ${oldItem.type} item`);
                        if (oldItem.type === 'mana') {
                            this.game.audio.playSound('pickupMana');
                        } else if (oldItem.type === 'speed') {
                            this.game.audio.playSound('pickupSpeed');
                        } else if (oldItem.type === 'ringOfFire') {
                            this.game.audio.playSound('pickupRingOfFire');
                        }
                    }
                }
            }
        }
        
        console.log('Received items update:', Object.keys(itemsData).length, 'items');
    }

    handleNewPlayer(data) {
        this.game.players.set(data.id, new Player(data.id, data));
        this.game.ui.updatePlayerCount();
        this.game.ui.updateLeaderboard();  // Update when new player joins
    }

    handlePlayerMoved(data) {
        // Handle server reconciliation for local player
        if (data.id === this.game.myId) {
            this.game.input.handleServerReconciliation(data);
            return;
        }
        
        const player = this.game.players.get(data.id);
        if (player) {
            // DISABLE SMOOTHING FOR BOTS to see raw server positions
            if (player.isBot) {
                // NO smoothing - direct snap to server position
                player.x = data.x;
                player.y = data.y;
            } else {
                // Smoothly interpolate to new position instead of snapping
                // This prevents visual glitches when server updates are less frequent than render rate
                player.x = data.x;
                player.y = data.y;
            }
            
            // Update velocity for client-side prediction between server updates
            if (data.velocityX !== undefined) {
                player.velocityX = data.velocityX;
            }
            if (data.velocityY !== undefined) {
                player.velocityY = data.velocityY;
            }
            
            if (data.facingLeft !== undefined) {
                player.facingLeft = data.facingLeft;
            }
            if (data.aimingAngle !== undefined) {
                player.aimingAngle = data.aimingAngle;
            }
            if (data.isAlive !== undefined) {
                player.isAlive = data.isAlive;
            }
        }
    }

    handlePlayerAimed(data) {
        const player = this.game.players.get(data.id);
        if (player && data.id !== this.game.myId) {
            if (data.aimingAngle !== undefined) {
                player.aimingAngle = data.aimingAngle;
            }
        }
    }

    handlePlayerPositionUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player && data.id !== this.game.myId) {
            player.x = data.x;
            player.y = data.y;
        }
    }

    handleForceSyncPlayer(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.update(data);
        }
    }

    handlePlayerDisconnected(id) {
        this.game.players.delete(id);
        this.game.ui.updatePlayerCount();
        this.game.ui.updateLeaderboard();  // Update leaderboard when player leaves
    }

    handlePlayerStateUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.update(data);
            if (!player.isAlive && data.isAlive === true) {
                player.isBurning = false;
                player.burnEndTime = 0;
            }
        }
    }

    handleSpellCast(data) {
        this.game.spells.set(data.id, new Spell(data));
        
        // Trigger casting animation for the player who cast the spell
        if (data.playerId && data.playerId !== this.game.myId) {
            this.game.renderer.spriteSystem.createCastAnimation(data.playerId);
        }
    }

    handleHealthUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.health = data.health;
            player.isBurning = data.isBurning;
            player.burnEndTime = data.burnEndTime;
        }
    }

    handleManaUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            const oldMana = player.mana;
            player.mana = data.mana;
            player.maxMana = data.maxMana;
            
            // If this is our player and mana increased significantly, it's likely from a pickup
            if (data.id === this.game.myId && data.mana > oldMana) {
                const manaGained = data.mana - oldMana;
                // Only track significant mana gains (5+ mana) to avoid showing regen
                if (manaGained >= 5) {
                    player.addRecentManaPickup(manaGained);
                }
            }
        }
    }

    handlePlayerKilled(data) {
        const killer = this.game.players.get(data.killerId);
        const victim = this.game.players.get(data.victimId);
        
        if (killer) {
            killer.kills = data.killerKills;
            this.game.ui.updateLeaderboard();  // Update leaderboard when kills change
            
            // Play kill sound if local player got a kill
            if (data.killerId === this.game.myId && this.game.audio) {
                this.game.audio.playSound('killSound');
            }
        }
        
        // Add kill feed entry with proper names (use player.name for bots)
        const killerName = data.killerId === this.game.myId ? 'You' : 
                          killer ? (killer.name || `Player ${data.killerId.slice(0, 4)}`) : 'Unknown';
        const victimName = data.victimId === this.game.myId ? 'You' : 
                          victim ? (victim.name || `Player ${data.victimId.slice(0, 4)}`) : 'Unknown';
        
        this.game.ui.addKillFeedEntry(killerName, victimName, '🔥');
    }

    handlePlayerRespawned(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.update({
                ...data, // Use all server data
                isBurning: false,
                burnEndTime: 0,
                isAlive: true,
                spawnProtection: true,
                isRespawning: true
            });

            if (data.id === this.game.myId) {
                // Play respawn sound for local player
                if (this.game.audio) {
                    this.game.audio.playSound('playerRespawn');
                }
                this.game.handleLocalPlayerRespawn();
            }
        }
    }

    handleBurnEnded(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.isBurning = false;
        }
    }

    handlePlayerDied() {
        // Play death sound
        if (this.game.audio) {
            this.game.audio.playSound('playerDeath');
        }
        this.game.handleLocalPlayerDeath();
    }

    handleSpawnProtectionEnded(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.spawnProtection = false;
        }
    }

    handleGameStateUpdate(gameState) {
        // Update all players with current server state (including speed buffs)
        Object.entries(gameState).forEach(([id, data]) => {
            const player = this.game.players.get(id);
            if (player) {
                // For local player: don't overwrite position (client-side prediction is authoritative)
                // Only update non-position properties like health, mana, speed buffs
                if (id === this.game.myId) {
                    const { x, y, velocityX, velocityY, ...nonPositionData } = data;
                    player.update(nonPositionData);
                } else {
                    // For other players: full update (they're server-authoritative)
                    player.update(data);
                }
            }
        });
    }

    handleSpellExplosion(data) {
        // Add explosion effect at the specified position
        console.log('Received explosion event:', data); // Debug log
        this.game.addExplosion(data.x, data.y, data.type);
        
        // Play explosion sound
        if (this.game.audio) {
            this.game.audio.playSound(data.type === 'wall' ? 'spellHit' : 'spellExplode');
        }
    }

    sendMovement(movementData) {
        const now = performance.now();
        // Increased throttling rate to 60 FPS for more responsive movement
        if (now - this.lastMovementUpdate >= 16.67) { // ~60 FPS
            this.socket.emit('playerMovement', movementData);
            this.lastMovementUpdate = now;
        }
    }

    sendAimingUpdate(aimingData) {
        this.socket.emit('playerAiming', aimingData);
    }

    castSpell(spellData) {
        this.socket.emit('castSpell', spellData);
    }

    castRingOfFire(ringOfFireData) {
        this.socket.emit('castRingOfFire', ringOfFireData);
    }

    handleServerTps(data) {
        // Forward server TPS to input system for display
        if (this.game.input && typeof this.game.input.updateServerTps === 'function') {
            this.game.input.updateServerTps(data.tps);
            // Update target TPS if provided
            if (data.target !== undefined) {
                this.game.input.targetTps = data.target;
            }
        }
        
        // Direct DOM update to ensure TPS display works immediately
        const serverTpsEl = document.getElementById('serverTps');
        if (serverTpsEl && data.tps !== undefined && data.target !== undefined) {
            const tpsColor = data.tps >= data.target * 0.9 ? '#00ff00' : 
                           data.tps >= data.target * 0.7 ? '#ffaa00' : '#ff0000';
            const tpsEfficiency = ((data.tps / data.target) * 100).toFixed(0);
            serverTpsEl.innerHTML = `Server: <span style="color: ${tpsColor};">${data.tps} TPS</span>`;
        }
    }

    handleRingOfFireCast(data) {
        console.log('Ring of Fire cast received:', data);
        
        // Create visual Ring of Fire effect
        this.game.renderer.spriteSystem.createRingOfFireEffect(data);
        
        // Play Ring of Fire sound effect (if we had one)
        // this.game.audio.playRingOfFireSound();
    }

    handlePlayerRecoil(data) {
        const player = this.game.players.get(data.id);
        if (player && data.id !== this.game.myId) {
            // Apply recoil velocity from server to other players
            player.velocityX = data.velocityX;
            player.velocityY = data.velocityY;
        }
    }
}
