// Initialize Socket.IO connection
const socket = io();

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get minimap canvas and context
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// Game state
let players = {};
let spells = {};
let myId = null;
let mouseX = 0;
let mouseY = 0;
let showLeaderboard = false;
let isDead = false;

// Mobile controls
let isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let joystickActive = false;
let joystickDirection = { x: 0, y: 0 };
let lastFireTime = 0;

// Player movement
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
    ' ': false // Space for casting
};

const PLAYER_SPEED = 3;
const PLAYER_SIZE = 20;
const SPELL_SIZE = 8;

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

// Combat events
socket.on('spellCast', (spell) => {
    spells[spell.id] = spell;
});

socket.on('healthUpdate', (data) => {
    if (players[data.id]) {
        players[data.id].health = data.health;
        players[data.id].isBurning = data.isBurning;
        players[data.id].burnEndTime = data.burnEndTime;
    }
});

socket.on('playerKilled', (data) => {
    if (players[data.killerId]) {
        players[data.killerId].kills = data.killerKills;
    }
});

socket.on('playerRespawned', (data) => {
    if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
        players[data.id].health = data.health;
        players[data.id].kills = data.kills;
        players[data.id].isBurning = false;
    }
});

socket.on('burnEnded', (data) => {
    if (players[data.id]) {
        players[data.id].isBurning = false;
    }
});

socket.on('playerDied', () => {
    isDead = true;
    showDeathModal();
});

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        showLeaderboard = !showLeaderboard;
        document.getElementById('leaderboardModal').style.display = 
            showLeaderboard ? 'block' : 'none';
        if (showLeaderboard) updateLeaderboard();
        return;
    }
    
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
    
    // Cast spell with space
    if (e.key === ' ') {
        e.preventDefault();
        castSpell(canvas.width / 2, canvas.height / 2); // Cast towards center if no mouse target
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Mouse handling for spell casting
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;
    castSpell(targetX, targetY);
});

// Mobile touch controls
if (isMobile) {
    initMobileControls();
}

function initMobileControls() {
    const joystickArea = document.getElementById('joystickArea');
    const joystick = document.getElementById('joystick');
    const fireButton = document.getElementById('fireButton');
    
    // Joystick touch handling
    joystickArea.addEventListener('touchstart', handleJoystickStart, { passive: false });
    joystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });
    joystickArea.addEventListener('touchend', handleJoystickEnd, { passive: false });
    
    // Fire button handling
    fireButton.addEventListener('touchstart', handleFireButton, { passive: false });
    fireButton.addEventListener('click', handleFireButton);
    
    function handleJoystickStart(e) {
        e.preventDefault();
        joystickActive = true;
        updateJoystick(e.touches[0]);
    }
    
    function handleJoystickMove(e) {
        e.preventDefault();
        if (joystickActive) {
            updateJoystick(e.touches[0]);
        }
    }
    
    function handleJoystickEnd(e) {
        e.preventDefault();
        joystickActive = false;
        joystickDirection = { x: 0, y: 0 };
        
        // Reset joystick position
        joystick.style.transform = 'translate(-50%, -50%)';
    }
    
    function updateJoystick(touch) {
        const rect = joystickArea.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 40; // Max joystick movement
        
        if (distance <= maxDistance) {
            joystick.style.transform = `translate(${deltaX - 20}px, ${deltaY - 20}px)`;
            joystickDirection.x = deltaX / maxDistance;
            joystickDirection.y = deltaY / maxDistance;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * maxDistance;
            const limitedY = Math.sin(angle) * maxDistance;
            
            joystick.style.transform = `translate(${limitedX - 20}px, ${limitedY - 20}px)`;
            joystickDirection.x = limitedX / maxDistance;
            joystickDirection.y = limitedY / maxDistance;
        }
    }
    
    function handleFireButton(e) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastFireTime > 300) { // Prevent spam clicking
            fireInDirection();
            lastFireTime = now;
        }
    }
}

function fireInDirection() {
    if (!myId || !players[myId] || isDead) return;
    
    const player = players[myId];
    let targetX, targetY;
    
    if (Math.abs(joystickDirection.x) > 0.1 || Math.abs(joystickDirection.y) > 0.1) {
        // Fire in joystick direction
        targetX = player.x + joystickDirection.x * canvas.height;
        targetY = player.y + joystickDirection.y * canvas.height;
    } else {
        // Fire to the right if no direction
        targetX = player.x + canvas.height;
        targetY = player.y;
    }
    
    castSpell(targetX, targetY);
}

