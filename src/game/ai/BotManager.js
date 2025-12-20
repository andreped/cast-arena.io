const Player = require('../entities/Player');
const BotController = require('./BotController');
const Pathfinding = require('./Pathfinding');
const gameConfig = require('../../config/gameConfig');

class BotManager {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io; // Socket.IO instance for broadcasting
        this.bots = new Map(); // bot id -> { player, controller }
        this.config = gameConfig.bots;
        
        // Shared pathfinding system for all bots
        this.pathfinding = new Pathfinding(gameState);
        
        // High-frequency bot updates (60 FPS like human players)
        this.lastUpdateTime = Date.now();
        this.lastBroadcastTime = new Map(); // Track last broadcast time per bot
        this.botUpdateInterval = null;
        
        if (this.config.enabled) {
            this.spawnInitialBots();
            this.startBotUpdates();
        }
    }
    
    startBotUpdates() {
        // Run bot updates at 60 FPS (same as human players)
        // Add delay to ensure game systems are fully initialized
        setTimeout(() => {
            this.botUpdateInterval = setInterval(() => {
                const deltaTime = 16.67; // Fixed 60 FPS - prevent huge deltaTime values
                this.updateBots(deltaTime);
            }, 16.67); // ~60 FPS
        }, 500); // Increased delay to 500ms
    }
    
    destroy() {
        if (this.botUpdateInterval) {
            clearInterval(this.botUpdateInterval);
            this.botUpdateInterval = null;
        }
    }

    spawnInitialBots() {
        for (let i = 0; i < this.config.count; i++) {
            this.spawnBot(i);
        }
    }

    spawnBot(index, replaceBot = false) {
        const botId = `bot-${index}`;
        
        // Check if bot already exists (respawning)
        let bot;
        let isNewBot = false;
        if (this.bots.has(botId) && !replaceBot) {
            bot = this.bots.get(botId).player;
            // Respawn existing bot
            const spawnPos = this.gameState.findSafeSpawnPosition();
            bot.respawn(spawnPos);
        } else {
            // Create new bot (or replace existing one)
            bot = new Player(botId);
            bot.isBot = true;
            
            // Pick a random name that's not currently in use
            const usedNames = new Set(Array.from(this.bots.values()).map(b => b.player.name));
            const availableNames = this.config.names.filter(name => !usedNames.has(name));
            if (availableNames.length > 0) {
                bot.name = availableNames[Math.floor(Math.random() * availableNames.length)];
            } else {
                // All names used, just pick a random one
                bot.name = this.config.names[Math.floor(Math.random() * this.config.names.length)];
            }
            
            // Spawn at safe position
            const spawnPos = this.gameState.findSafeSpawnPosition();
            bot.respawn(spawnPos);
            
            // Add to game
            this.gameState.players.set(botId, bot);
            
            // Create AI controller
            const controller = new BotController(bot, this.gameState, this.pathfinding);
            this.bots.set(botId, { player: bot, controller });
            
            console.log(`🤖 Created bot: ${bot.name} (${botId}) with ${bot.mana} mana`);
            isNewBot = true;
        }
        
        // Broadcast bot to all clients (for new bots and respawns)
        if (this.io) {
            this.io.emit('newPlayer', bot.toJSON());
        }
    }

    // Backward compatibility - GameState might still call this
    update(deltaTime) {
        // Do nothing - bots now have their own high-frequency update loop
        // This prevents double updates
    }
    
    updateBots(deltaTime) {
        if (!this.config.enabled) return;
        
        for (const [botId, botData] of this.bots) {
            const { player: bot, controller } = botData;
            
            // IMPORTANT: Completely stop dead bots from moving
            if (!bot.isAlive) {
                bot.velocityX = 0;
                bot.velocityY = 0;
                
                // Send one final position update to stop client-side prediction
                const now = Date.now();
                const lastBroadcast = this.lastBroadcastTime.get(bot.id) || 0;
                if (this.io && (now - lastBroadcast >= 16.67)) {
                    this.io.emit('playerMoved', {
                        id: bot.id,
                        x: bot.x,
                        y: bot.y,
                        velocityX: 0,
                        velocityY: 0,
                        facingLeft: bot.facingLeft,
                        aimingAngle: bot.aimingAngle,
                        isAlive: false
                    });
                    this.lastBroadcastTime.set(bot.id, now);
                }
                
                // Check if bot needs to respawn
                if (!bot.isRespawning) {
                    // Mark as respawning and schedule respawn
                    bot.isRespawning = true;
                    setTimeout(() => {
                        bot.isRespawning = false;
                        const botIndex = parseInt(botId.split('-')[1]);
                        
                        // 50% chance to replace with a new bot (different name)
                        const shouldReplace = Math.random() < 0.5;
                        if (shouldReplace) {
                            // Remove old bot and create new one
                            this.gameState.players.delete(botId);
                            this.bots.delete(botId);
                            console.log(`🔄 Replacing bot ${bot.name} with new bot`);
                            this.spawnBot(botIndex, true);
                        } else {
                            // Respawn same bot
                            this.spawnBot(botIndex, false);
                        }
                    }, gameConfig.player.respawnDelay);
                }
                continue;
            }
            
            // Update AI
            controller.update(deltaTime);
            
            // Apply AI actions with high-frequency physics
            this.applyBotActions(bot, controller, deltaTime);
        }
    }

    applyBotActions(bot, controller, deltaTime) {
        const actions = controller.getPendingActions();
        
        // NUCLEAR OPTION: Force bots to stay out of walls no matter what
        if (actions.input) {
            // Store original position
            const originalX = bot.x;
            const originalY = bot.y;
            
            // Let bot calculate its desired movement normally
            const { x: inputX, y: inputY } = actions.input;
            bot.updateVelocity(inputX, inputY, deltaTime);
            
            const deltaSeconds = deltaTime / 1000;
            const newX = bot.x + bot.velocityX * deltaSeconds;
            const newY = bot.y + bot.velocityY * deltaSeconds;
            
            // ABSOLUTE WALL REJECTION: If the new position is in a wall, DON'T MOVE AT ALL
            const radius = 20;
            
            const wouldBeInWall = this.gameState.checkWallCollision(newX, newY, radius);
            
            if (wouldBeInWall) {
                // Don't move, reset velocity
                bot.velocityX = 0;
                bot.velocityY = 0;
                // Explicitly DON'T update position - bot stays at originalX, originalY
            } else {
                // Movement is safe
                bot.x = Math.max(radius, Math.min(gameConfig.world.width - radius, newX));
                bot.y = Math.max(radius, Math.min(gameConfig.world.height - radius, newY));
            }
            
            // ADDITIONAL SAFETY: Check if bot is somehow already in a wall and teleport out
            const currentlyInWall = this.gameState.checkWallCollision(bot.x, bot.y, radius);
            if (currentlyInWall) {
                console.log(`🚨 EMERGENCY: Bot ${bot.name} found inside wall ${currentlyInWall.id}! Position: (${bot.x.toFixed(1)}, ${bot.y.toFixed(1)})`);
                
                // Find nearest safe position by moving away from wall center
                const safePos = this.findNearestSafePosition(bot.x, bot.y, radius);
                bot.x = safePos.x;
                bot.y = safePos.y;
                bot.velocityX = 0;
                bot.velocityY = 0;
                
                console.log(`🏥 Bot ${bot.name} emergency teleport to (${bot.x.toFixed(1)}, ${bot.y.toFixed(1)})`);
            }
            
            // PARANOID SAFETY: After everything, check AGAIN if bot ended up in a wall
            const finalWallCheck = this.gameState.checkWallCollision(bot.x, bot.y, radius);
            if (finalWallCheck) {
                console.log(`🚨🚨 IMPOSSIBLE: Bot ${bot.name} STILL in wall ${finalWallCheck.id} after all safety checks! Position: (${bot.x.toFixed(1)}, ${bot.y.toFixed(1)})`);
                // Force teleport to world center as last resort
                bot.x = gameConfig.world.width / 2;
                bot.y = gameConfig.world.height / 2;
                bot.velocityX = 0;
                bot.velocityY = 0;
                console.log(`💀 Bot ${bot.name} FORCE TELEPORTED to world center`);
            }
            
            // Broadcast position
            if (Math.abs(bot.x - originalX) > 0.1 || Math.abs(bot.y - originalY) > 0.1) {
                const now = Date.now();
                const lastBroadcast = this.lastBroadcastTime.get(bot.id) || 0;
                if (this.io && (now - lastBroadcast >= 16.67)) {
                    this.io.emit('playerMoved', {
                        id: bot.id,
                        x: bot.x,
                        y: bot.y,
                        velocityX: bot.velocityX,
                        velocityY: bot.velocityY,
                        facingLeft: bot.facingLeft,
                        aimingAngle: bot.aimingAngle,
                        isAlive: bot.isAlive
                    });
                    this.lastBroadcastTime.set(bot.id, now);
                }
            }
        }
        
        // Apply shooting
        if (actions.shoot !== null && actions.shoot !== undefined) {
            const angle = actions.shoot;
            
            // Use existing spell system
            if (bot.consumeMana(gameConfig.spells.fireball.manaCost)) {
                // Create spell through game state (this adds it to server-side spell list)
                const spellData = {
                    playerId: bot.id,
                    x: bot.x,
                    y: bot.y,
                    angle: angle,
                    type: 'fireball'
                };
                
                const spell = this.gameState.createSpell(spellData);
                
                // Apply recoil
                bot.applyRecoil(angle, gameConfig.spells.fireball.recoilForce);
                
                // Broadcast spell cast to all clients using the actual spell data
                if (this.io && spell) {
                    this.io.emit('spellCast', spell.toJSON());
                }
            }
        }
        
        // Apply Ring of Fire usage
        if (actions.ringOfFire) {
            if (bot.ringOfFireCharges > 0 && bot.mana >= 25) {
                // Use Ring of Fire through the existing game system
                const success = bot.useRingOfFire();
                if (success && this.io) {
                    // Create Ring of Fire effect data
                    const ringOfFire = {
                        id: `ringOfFire_${Date.now()}_${bot.id}`,
                        x: actions.ringOfFire.x,
                        y: actions.ringOfFire.y,
                        playerId: bot.id,
                        casterId: bot.id,
                        radius: 240, // Same as players - doubled from 120 to 240
                        damage: 80, // Same as players - Fixed 80 HP damage
                        createdAt: Date.now()
                    };
                    
                    // Broadcast Ring of Fire cast to all players
                    this.io.emit('ringOfFireCast', ringOfFire);
                    
                    // Start Ring of Fire expansion effect
                    this.startRingOfFireExpansion(ringOfFire);
                }
            }
        }
    }

    // Check if there's a clear path between two points using line collision
    isPathClear(fromX, fromY, toX, toY, radius) {
        // Use the existing line collision detection from WallSystem
        const lineCollision = this.gameState.checkWallLineCollision(fromX, fromY, toX, toY);
        if (lineCollision) {
            console.log(`📏 Line collision detected: path from (${fromX.toFixed(1)}, ${fromY.toFixed(1)}) to (${toX.toFixed(1)}, ${toY.toFixed(1)}) hits ${lineCollision.id}`);
            return false;
        }
        
        // Also check destination point collision
        const destCollision = this.gameState.checkWallCollision(toX, toY, radius);
        if (destCollision) {
            console.log(`🎯 Destination collision: (${toX.toFixed(1)}, ${toY.toFixed(1)}) hits ${destCollision.id}`);
            return false;
        }
        
        return true;
    }

    // Find the maximum safe distance along the movement path
    findSafeMovement(fromX, fromY, toX, toY, radius) {
        const deltaX = toX - fromX;
        const deltaY = toY - fromY;
        
        // Try 10 different distances along the path (90%, 80%, 70%, etc.)
        for (let factor = 0.9; factor > 0; factor -= 0.1) {
            const testX = fromX + deltaX * factor;
            const testY = fromY + deltaY * factor;
            
            if (this.isPathClear(fromX, fromY, testX, testY, radius)) {
                return { x: testX, y: testY };
            }
        }
        
        // No safe movement found
        return { x: fromX, y: fromY };
    }

    // Emergency function to teleport bots out of walls
    findNearestSafePosition(x, y, radius) {
        // Try positions in expanding circles around current position
        for (let distance = radius + 5; distance <= 100; distance += 10) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = x + Math.cos(angle) * distance;
                const testY = y + Math.sin(angle) * distance;
                
                // Check bounds
                if (testX >= radius && testX <= gameConfig.world.width - radius &&
                    testY >= radius && testY <= gameConfig.world.height - radius) {
                    
                    // Check if position is safe
                    if (!this.gameState.checkWallCollision(testX, testY, radius)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }
        
        // Fallback to center of map
        return { 
            x: gameConfig.world.width / 2, 
            y: gameConfig.world.height / 2 
        };
    }

    getBotCount() {
        return this.bots.size;
    }

    getAllBots() {
        return Array.from(this.bots.values()).map(b => b.player);
    }

    // Ring of Fire expansion logic (for bot usage)
    startRingOfFireExpansion(ringOfFire) {
        const expandDuration = 800; // Ring expands for 800ms
        const startTime = Date.now();
        const damageInterval = 50; // Check for damage every 50ms
        const playersHit = new Set(); // Track which players have already been hit
        
        const expansionInterval = setInterval(() => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            
            // Calculate current radius of the expanding ring
            const progress = Math.min(elapsed / expandDuration, 1);
            const currentRadius = ringOfFire.radius * progress;
            
            // Check all players for damage (including other bots)
            for (const [playerId, player] of this.gameState.players) {
                // Skip if already hit, caster, or dead
                if (playersHit.has(playerId) || playerId === ringOfFire.playerId || !player.isAlive) {
                    continue;
                }
                
                const dx = player.x - ringOfFire.x;
                const dy = player.y - ringOfFire.y;
                const playerDistance = Math.sqrt(dx * dx + dy * dy);
                
                // If the expanding ring has reached this player's position
                if (playerDistance <= currentRadius) {
                    // Check if player is protected by walls
                    const isProtected = this.gameState.checkWallLineCollision(ringOfFire.x, ringOfFire.y, player.x, player.y);
                    
                    if (isProtected) {
                        continue; // Player is protected by walls
                    }
                    
                    // Apply damage
                    const damage = 80;
                    const actualDamage = player.takeDamage(damage, ringOfFire.playerId);
                    
                    if (actualDamage) {
                        playersHit.add(playerId); // Mark as hit to prevent multiple hits
                        
                        // Send health update
                        if (this.io) {
                            this.io.emit('healthUpdate', {
                                id: playerId,
                                health: player.health,
                                maxHealth: player.maxHealth
                            });
                        }
                        
                        // Check if player died
                        if (player.health <= 0) {
                            this.handlePlayerDeathFromDamage(player);
                        }
                    }
                }
            }
            
            // Stop checking when expansion is complete
            if (progress >= 1) {
                clearInterval(expansionInterval);
            }
        }, damageInterval);
    }
    
    // Centralized kill handling for bot actions
    handlePlayerDeathFromDamage(victim) {
        const killData = victim.lastKillData;
        
        if (this.io) {
            this.io.to(victim.id).emit('playerDied');
            this.io.emit('playerStateUpdate', {
                id: victim.id,
                isAlive: false,
                health: 0
            });
        }
        
        if (killData && killData.shouldReward) {
            const killer = this.gameState.getPlayer(killData.killerId);
            if (killer && killer.isAlive) {
                // Grant kill rewards
                killer.kills = (killer.kills || 0) + 1;
                
                const healthReward = 35;
                const manaReward = 15;
                
                const actualHealthGained = killer.restoreHealth(healthReward);
                const actualManaGained = killer.restoreMana(manaReward);
                
                // Send updates to the killer
                if (this.io) {
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
                    
                    this.io.emit('playerKilled', {
                        killerId: killer.id,
                        victimId: victim.id,
                        killerKills: killer.kills,
                        healthGained: actualHealthGained,
                        manaGained: actualManaGained
                    });
                }
            }
        }
    }
}

module.exports = BotManager;
