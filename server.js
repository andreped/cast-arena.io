const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Game world configuration
const WORLD_WIDTH = 800 * 3;  // Triple the canvas size
const WORLD_HEIGHT = 600 * 3;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for players and spells
const players = {};
const spells = {};
const burnEffects = {};

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Initialize new player with minimal information first
    players[socket.id] = {
        id: socket.id,
        x: 0, // Initial position will be overwritten by respawnPlayer
        y: 0,
        color: getRandomColor(),
        health: 100,
        maxHealth: 100,
        kills: 0,
        isBurning: false,
        burnEndTime: 0,
        isAlive: true,
        facingLeft: false
    };

    // Send current players to new player first
    socket.emit('currentPlayers', players);

    // Notify other players about new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    
    // Use the unified respawn function for initializing the player position
    // This ensures complete consistency between initial spawn and respawn
    respawnPlayer(socket.id);

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            // Ignore movement updates if player is in respawn immunity period
            if (players[socket.id].respawnImmunity) {
                console.log('Ignoring movement during respawn immunity');
                return;
            }
            
            // Ignore movement if player is dead
            if (players[socket.id].isAlive !== true) {
                console.log('Ignoring movement for dead player:', socket.id);
                return;
            }
            
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            
            // Track facing direction
            if (movementData.facingLeft !== undefined) {
                players[socket.id].facingLeft = movementData.facingLeft;
            }
            
            // Broadcast movement to other players including isAlive state
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: movementData.x,
                y: movementData.y,
                facingLeft: players[socket.id].facingLeft,
                isAlive: players[socket.id].isAlive
            });
        }
    });

    // Handle spell casting
    socket.on('castSpell', (spellData) => {
        if (players[socket.id] && players[socket.id].isAlive) {
            const spellId = Date.now() + '_' + socket.id;
            const spell = {
                id: spellId,
                casterId: socket.id,
                type: 'fireball',
                x: spellData.x,
                y: spellData.y,
                targetX: spellData.targetX,
                targetY: spellData.targetY,
                speed: 200, // pixels per second - slower for better visibility
                damage: 20,
                createdAt: Date.now(),
                trail: [] // For fireball trail
            };
            
            spells[spellId] = spell;
            
            // Broadcast spell to all players
            io.emit('spellCast', spell);
        }
    });

    // Handle spell hit
    socket.on('spellHit', (hitData) => {
        const { spellId, targetId } = hitData;
        const spell = spells[spellId];
        const target = players[targetId];
        const caster = players[spell?.casterId];
        
        // Validate all entities exist and this isn't friendly fire
        if (spell && target && caster && targetId !== spell.casterId) {
            // Skip if player has spawn protection
            if (target.spawnProtection) {
                console.log(`Ignoring hit on player ${targetId} with spawn protection`);
                return;
            }
            
            // Skip if player is already dead - strictly check isAlive flag
            if (target.isAlive !== true) {
                console.log(`Ignoring hit on dead player ${targetId}`);
                return;
            }
            
            // Apply damage
            target.health -= spell.damage;
            
            // Apply burn effect
            target.isBurning = true;
            target.burnEndTime = Date.now() + 10000; // 10 seconds
            burnEffects[targetId] = {
                endTime: target.burnEndTime,
                lastTick: Date.now()
            };
            
            // Check if player died
            if (target.health <= 0 && target.isAlive) { // Only process death if player is alive
                target.health = 0;
                target.isAlive = false;
                
                // Increment the killer's kill count
                caster.kills = (caster.kills || 0) + 1;
                console.log(`Player ${spell.casterId} killed player ${targetId}. Kills: ${caster.kills}`);
                
                // Notify player of death
                io.to(targetId).emit('playerDied');
                
                // Notify all clients that this player is dead
                io.emit('playerStateUpdate', {
                    id: targetId,
                    isAlive: false,
                    health: 0
                });
                
                // Respawn after 3 seconds
                setTimeout(() => {
                    respawnPlayer(targetId);
                }, 3000);
                
                // Broadcast the kill information
                io.emit('playerKilled', {
                    killerId: spell.casterId,
                    victimId: targetId,
                    killerKills: caster.kills
                });
            }
            
            // Remove spell
            delete spells[spellId];
            
            // Broadcast health update
            io.emit('healthUpdate', {
                id: targetId,
                health: target.health,
                isBurning: target.isBurning,
                burnEndTime: target.burnEndTime
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        delete burnEffects[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Game loop for burn effects
setInterval(() => {
    const now = Date.now();
    
    Object.keys(burnEffects).forEach(playerId => {
        const burnEffect = burnEffects[playerId];
        const player = players[playerId];
        
        if (player && burnEffect) {
            // First, check if player is alive - if not, immediately clear burn effect
            if (player.isAlive !== true) {
                player.isBurning = false;
                delete burnEffects[playerId];
                io.emit('burnEnded', { id: playerId });
                return;
            }
            
            // Check if burn effect should end
            if (now >= burnEffect.endTime) {
                player.isBurning = false;
                delete burnEffects[playerId];
                
                io.emit('burnEnded', { id: playerId });
            } else {
                // Apply burn damage every second
                if (now - burnEffect.lastTick >= 1000) {
                    // Double-check player is alive (belt and suspenders approach)
                    if (player.isAlive === true) {
                        player.health = Math.max(0, player.health - 2);
                        burnEffect.lastTick = now;
                    } else {
                        // If player is dead, remove the burn effect
                        player.isBurning = false;
                        delete burnEffects[playerId];
                        io.emit('burnEnded', { id: playerId });
                        return;
                    }
                    
                    // Check if player died from burn
                    if (player.health <= 0 && player.isAlive) { // Only process death if player is alive
                        player.health = 0;
                        player.isBurning = false;
                        player.isAlive = false; // Mark as dead
                        delete burnEffects[playerId];
                        
                        console.log(`Player ${playerId} died from burn damage`);
                        
                        // Notify player of death
                        io.to(playerId).emit('playerDied');
                        
                        // Respawn after 3 seconds
                        setTimeout(() => {
                            respawnPlayer(playerId);
                        }, 3000);
                        
                        io.emit('playerDiedFromBurn', { id: playerId });
                        
                        // Also broadcast explicit death state to all clients
                        io.emit('playerStateUpdate', {
                            id: playerId,
                            isAlive: false,
                            health: 0
                        });
                    } else {
                        io.emit('healthUpdate', {
                            id: playerId,
                            health: player.health,
                            isBurning: player.isBurning,
                            burnEndTime: burnEffect.endTime
                        });
                    }
                }
            }
        }
    });
}, 100); // Check every 100ms for smooth updates

// Helper function to generate random colors for wizards
function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Helper function to respawn a player with consistent logic
function respawnPlayer(playerId) {
    if (players[playerId]) {
        console.log('Respawning player:', playerId);
        
        // Generate new spawn coordinates
        const spawnX = Math.random() * WORLD_WIDTH;
        const spawnY = Math.random() * WORLD_HEIGHT;
        
        // Stop processing any movement updates during respawn
        players[playerId].respawnImmunity = true;
        
        // Reset ALL player stats for respawn to ensure clean state
        players[playerId].health = 100;
        players[playerId].x = spawnX;
        players[playerId].y = spawnY;
        players[playerId].isBurning = false;
        players[playerId].isAlive = true; // Explicitly set to alive
        players[playerId].burnEndTime = 0; // Clear burn end time
        
        // Don't reset kills on initial spawn, only when player dies
        if (players[playerId].hasSpawned) {
            players[playerId].kills = 0;
        } else {
            // Mark that this player has spawned at least once
            players[playerId].hasSpawned = true;
        }
        players[playerId].spawnProtection = true;
        players[playerId].spawnTime = Date.now();
        
        // Make sure to clear any burn effects
        delete burnEffects[playerId];
        
        // Notify all clients about the respawn with a playerStateUpdate to ensure isAlive is synced
        io.emit('playerStateUpdate', {
            id: playerId,
            isAlive: true,
            health: players[playerId].health
        });
        
        // First notify the specific player about their respawn with isLocalPlayer flag
        io.to(playerId).emit('playerRespawned', {
            id: playerId,
            x: spawnX,
            y: spawnY,
            health: players[playerId].health,
            kills: players[playerId].kills,
            isAlive: true, 
            isLocalPlayer: true // Flag to identify this is the local player respawning
        });
        
        // Then broadcast to ALL other players that this player has respawned
        // Making sure we have the socket for this player
        const playerSocket = io.sockets.sockets.get(playerId);
        if (playerSocket) {
            playerSocket.broadcast.emit('playerRespawned', {
                id: playerId,
                x: spawnX,
                y: spawnY,
                health: players[playerId].health,
                kills: players[playerId].kills,
                isAlive: true,
                isLocalPlayer: false // Flag indicating this is NOT the local player
            });
        } else {
            // Fallback to general broadcast if we can't get the socket directly
            io.emit('playerRespawned', {
                id: playerId,
                x: spawnX,
                y: spawnY,
                health: players[playerId].health,
                kills: players[playerId].kills,
                isAlive: true,
                isLocalPlayer: false
            });
        }
        
        // Send an additional "forceSyncPlayer" event to ensure all clients update this player's state
        io.emit('forceSyncPlayer', {
            id: playerId,
            x: spawnX,
            y: spawnY,
            health: players[playerId].health,
            isAlive: true,
            isBurning: false,
            burnEndTime: 0,
            kills: players[playerId].kills
        });
        
        // Also broadcast a health update to ensure all clients clear burn effects and health state
        io.emit('healthUpdate', {
            id: playerId,
            health: players[playerId].health,
            isBurning: false,
            burnEndTime: 0
        });
        
        // Remove respawn immunity after a delay to allow client to stabilize
        setTimeout(() => {
            if (players[playerId]) {
                players[playerId].respawnImmunity = false;
            }
        }, 1000);
        
        // Remove spawn protection after 2 seconds
        setTimeout(() => {
            if (players[playerId]) {
                players[playerId].spawnProtection = false;
                io.emit('spawnProtectionEnded', { id: playerId });
            }
        }, 2000);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🧙‍♂️ Cast Arena server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    if (process.env.RAILWAY_STATIC_URL) {
        console.log(`Public: ${process.env.RAILWAY_STATIC_URL}`);
    }
});
