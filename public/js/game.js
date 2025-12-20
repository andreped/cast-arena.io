import { GAME_CONFIG } from './config/gameConfig.js';
import { Player } from './entities/Player.js';
import { Spell } from './entities/Spell.js';
import { Wall } from './entities/Wall.js';
import { SpeedItem } from './entities/SpeedItem.js';
import { ManaItem } from './entities/ManaItem.js';
import { RingOfFireItem } from './entities/RingOfFireItem.js';
import { InputSystem } from './systems/InputSystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { NetworkSystem } from './systems/NetworkSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { UISystem } from './ui/UISystem.js';

export class Game {
    constructor() {
        // Initialize main elements
        this.canvas = document.getElementById('gameCanvas');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        
        // Set up dynamic viewport
        this.setupDynamicViewport();
        
        // Theme will be set when server sends it via NetworkSystem
        // this.applyTheme(GAME_CONFIG.themes.current); -- Removed to prevent client-side theme
        
        // Make canvas focusable and auto-focus for immediate keyboard input
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.focus();
        
        // Add a visual indicator when canvas has focus (optional)
        this.canvas.addEventListener('focus', () => {
            this.canvas.style.outline = '2px solid rgba(255, 255, 255, 0.3)';
            // Hide any focus hint if it exists
            const focusHint = document.getElementById('focusHint');
            if (focusHint) {
                focusHint.style.display = 'none';
            }
        });
        this.canvas.addEventListener('blur', () => {
            this.canvas.style.outline = 'none';
            // Show focus hint
            this.showFocusHint();
        });
        
        this.players = new Map();
        this.spells = new Map();
        this.walls = new Map();
        this.items = new Map();
        this.explosions = []; // Array to store active explosions
        this.myId = null;
        this.isDead = false;
        this.isDestroyed = false;
        
        // Camera position
        this.camera = {
            x: 0,
            y: 0
        };
        
        // Initialize systems (but delay network until name is set)
        this.input = new InputSystem(this);
        this.renderer = new RenderSystem(this);
        this.audio = new AudioSystem();
        this.ui = new UISystem(this);
        
        // Player name - will be set from welcome modal
        this.playerName = null;
        
        // Load audio assets asynchronously
        this.initializeAudio();
        
        // Start game loop
        this.lastUpdateTime = performance.now();
        this.gameLoop();
    }
    
