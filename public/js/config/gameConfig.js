export const GAME_CONFIG = {
    canvas: {
        width: 800,  // Default/fallback values
        height: 600,
        dynamicViewport: true,  // Enable dynamic viewport sizing
        minWidth: 800,  // Minimum viewport width (prevents zoom abuse)
        minHeight: 600, // Minimum viewport height (prevents zoom abuse)
        maxWidth: 1920, // Maximum viewport width for fairness
        maxHeight: 1080 // Maximum viewport height for fairness
    },
    world: {
        width: 800 * 4.5,  // Increased by 50% (was 800 * 3 = 2400, now 3600)
        height: 600 * 4.5, // Increased by 50% (was 600 * 3 = 1800, now 2700)
        viewportPadding: 100
    },
    player: {
        speed: 180, // pixels per second (was 3 pixels per frame * 60 FPS)
        size: 20,
        maxHealth: 100,
        maxMana: 50,
        // Smooth movement physics
        acceleration: 800, // pixels per second² - how fast player accelerates
        deceleration: 1200, // pixels per second² - how fast player stops when no input
        airResistance: 0.85 // friction factor when coasting (not used for now but available)
    },
    spell: {
        size: 8,
        speed: 400,
        damage: 20,
        manaCost: 5,
        recoilForce: 300
    },
    mobile: {
        fireDelay: 300
    },
    server: {
        tickRate: 20, // Server updates per second (20 TPS = 50ms intervals)
        maxTickRate: 60, // Maximum for high-performance mode
        networkUpdateRate: 30 // Network broadcasts per second
    },
    grid: {
        size: 40,
        opacity: 0.1
    },
    floor: {
        tileSize: 20,
        patterns: {
            stone: {
                baseColor: '#2a2a2a',
                variants: ['#252525', '#2f2f2f', '#222222'],
                weight: 0.7
            },
            darkStone: {
                baseColor: '#1a1a1a',
                variants: ['#1f1f1f', '#151515', '#202020'],
                weight: 0.2
            },
            accent: {
                baseColor: '#3a3a3a',
                variants: ['#353535', '#404040', '#333333'],
                weight: 0.1
            }
        },
        seed: Math.floor(Math.random() * 1000000) // Random seed for each page load
    },
    audio: {
        enabled: true,
        sounds: {
            // Spell sounds
            spellCast: 'assets/sounds/sfx/fireball-cast.wav',
            ringOfFireCast: 'assets/sounds/sfx/ring-of-fire-cast.wav',
            spellHit: 'assets/sounds/sfx/spell-hit.wav',
            spellExplode: 'assets/sounds/sfx/explosion.wav',
            
            // Player sounds
            playerDeath: 'assets/sounds/sfx/explosion.wav', // Reuse explosion for death
            playerRespawn: 'assets/sounds/sfx/respawn.wav',
            
            // Item pickup sounds
            pickupMana: 'assets/sounds/sfx/pickup-mana.wav',
            pickupSpeed: 'assets/sounds/sfx/pickup-speed.ogg',
            pickupRingOfFire: 'assets/sounds/sfx/pickup-ring-of-fire.wav',
            
            // UI sounds
            insufficientMana: 'assets/sounds/sfx/no-mana.wav',
            killSound: 'assets/sounds/sfx/kill.wav'
        },
        music: {
            background: 'assets/sounds/music/background.wav'
        }
    },
    // Dynamic viewport utilities
    viewport: {
        getWidth() {
            if (!GAME_CONFIG.canvas.dynamicViewport) {
                return GAME_CONFIG.canvas.width;
            }
            const rawWidth = window.innerWidth;
            // Enforce minimum and maximum to prevent zoom abuse
            return Math.min(GAME_CONFIG.canvas.maxWidth, 
                   Math.max(GAME_CONFIG.canvas.minWidth, rawWidth));
        },
        getHeight() {
            if (!GAME_CONFIG.canvas.dynamicViewport) {
                return GAME_CONFIG.canvas.height;
            }
            const rawHeight = window.innerHeight - 60; // Subtract 60px for bottom UI
            // Enforce minimum and maximum to prevent zoom abuse
            return Math.min(GAME_CONFIG.canvas.maxHeight, 
                   Math.max(GAME_CONFIG.canvas.minHeight, rawHeight));
        },
        getAspectRatio() {
            return this.getWidth() / this.getHeight();
        },
        // Get effective FOV (field of view) area
        getFOVArea() {
            return this.getWidth() * this.getHeight();
        }
    }
};
