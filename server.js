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
    
    // Send item updates to all clients
    const itemsState = gameState.getItemsState();
    if (Object.keys(itemsState).length > 0) {
        io.emit('itemsUpdate', itemsState);
    }
};

// Start game loop (run every 1 second)
setInterval(gameLoop, 1000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🧙‍♂️ Cast Arena server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    if (process.env.RAILWAY_STATIC_URL) {
        console.log(`Public: ${process.env.RAILWAY_STATIC_URL}`);
    }
});
