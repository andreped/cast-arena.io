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
    themes: {
        current: Math.random() > 0.66 ? 'fortress' : (Math.random() > 0.5 ? 'woods' : 'winter'), // Randomly select theme at start
        fortress: {
            name: 'Fortress',
            description: 'Ancient stone fortress with gray walls',
            background: 'linear-gradient(45deg, #1e3c72, #2a5298)',
            worldBoundaryColor: '#444',
            gridColor: 'rgba(255, 255, 255, 0.1)',
            walls: {
                stone: {
                    baseColor: '#666666',
                    edgeColor: '#888888',
                    shadowColor: '#333333'
                },
                house: {
                    baseColor: '#8B4513',
                    edgeColor: '#A0522D',
                    shadowColor: '#654321'
                },
                window: {
                    baseColor: '#708090',
                    edgeColor: '#9370DB',
                    shadowColor: '#2F4F4F'
                },
                L: {
                    baseColor: '#696969',
                    edgeColor: '#808080',
                    shadowColor: '#2F2F2F'
                },
                perimeter: {
                    baseColor: '#4A4A4A',
                    edgeColor: '#555555',
                    shadowColor: '#2A2A2A'
                }
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
                }
            }
        },
        woods: {
            name: 'Enchanted Woods',
            description: 'Mystical forest with ancient trees',
            background: 'linear-gradient(45deg, #1a4a2e, #4a7c59)',
            worldBoundaryColor: '#2d5a2d',
            gridColor: 'rgba(144, 238, 144, 0.15)',
            walls: {
                // Different wood types for variety - more natural, muted tones
                oakWood: {
                    baseColor: '#8B4513',
                    edgeColor: '#A0522D',
                    shadowColor: '#654321'
                },
                darkOak: {
                    baseColor: '#654321',
                    edgeColor: '#8B4513',
                    shadowColor: '#4A2C17'
                },
                weatheredWood: {
                    baseColor: '#8B7355',
                    edgeColor: '#A0845C',
                    shadowColor: '#6B5B47'
                },
                ageWood: {
                    baseColor: '#7A5230',
                    edgeColor: '#8B5A3C',
                    shadowColor: '#5A3E22'
                },
                perimeter: {
                    baseColor: '#3D2914',
                    edgeColor: '#4A2C17',
                    shadowColor: '#2A1B0F'
                }
            },
            floor: {
                tileSize: 20,
                patterns: {
                    grass: {
                        baseColor: '#2d5a2d',
                        variants: ['#255025', '#356535', '#1e4a1e'],
                        weight: 0.6
                    },
                    darkGrass: {
                        baseColor: '#1a3a1a',
                        variants: ['#143014', '#1f451f', '#0f2f0f'],
                        weight: 0.25
                    },
                    moss: {
                        baseColor: '#4a6b4a',
                        variants: ['#3d5a3d', '#577757', '#415541'],
                        weight: 0.1
                    },
                    earth: {
                        baseColor: '#654321',
                        variants: ['#5d3c1e', '#7a4f24', '#583218'],
                        weight: 0.05
                    }
                }
            }
        },
        winter: {
            name: 'Frozen Wasteland',
            description: 'Icy battlefield with snow and frozen wood',
            background: 'linear-gradient(45deg, #2c5aa0, #87ceeb)',
            worldBoundaryColor: '#1e3a5f',
            gridColor: 'rgba(173, 216, 230, 0.2)',
            walls: {
                // Dark wood types for winter theme
                frozenOak: {
                    baseColor: '#4A4A4A',
                    edgeColor: '#5A5A5A',
                    shadowColor: '#2A2A2A'
                },
                darkWood: {
                    baseColor: '#3C3C3C',
                    edgeColor: '#4D4D4D',
                    shadowColor: '#1C1C1C'
                },
                weatheredWood: {
                    baseColor: '#555555',
                    edgeColor: '#666666',
                    shadowColor: '#333333'
                },
                iceWood: {
                    baseColor: '#6B7B8C',
                    edgeColor: '#7B8B9C',
                    shadowColor: '#4B5B6C'
                },
                perimeter: {
                    baseColor: '#1C3A5C',
                    edgeColor: '#2C4A6C',
                    shadowColor: '#0C2A4C'
                }
            },
            floor: {
                tileSize: 20,
                patterns: {
                    freshSnow: {
                        baseColor: '#FFFFFF',
                        variants: ['#FEFEFE', '#FFFFFF', '#F8F8FF'],
                        weight: 0.4
                    },
                    deepSnow: {
                        baseColor: '#F0F8FF',
                        variants: ['#E6F3FF', '#F5FAFF', '#DDEEFF'],
                        weight: 0.3
                    },
                    ice: {
                        baseColor: '#B0E0E6',
                        variants: ['#87CEEB', '#B0C4DE', '#ADD8E6'],
                        weight: 0.2
                    },
                    packedSnow: {
                        baseColor: '#E0E8F0',
                        variants: ['#D5DDE5', '#C8D0D8', '#BEBEBE'],
                        weight: 0.1
                    }
                }
            }
        }
    },
    floor: {
        get tileSize() { return GAME_CONFIG.themes[GAME_CONFIG.themes.current].floor.tileSize; },
        get patterns() { return GAME_CONFIG.themes[GAME_CONFIG.themes.current].floor.patterns; },
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
