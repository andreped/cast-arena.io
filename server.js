const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const GameState = require('./src/game/systems/GameState');
const BurnSystem = require('./src/game/systems/BurnSystem');
const SocketManager = require('./src/network/SocketManager');

// Create Express app and Socket.IO server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize game systems
const gameState = new GameState();
const burnSystem = new BurnSystem(gameState, io);
const socketManager = new SocketManager(io, gameState, burnSystem);

// Game loop for server-side updates
let gameLoopCounter = 0;
const gameLoop = () => {
    // Register this tick for TPS monitoring
    socketManager.registerTick();
    
    gameState.update();
    
    gameLoopCounter++;
    
    // Reduce broadcast frequency to minimize network overhead
    // Only broadcast every 4th tick (4 times per second instead of 20)
    if (gameLoopCounter % 5 === 0) {
        // Only send item updates if items have actually changed
        const itemsState = gameState.getItemsState();
        const itemsChanged = gameState.itemSystem.hasItemsChanged();
        if (itemsChanged || gameLoopCounter % 20 === 0) { // Force update every second
            io.emit('itemsUpdate', itemsState);
            gameState.itemSystem.resetChangeFlag();
        }
        
        // Send player state updates for all players periodically, and immediately for players with buffs
        const playersWithBuffs = gameState.getPlayersWithActiveBuffs();
        if (Object.keys(playersWithBuffs).length > 0) {
            io.emit('gameStateUpdate', playersWithBuffs);
        }
        
        // Send complete state for all players every 4 seconds to ensure synchronization
        if (gameLoopCounter % 80 === 0) { // Every 80 ticks = 4 seconds at 20 TPS
            const allPlayersState = gameState.getCurrentState();
            io.emit('gameStateUpdate', allPlayersState);
        }
    }
    
    // Send mana updates less frequently (every 10th tick = 2 times per second)
    if (gameLoopCounter % 10 === 0) {
        socketManager.broadcastManaUpdates();
    }
};

// Configurable server tick rate (default 20 TPS = 50ms)
const targetTPS = process.env.SERVER_TPS ? parseInt(process.env.SERVER_TPS) : 20;
const tickInterval = 1000 / targetTPS;

console.log(`🎮 Server configured for ${targetTPS} TPS (${tickInterval}ms intervals)`);

// Start game loop with configurable tick rate
const gameLoopInterval = setInterval(gameLoop, tickInterval);

// Cleanup function for graceful shutdown
const cleanup = () => {
    console.log('Shutting down server...');
    
    // Clear intervals
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
    }
    
    // Cleanup game systems
    if (burnSystem && burnSystem.destroy) {
        burnSystem.destroy();
    }
    
    process.exit(0);
};

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🧙‍♂️ Cast Arena server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    if (process.env.RAILWAY_STATIC_URL) {
        console.log(`Public: ${process.env.RAILWAY_STATIC_URL}`);
    }
});
