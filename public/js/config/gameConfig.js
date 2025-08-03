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
        speed: 3,
        size: 20,
        maxHealth: 100
    },
    spell: {
        size: 8,
        speed: 200,
        damage: 20
    },
    mobile: {
        fireDelay: 300
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
        seed: 42
    }
};
