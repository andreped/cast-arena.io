const gameConfig = {
    world: {
        width: 800 * 4.5,  // Increased by 50% (was 800 * 3 = 2400, now 3600)
        height: 600 * 4.5  // Increased by 50% (was 600 * 3 = 1800, now 2700)
    },
    theme: {
        // Server-side theme selection - all players see the same theme
        current: Math.random() > 0.66 ? 'fortress' : (Math.random() > 0.5 ? 'woods' : 'winter')
    },
    player: {
        maxHealth: 100,
        maxMana: 50,
        manaRegenRate: 2, // mana per second
        spawnProtectionDuration: 2000,
        respawnDelay: 3000,
        size: 20, // Player collision radius
        speed: 180, // Base movement speed (pixels per second) - matches client
        // Smooth movement physics (for reference, mainly handled client-side)
        acceleration: 800, // pixels per second²
        deceleration: 1200, // pixels per second²
        airResistance: 0.85 // friction factor
    },
    spells: {
        fireball: {
            speed: 400,
            damage: 20,
            manaCost: 5,
            recoilForce: 300
        }
    },
    burnEffect: {
        duration: 10000,
        tickDamage: 2,
        tickInterval: 1000
    },
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
    bots: {
        enabled: true,
        count: 8, // Number of bots in game
        
        // Easy AI settings
        visionRange: 400,        // How far bots can see
        visionAngle: 120,        // Vision cone angle in degrees
        reactionTimeMs: 400,     // Delay before shooting
        shootCooldownMs: 500,    // Time between shots (reduced from 1000ms)
        accuracy: 0.75,          // 75% accuracy (some misses)
        wanderSpeed: 0.7,        // Speed multiplier when wandering
        
        // Behavior
        itemScanRadius: 300,     // How far bots detect items
        wanderChangeInterval: 2500, // Change direction every 2.5s
        minShootDistance: 100,   // Don't shoot if too close
        maxShootDistance: 400,   // Max shooting range
        
        // Bot names
        names: [
            'Wanderer', 'Nomad', 'Seeker', 'Rover', 
            'Drifter', 'Scout', 'Ghost', 'Shadow',
            'Phantom', 'Specter', 'Wraith', 'Shade'
        ]
    }
};

module.exports = gameConfig;
