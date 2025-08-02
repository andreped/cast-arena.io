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

    // Initialize new player
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * WORLD_WIDTH, // Random spawn position in larger world
        y: Math.random() * WORLD_HEIGHT,
        color: getRandomColor(),
        health: 100,
        maxHealth: 100,
        kills: 0,
        isBurning: false,
        burnEndTime: 0,
        isAlive: true,
        spawnProtection: true,
        spawnTime: Date.now(),
        facingLeft: false
    };

    // Send current players to new player
    socket.emit('currentPlayers', players);

    // Notify other players about new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    
    // Remove spawn protection after 2 seconds
    setTimeout(() => {
        if (players[socket.id]) {
            players[socket.id].spawnProtection = false;
            io.emit('spawnProtectionEnded', { id: socket.id });
        }
    }, 2000);

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            
            // Track facing direction
            if (movementData.facingLeft !== undefined) {
                players[socket.id].facingLeft = movementData.facingLeft;
            }
            
            // Broadcast movement to other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: movementData.x,
                y: movementData.y,
                facingLeft: players[socket.id].facingLeft
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
        
        if (spell && target && caster && targetId !== spell.casterId) {
            // Skip if player has spawn protection
            if (target.spawnProtection) {
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
            if (target.health <= 0) {
                target.health = 0;
                target.isAlive = false;
                caster.kills++;
                
                // Notify player of death
                io.to(targetId).emit('playerDied');
                
                // Respawn after 3 seconds
                setTimeout(() => {
                    if (players[targetId]) {
                        players[targetId].health = 100;
                        players[targetId].x = Math.random() * WORLD_WIDTH;
                        players[targetId].y = Math.random() * WORLD_HEIGHT;
                        players[targetId].isBurning = false;
                        players[targetId].isAlive = true;
                        players[targetId].kills = 0; // Reset kills on death
                        players[targetId].spawnProtection = true;
                        players[targetId].spawnTime = Date.now();
                        delete burnEffects[targetId];
                        
                        // Remove spawn protection after 2 seconds
                        setTimeout(() => {
                            if (players[targetId]) {
                                players[targetId].spawnProtection = false;
                                io.emit('spawnProtectionEnded', { id: targetId });
                            }
                        }, 2000);
                        
                        io.emit('playerRespawned', {
                            id: targetId,
                            x: players[targetId].x,
                            y: players[targetId].y,
                            health: players[targetId].health,
                            kills: players[targetId].kills
                        });
                    }
                }, 3000);
                
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
            // Check if burn effect should end
            if (now >= burnEffect.endTime) {
                player.isBurning = false;
                delete burnEffects[playerId];
                
                io.emit('burnEnded', { id: playerId });
            } else {
                // Apply burn damage every second
                if (now - burnEffect.lastTick >= 1000) {
                    player.health = Math.max(0, player.health - 2);
                    burnEffect.lastTick = now;
                    
                    // Check if player died from burn
                    if (player.health <= 0) {
                        player.health = 0;
                        player.isBurning = false;
                        delete burnEffects[playerId];
                        
                        // Respawn after 3 seconds
                        setTimeout(() => {
                            if (players[playerId]) {
                                players[playerId].health = 100;
                                players[playerId].x = Math.random() * WORLD_WIDTH;
                                players[playerId].y = Math.random() * WORLD_HEIGHT;
                                players[playerId].kills = 0;
                                players[playerId].spawnProtection = true;
                                players[playerId].spawnTime = Date.now();
                                
                                // Remove spawn protection after 2 seconds
                                setTimeout(() => {
                                    if (players[playerId]) {
                                        players[playerId].spawnProtection = false;
                                        io.emit('spawnProtectionEnded', { id: playerId });
                                    }
                                }, 2000);
                                
                                io.emit('playerRespawned', {
                                    id: playerId,
                                    x: players[playerId].x,
                                    y: players[playerId].y,
                                    health: players[playerId].health,
                                    kills: players[playerId].kills
                                });
                            }
                        }, 3000);
                        
                        io.emit('playerDiedFromBurn', { id: playerId });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🧙‍♂️ Cast Arena server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    if (process.env.RAILWAY_STATIC_URL) {
        console.log(`Public: ${process.env.RAILWAY_STATIC_URL}`);
    }
});