    setupDynamicViewport() {
        // Set initial canvas size
        this.resizeCanvas();
        
        // Listen for window resize events
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    resizeCanvas() {
        if (!GAME_CONFIG.canvas.dynamicViewport) return;
        
        // Get viewport dimensions with zoom protection
        const width = GAME_CONFIG.viewport.getWidth();
        const height = GAME_CONFIG.viewport.getHeight();
        
        // Update canvas dimensions with enforced limits
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update canvas size in game config for other systems to use
        GAME_CONFIG.canvas.width = width;
        GAME_CONFIG.canvas.height = height;
        
        // Update minimap size proportionally
        const minimapScale = Math.min(width, height) * 0.15; // 15% of smaller dimension
        this.minimapCanvas.width = minimapScale;
        this.minimapCanvas.height = minimapScale * 0.75; // Maintain aspect ratio
        
        // Reinitialize renderer to handle new dimensions
        if (this.renderer) {
            this.renderer.ctx.imageSmoothingEnabled = false;
            this.renderer.ctx.webkitImageSmoothingEnabled = false;
            this.renderer.ctx.mozImageSmoothingEnabled = false;
            this.renderer.ctx.msImageSmoothingEnabled = false;
        }
        
        console.log(`Canvas resized to: ${width}x${height} (protected from zoom abuse)`);
    }

    async initializeAudio() {
        if (!GAME_CONFIG.audio.enabled) {
            console.log('Audio disabled in config');
            return;
        }
        
        try {
            // Load sound effects
            await this.audio.loadSounds(GAME_CONFIG.audio.sounds);
            
            // Load and play background music
            const musicLoaded = await this.audio.loadMusic('background', GAME_CONFIG.audio.music.background);
            if (musicLoaded) {
                // Start music after a short delay to ensure user interaction
                setTimeout(() => {
                    this.audio.playMusic(true);
                }, 1000);
            }
            
            console.log('✅ Audio system ready');
        } catch (error) {
            console.warn('⚠️ Audio initialization failed:', error);
        }
    }

    showFocusHint() {
        // Create or show focus hint
        let focusHint = document.getElementById('focusHint');
        if (!focusHint) {
            focusHint = document.createElement('div');
            focusHint.id = 'focusHint';
            focusHint.innerHTML = 'Click here to enable keyboard controls (WASD)';
            focusHint.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                border: 2px solid #fff;
                font-family: Arial, sans-serif;
                font-size: 16px;
                pointer-events: none;
                z-index: 1000;
                animation: pulse 2s infinite;
            `;
            
            // Add pulsing animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            this.canvas.parentElement.appendChild(focusHint);
        }
        focusHint.style.display = 'block';
    }

    gameLoop() {
        if (this.isDestroyed) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        
        this.update(deltaTime);
        this.renderer.render();
        
        this.lastUpdateTime = currentTime;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    // Add cleanup method
    destroy() {
        this.isDestroyed = true;
        
        // Cleanup systems
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }
        
        if (this.input) {
            this.input.destroy();
            this.input = null;
        }
        
        if (this.audio) {
            this.audio.destroy();
            this.audio = null;
        }
        
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        
        // Clear collections
        this.players.clear();
        this.spells.clear();
        this.walls.clear();
        this.items.clear();
        this.explosions.length = 0;
        
        // Clear references
        this.canvas = null;
        this.minimapCanvas = null;
        this.renderer = null;
    }

    // Apply theme styling
    applyTheme(themeName) {
        const theme = GAME_CONFIG.themes[themeName];
        if (!theme) return;
        
        // Update canvas background
        this.canvas.style.background = theme.background;
        
        // Update current theme
        GAME_CONFIG.themes.current = themeName;
        
        // Regenerate floor seed to get new pattern with theme colors
        GAME_CONFIG.floor.seed = Math.floor(Math.random() * 1000000);
        
        console.log(`Applied theme: ${theme.name}`);
    }

    // Switch to a different theme
    switchTheme(themeName) {
        this.applyTheme(themeName);
        // Reinitialize floor with new theme patterns
        if (this.renderer) {
            this.renderer.initializeFloor();
            this.renderer.render();
        }
    }

    // Set theme from server (for synchronized themes across all players)
    setTheme(themeName) {
        console.log(`Setting server-synchronized theme: ${themeName}`);
        this.applyTheme(themeName);
        // Reinitialize floor with new theme patterns
        if (this.renderer) {
            this.renderer.initializeFloor();
            this.renderer.render();
        }
    }

    update(deltaTime) {
        if (!this.isDead) {
            this.input.update(deltaTime);
        }
        this.updateRemotePlayers(deltaTime);
        this.updateCamera();
        this.updateSpells(deltaTime);
        this.updateExplosions(deltaTime);
        
        // Update UI with current player stats
        this.ui.updatePlayerStats();
        this.ui.updateActiveEffects();
    }

    updateRemotePlayers(deltaTime) {
        // Predict remote HUMAN player positions between server updates using their velocity
        // IMPORTANT: DO NOT predict bot positions - they are server-authoritative!
        const deltaSeconds = deltaTime / 1000;
        
        for (const [id, player] of this.players) {
            // Skip local player (handled by input system)
            if (id === this.myId) continue;
            
            // Skip BOTS - they are 100% server authoritative, no client prediction needed!
            if (player.isBot) continue;
            
            // Skip dead players - they should not move
            if (!player.isAlive) {
                player.velocityX = 0;
                player.velocityY = 0;
                continue;
            }
            
            // Only predict HUMAN players between server updates
            if (player.velocityX || player.velocityY) {
                // Store original position for fallback
                const originalX = player.x;
                const originalY = player.y;
                
                // Calculate predicted position
                const newX = player.x + player.velocityX * deltaSeconds;
                const newY = player.y + player.velocityY * deltaSeconds;
                const playerRadius = GAME_CONFIG.player.size;
                
                // Use EXACT same collision logic as server and human players
                let finalX = originalX;
                let finalY = originalY;
                
                const velocityThreshold = 0.1;
                const isMovingX = Math.abs(player.velocityX) > velocityThreshold;
                const isMovingY = Math.abs(player.velocityY) > velocityThreshold;
                
                if (isMovingX || isMovingY) {
                    // Try the full movement first
                    if (!this.checkWallCollision(newX, newY, playerRadius)) {
                        // No collision - apply full movement with world boundaries
                        finalX = Math.max(playerRadius, Math.min(GAME_CONFIG.world.width - playerRadius, newX));
                        finalY = Math.max(playerRadius, Math.min(GAME_CONFIG.world.height - playerRadius, newY));
                    } else {
                        // Collision detected - try sliding along walls (same as server)
                        let didSlide = false;
                        let slideX = originalX;
                        let slideY = originalY;
                        
                        // Try horizontal movement only
                        if (isMovingX && !this.checkWallCollision(newX, originalY, playerRadius)) {
                            slideX = newX;
                            didSlide = true;
                        } else if (isMovingX) {
                            // Hit wall horizontally - stop horizontal velocity
                            player.velocityX = 0;
                        }
                        
                        // Try vertical movement only
                        if (isMovingY && !this.checkWallCollision(originalX, newY, playerRadius)) {
                            slideY = newY;
                            didSlide = true;
                        } else if (isMovingY) {
                            // Hit wall vertically - stop vertical velocity
                            player.velocityY = 0;
                        }
                        
                        if (didSlide) {
                            // Apply world boundaries to sliding movement
                            finalX = Math.max(playerRadius, Math.min(GAME_CONFIG.world.width - playerRadius, slideX));
                            finalY = Math.max(playerRadius, Math.min(GAME_CONFIG.world.height - playerRadius, slideY));
                        }
                    }
                    
                    // Apply the predicted position
                    player.x = finalX;
                    player.y = finalY;
                }
            }
        }
    }

    updateCamera(instant = false) {
        if (!this.myId || !this.players.has(this.myId)) return;
        
        const player = this.players.get(this.myId);
        const canvasWidth = GAME_CONFIG.viewport.getWidth();
        const canvasHeight = GAME_CONFIG.viewport.getHeight();
        
        const targetX = player.x - canvasWidth / 2;
        const targetY = player.y - canvasHeight / 2;
        
        if (instant) {
            this.camera.x = targetX;
            this.camera.y = targetY;
        } else {
            // Smooth camera movement
            const smoothness = 0.1;
            this.camera.x += (targetX - this.camera.x) * smoothness;
            this.camera.y += (targetY - this.camera.y) * smoothness;
        }
        
        // Keep camera within world bounds - ensure world edges are always visible
        const maxCameraX = Math.max(0, GAME_CONFIG.world.width - canvasWidth);
        const maxCameraY = Math.max(0, GAME_CONFIG.world.height - canvasHeight);
        
        this.camera.x = Math.max(0, Math.min(maxCameraX, this.camera.x));
        this.camera.y = Math.max(0, Math.min(maxCameraY, this.camera.y));
        
        // Additional safety: if viewport is larger than world, center the world
        if (canvasWidth >= GAME_CONFIG.world.width) {
            this.camera.x = -(canvasWidth - GAME_CONFIG.world.width) / 2;
        }
        if (canvasHeight >= GAME_CONFIG.world.height) {
            this.camera.y = -(canvasHeight - GAME_CONFIG.world.height) / 2;
        }
    }

    updateSpells(deltaTime) {
        // Use Array.from to avoid modification during iteration issues
        const spellEntries = Array.from(this.spells.entries());
        
        for (const [id, spell] of spellEntries) {
            const shouldRemove = spell.update(deltaTime, this.players, this.network.socket, this);
            if (shouldRemove) {
                this.spells.delete(id);
            }
        }
    }

    addWall(wallData) {
        const wall = new Wall(wallData);
        this.walls.set(wall.id, wall);
    }

    setWalls(wallsData) {
        this.walls.clear();
        Object.values(wallsData).forEach(wallData => {
            this.addWall(wallData);
        });
    }

    checkWallCollision(x, y, radius = 0) {
        for (const [id, wall] of this.walls) {
            if (wall.collidesWith(x, y, radius)) {
                return wall;
            }
        }
        return null;
    }

    checkWallLineCollision(x1, y1, x2, y2) {
        for (const [id, wall] of this.walls) {
            if (wall.intersectsLine(x1, y1, x2, y2)) {
                return wall;
            }
        }
        return null;
    }

    // Item management methods
    addItem(itemData) {
        let item;
        if (itemData.type === 'speed') {
            item = new SpeedItem(itemData);
        } else if (itemData.type === 'mana') {
            item = new ManaItem(itemData);
        } else if (itemData.type === 'ringOfFire') {
            item = new RingOfFireItem(itemData);
        } else {
            console.warn('Unknown item type:', itemData.type);
            return;
        }
        this.items.set(item.id, item);
    }

    setItems(itemsData) {
        this.items.clear();
        Object.values(itemsData).forEach(itemData => {
            this.addItem(itemData);
        });
    }

    removeItem(itemId) {
        this.items.delete(itemId);
    }

    checkItemPickup() {
        if (!this.canPlay()) return;
        
        const player = this.players.get(this.myId);
        if (!player) return;

        for (const [itemId, item] of this.items) {
            if (item.isCollidingWithPlayer(player.x, player.y)) {
                // Item will be picked up on server side
                break;
            }
        }
    }

    canPlay() {
        return this.myId && 
               this.players.has(this.myId) && 
               !this.isDead;
    }

    handleLocalPlayerDeath() {
        this.isDead = true;
        const player = this.players.get(this.myId);
        if (player) {
            player.isAlive = false;
            player.health = 0;
        }
        
        // Play death sound
        if (this.audio) {
            this.audio.playSound('playerDeath');
        }
        
        this.ui.showDeathModal();
    }

    handleLocalPlayerRespawn() {
        this.isDead = false;
        this.updateCamera(true);
        this.ui.hideDeathModal();
        
        setTimeout(() => {
            const player = this.players.get(this.myId);
            if (player) {
                player.isRespawning = false;
            }
        }, 1000);
    }

    addExplosion(x, y, type = 'hit') {
        const explosion = {
            x,
            y,
            type,
            startTime: Date.now(),
            duration: 500, // 500ms explosion (was 300ms)
            size: type === 'wall' ? 35 : 40 // Larger explosions
        };
        this.explosions.push(explosion);
        
        // Play explosion sound
        if (this.audio) {
            this.audio.playSound(type === 'wall' ? 'spellHit' : 'spellExplode');
        }
        
        console.log('Added explosion:', explosion); // Debug log
    }

    updateExplosions(deltaTime) {
        const currentTime = Date.now();
        // Use a more efficient cleanup approach
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            const age = currentTime - explosion.startTime;
            if (age >= explosion.duration) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // Start network connection with player name
    startNetworkWithName(playerName) {
        this.playerName = playerName;
        this.network = new NetworkSystem(this);
        
        // Send player name to server
        if (this.network && this.network.socket) {
            this.network.socket.emit('setPlayerName', { name: playerName });
        }
    }
}

// Store game instance for cleanup
let gameInstance = null;

// Global theme switching function
window.switchTheme = function(themeName) {
    if (gameInstance && GAME_CONFIG.themes[themeName]) {
        gameInstance.switchTheme(themeName);
        // Update page title to show current theme
        const theme = GAME_CONFIG.themes[themeName];
        document.title = `Cast Arena - ${theme.name}`;
    } else {
        console.log('Available themes:', Object.keys(GAME_CONFIG.themes).filter(k => k !== 'current'));
    }
};

// Start the game when the window loads
window.addEventListener('load', () => {
    // Show welcome modal instead of starting game immediately
    showWelcomeModal();
});

// Welcome modal functions
function showWelcomeModal() {
    // Check if we have a stored name
    const storedName = localStorage.getItem('castArenaPlayerName');
    if (storedName) {
        // Skip modal and start game directly with stored name
        startGameWithName(storedName);
        return;
    }
    
    const modal = document.getElementById('welcomeModal');
    const nameInput = document.getElementById('playerNameInput');
    const startBtn = document.getElementById('startGameBtn');
    
    if (modal && nameInput && startBtn) {
        modal.style.display = 'block';
        
        // Focus on name input
        setTimeout(() => nameInput.focus(), 100);
        
        // Handle start game button
        startBtn.addEventListener('click', startGame);
        
        // Handle enter key in name input
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startGame();
            }
        });
        
        // Auto-generate a name as placeholder
        const adjectives = ['Swift', 'Mighty', 'Wise', 'Brave', 'Noble', 'Fierce', 'Clever', 'Bold', 'Quick', 'Strong'];
        const nouns = ['Wizard', 'Mage', 'Sorcerer', 'Enchanter', 'Warlock', 'Mystic', 'Arcane', 'Scholar', 'Master', 'Sage'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        nameInput.placeholder = `e.g. ${adjective} ${noun}`;
    }
}

function startGame() {
    const nameInput = document.getElementById('playerNameInput');
    const modal = document.getElementById('welcomeModal');
    
    let playerName = nameInput.value.trim();
    
    // If no name provided, generate one
    if (!playerName) {
        const adjectives = ['Swift', 'Mighty', 'Wise', 'Brave', 'Noble', 'Fierce', 'Clever', 'Bold', 'Quick', 'Strong'];
        const nouns = ['Wizard', 'Mage', 'Sorcerer', 'Enchanter', 'Warlock', 'Mystic', 'Arcane', 'Scholar', 'Master', 'Sage'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        playerName = `${adjective} ${noun}`;
    }
    
    // Hide modal
    modal.style.display = 'none';
    
    startGameWithName(playerName);
}

function startGameWithName(playerName) {
    // Store name in localStorage
    localStorage.setItem('castArenaPlayerName', playerName);
    
    // Start the game
    if (gameInstance) {
        gameInstance.destroy();
    }
    gameInstance = new Game();
    gameInstance.startNetworkWithName(playerName);
    
    // Update page title with current theme
    const currentTheme = GAME_CONFIG.themes[GAME_CONFIG.themes.current];
    document.title = `Cast Arena - ${currentTheme.name}`;
    
    // Log theme info
    console.log(`🎨 Current theme: ${currentTheme.name}`);
    console.log('💡 Switch themes by typing: switchTheme("fortress") or switchTheme("woods")');
    
    // Update the name change input in settings if it exists
    const nameChangeInput = document.getElementById('nameChangeInput');
    if (nameChangeInput) {
        nameChangeInput.value = playerName;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameInstance) {
        gameInstance.destroy();
        gameInstance = null;
    }
});
