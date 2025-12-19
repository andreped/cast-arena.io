export const GAME_CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    world: {
        width: 800 * 3,
        height: 600 * 3,
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
    }
};
