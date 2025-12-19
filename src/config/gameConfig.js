const gameConfig = {
    world: {
        width: 800 * 3,
        height: 600 * 3
    },
    player: {
        maxHealth: 100,
        maxMana: 50,
        manaRegenRate: 2, // mana per second
        spawnProtectionDuration: 2000,
        respawnDelay: 3000,
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
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
};

module.exports = gameConfig;
