const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for players
const players = {};

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Initialize new player
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 800, // Random spawn position
        y: Math.random() * 600,
        color: getRandomColor(),
        health: 100
    };

    // Send current players to new player
    socket.emit('currentPlayers', players);

    // Notify other players about new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            
            // Broadcast movement to other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: movementData.x,
                y: movementData.y
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

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