// Game loop
function gameLoop() {
    if (!isDead) {
        handleMovement();
    }
    updateSpells();
    render();
    renderMinimap();
    requestAnimationFrame(gameLoop);
}

function handleMovement() {
    if (!myId || !players[myId]) return;

    const player = players[myId];
    let moved = false;
    
    let newX = player.x;
    let newY = player.y;

    // Handle keyboard movement input
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
    
    // Handle mobile joystick movement
    if (isMobile && joystickActive) {
        const moveThreshold = 0.1;
        if (Math.abs(joystickDirection.x) > moveThreshold || Math.abs(joystickDirection.y) > moveThreshold) {
            newX += joystickDirection.x * PLAYER_SPEED * 1.5; // Slightly faster for mobile
            newY += joystickDirection.y * PLAYER_SPEED * 1.5;
            moved = true;
        }
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
    
    // Draw all spells
    Object.values(spells).forEach(spell => {
        drawSpell(spell);
        updateSpell(spell);
    });
    
    // Draw all players
    Object.values(players).forEach(player => {
        drawPlayer(player, player.id === myId);
        drawHealthBar(player);
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
    
    // Draw burning effect
    if (player.isBurning) {
        ctx.save();
        const time = Date.now();
        const flicker = Math.sin(time * 0.01) * 0.3 + 0.7;
        
        // Burning aura
        ctx.globalAlpha = flicker * 0.8;
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(x, y, PLAYER_SIZE + 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = flicker * 0.6;
        ctx.fillStyle = '#FF6B00';
        ctx.beginPath();
        ctx.arc(x, y, PLAYER_SIZE + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
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

function drawHealthBar(player) {
    const x = player.x;
    const y = player.y - PLAYER_SIZE - 20;
    const width = 40;
    const height = 6;
    
    // Health bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(x - width/2, y, width, height);
    
    // Health bar fill
    const healthPercent = player.health / (player.maxHealth || 100);
    const healthWidth = width * healthPercent;
    
    if (healthPercent > 0.6) {
        ctx.fillStyle = '#4CAF50';
    } else if (healthPercent > 0.3) {
        ctx.fillStyle = '#FF9800';
    } else {
        ctx.fillStyle = '#F44336';
    }
    
    ctx.fillRect(x - width/2, y, healthWidth, height);
    
    // Health bar border
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width/2, y, width, height);
    
    // Health text
    ctx.fillStyle = '#FFF';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.health)}`, x, y - 2);
    
    // Kill count with skull icon
    const kills = player.kills || 0;
    ctx.fillStyle = '#FFD700';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`💀${kills}`, x + width/2 + 5, y + height);
}

function castSpell(targetX, targetY) {
    if (!myId || !players[myId] || isDead) return;
    
    const player = players[myId];
    
    // Calculate direction vector
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction and extend to screen width
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;
    
    // Calculate target point at screen edge
    const screenDistance = canvas.height; // Travel about screen height distance
    const finalTargetX = player.x + normalizedDx * screenDistance;
    const finalTargetY = player.y + normalizedDy * screenDistance;
    
    socket.emit('castSpell', {
        x: player.x,
        y: player.y,
        targetX: finalTargetX,
        targetY: finalTargetY
    });
}

function drawSpell(spell) {
    if (!spell) return;
    
    // Draw fireball trail
    if (spell.trail && spell.trail.length > 0) {
        ctx.save();
        for (let i = 0; i < spell.trail.length; i++) {
            const trailPoint = spell.trail[i];
            const alpha = (i + 1) / spell.trail.length * 0.6; // Fade effect
            const size = (i + 1) / spell.trail.length * (SPELL_SIZE - 2);
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FF6500';
            ctx.beginPath();
            ctx.arc(trailPoint.x, trailPoint.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    
    // Draw fireball
    ctx.save();
    
    // Outer fire
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(spell.x, spell.y, SPELL_SIZE + 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner fire
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(spell.x, spell.y, SPELL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // Fire core
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(spell.x, spell.y, SPELL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function updateSpell(spell) {
    if (!spell) return;
    
    const now = Date.now();
    const elapsed = (now - spell.createdAt) / 1000;
    
    // Calculate movement
    const dx = spell.targetX - spell.x;
    const dy = spell.targetY - spell.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5) {
        // Spell reached target, remove it
        delete spells[spell.id];
        return;
    }
    
    // Move spell
    const moveDistance = spell.speed * (1/60); // Assuming 60 FPS
    spell.x += (dx / distance) * moveDistance;
    spell.y += (dy / distance) * moveDistance;
    
    // Check collision with players
    Object.values(players).forEach(player => {
        if (player.id !== spell.casterId) {
            const playerDx = player.x - spell.x;
            const playerDy = player.y - spell.y;
            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
            
            if (playerDistance < PLAYER_SIZE + SPELL_SIZE) {
                // Hit detected
                socket.emit('spellHit', {
                    spellId: spell.id,
                    targetId: player.id
                });
                delete spells[spell.id];
            }
        }
    });
    
    // Remove spell after 3 seconds
    if (elapsed > 3) {
        delete spells[spell.id];
    }
}

function updateSpells() {
    Object.values(spells).forEach(spell => {
        if (!spell) return;
        
        const now = Date.now();
        const elapsed = (now - spell.createdAt) / 1000;
        
        // Initialize trail if not exists
        if (!spell.trail) {
            spell.trail = [];
        }
        
        // Add current position to trail
        spell.trail.push({ x: spell.x, y: spell.y });
        
        // Limit trail length
        if (spell.trail.length > 8) {
            spell.trail.shift();
        }
        
        // Calculate movement
        const dx = spell.targetX - spell.x;
        const dy = spell.targetY - spell.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            // Spell reached target, remove it
            delete spells[spell.id];
            return;
        }
        
        // Move spell
        const moveDistance = spell.speed * (1/60); // Assuming 60 FPS
        spell.x += (dx / distance) * moveDistance;
        spell.y += (dy / distance) * moveDistance;
        
        // Check collision with players
        Object.values(players).forEach(player => {
            if (player.id !== spell.casterId && player.isAlive !== false) {
                const playerDx = player.x - spell.x;
                const playerDy = player.y - spell.y;
                const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                
                if (playerDistance < PLAYER_SIZE + SPELL_SIZE) {
                    // Hit detected
                    socket.emit('spellHit', {
                        spellId: spell.id,
                        targetId: player.id
                    });
                    delete spells[spell.id];
                }
            }
        });
        
        // Remove spell after 5 seconds or if it goes off screen
        if (elapsed > 5 || spell.x < -50 || spell.x > canvas.width + 50 || 
            spell.y < -50 || spell.y > canvas.height + 50) {
            delete spells[spell.id];
        }
    });
}

function renderMinimap() {
    if (!minimapCtx) return;
    
    // Clear minimap
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw minimap background
    minimapCtx.fillStyle = 'rgba(0, 50, 100, 0.8)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Scale factors
    const scaleX = minimapCanvas.width / canvas.width;
    const scaleY = minimapCanvas.height / canvas.height;
    
    // Draw players on minimap
    Object.values(players).forEach(player => {
        const x = player.x * scaleX;
        const y = player.y * scaleY;
        
        minimapCtx.fillStyle = player.id === myId ? '#FFD700' : player.color;
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Add border for current player
        if (player.id === myId) {
            minimapCtx.strokeStyle = '#FFF';
            minimapCtx.lineWidth = 1;
            minimapCtx.stroke();
        }
    });
    
    // Draw spells on minimap
    Object.values(spells).forEach(spell => {
        const x = spell.x * scaleX;
        const y = spell.y * scaleY;
        
        minimapCtx.fillStyle = '#FF4500';
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, 1, 0, Math.PI * 2);
        minimapCtx.fill();
    });
}

function showDeathModal() {
    const deathModal = document.getElementById('deathModal');
    const respawnTimer = document.getElementById('respawnTimer');
    
    deathModal.style.display = 'block';
    
    let timeLeft = 3;
    respawnTimer.textContent = timeLeft;
    
    const countdown = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            respawnTimer.textContent = timeLeft;
        } else {
            clearInterval(countdown);
            deathModal.style.display = 'none';
            isDead = false;
        }
    }, 1000);
}

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    // Sort players by kills
    const sortedPlayers = Object.values(players)
        .sort((a, b) => (b.kills || 0) - (a.kills || 0))
        .slice(0, 10); // Top 10
    
    if (sortedPlayers.length === 0) {
        leaderboardList.innerHTML = '<p>No players yet!</p>';
        return;
    }
    
    sortedPlayers.forEach((player, index) => {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        
        const rank = index + 1;
        const name = player.id === myId ? 'YOU' : `Player ${player.id.substring(0, 6)}`;
        const kills = player.kills || 0;
        
        entry.innerHTML = `
            <span class="player-name">${rank}. ${name}</span>
            <span class="player-kills">${kills} 💀</span>
        `;
        
        leaderboardList.appendChild(entry);
    });
}

function updatePlayerCount() {
    const count = Object.keys(players).length;
    document.getElementById('playerCount').textContent = `Players Online: ${count}`;
}

// Start the game loop
gameLoop();
