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
const gameLoop = () => {
    gameState.update();
    
    // Always send item updates to all clients (even when empty to handle removals)
    const itemsState = gameState.getItemsState();
    io.emit('itemsUpdate', itemsState);
    
    // Send player updates to synchronize speed buffs and other dynamic data
    const currentState = gameState.getCurrentState();
    io.emit('gameStateUpdate', currentState);
};

// Start game loop (run every 100ms for better responsiveness)
const gameLoopInterval = setInterval(gameLoop, 100);

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
