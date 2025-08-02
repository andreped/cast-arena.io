// Initialize Socket.IO connection
const socket = io();

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let players = {};
let myId = null;

// Player movement
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

const PLAYER_SPEED = 3;
const PLAYER_SIZE = 20;

// Socket event handlers
socket.on('connect', () => {
    myId = socket.id;
    console.log('Connected to server with ID:', myId);
});

socket.on('currentPlayers', (serverPlayers) => {
    players = serverPlayers;
    updatePlayerCount();
});

socket.on('newPlayer', (player) => {
    players[player.id] = player;
    updatePlayerCount();
});

socket.on('playerMoved', (data) => {
    if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
    }
});

socket.on('playerDisconnected', (playerId) => {
    delete players[playerId];
    updatePlayerCount();
});

// Input handling
document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Game loop
function gameLoop() {
    handleMovement();
    render();
    requestAnimationFrame(gameLoop);
}

function handleMovement() {
    if (!myId || !players[myId]) return;

    const player = players[myId];
    let moved = false;
    
    let newX = player.x;
    let newY = player.y;

    // Handle movement input
    if (keys.w || keys.ArrowUp) {
        newY -= PLAYER_SPEED;
        moved = true;
    }
    if (keys.s || keys.ArrowDown) {
        newY += PLAYER_SPEED;
        moved = true;
    }
    if (keys.a || keys.ArrowLeft) {
        newX -= PLAYER_SPEED;
        moved = true;
    }
    if (keys.d || keys.ArrowRight) {
        newX += PLAYER_SPEED;
        moved = true;
    }

    // Keep player within bounds
    newX = Math.max(PLAYER_SIZE, Math.min(canvas.width - PLAYER_SIZE, newX));
    newY = Math.max(PLAYER_SIZE, Math.min(canvas.height - PLAYER_SIZE, newY));

    // Update position if moved
    if (moved && (newX !== player.x || newY !== player.y)) {
        player.x = newX;
        player.y = newY;
        
        // Send movement to server
        socket.emit('playerMovement', {
            x: newX,
            y: newY
        });
    }
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    drawGrid();
    
    // Draw all players
    Object.values(players).forEach(player => {
        drawPlayer(player, player.id === myId);
    });
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawPlayer(player, isMe) {
    const x = player.x;
    const y = player.y;
    
    // Draw wizard body (circle)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // Add border for current player
    if (isMe) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // Draw wizard hat
    ctx.fillStyle = '#4A4A4A';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 15);
    ctx.lineTo(x, y - 35);
    ctx.lineTo(x + 15, y - 15);
    ctx.closePath();
    ctx.fill();
    
    // Hat star
    ctx.fillStyle = '#FFD700';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', x, y - 20);
    
    // Draw wizard staff
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 10);
    ctx.lineTo(x + 20, y + 25);
    ctx.stroke();
    
    // Staff orb
    ctx.fillStyle = '#9370DB';
    ctx.beginPath();
    ctx.arc(x + 20, y - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Player ID (for debugging)
    if (isMe) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', x, y + PLAYER_SIZE + 15);
    }
}

function updatePlayerCount() {
    const count = Object.keys(players).length;
    document.getElementById('playerCount').textContent = `Players Online: ${count}`;
}

// Start the game loop
gameLoop();
