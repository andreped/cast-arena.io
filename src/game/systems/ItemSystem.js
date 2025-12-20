const SpeedItem = require('../entities/SpeedItem');
const ManaItem = require('../entities/ManaItem');
const RingOfFireItem = require('../entities/RingOfFireItem');
const gameConfig = require('../../config/gameConfig');

class ItemSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.items = new Map();
        this.seed = Math.floor(Math.random() * 1000000); // Random seed for each server startup
        this.itemsChanged = false; // Track if items have changed since last broadcast
        
        // Item type configurations - easily extendable for future items
        this.itemConfigs = {
            speed: {
                maxItems: 12,
                spawnInterval: 5000, // 5 seconds for testing
                entityClass: SpeedItem,
                lastSpawnTime: 0
            },
            mana: {
                maxItems: 5, // Rarer than speed items
                spawnInterval: 5000,
                entityClass: ManaItem,
                lastSpawnTime: 0
            },
            ringOfFire: {
                maxItems: 3, // Very rare - only 2 at a time
                spawnInterval: 5000,
                entityClass: RingOfFireItem,
                lastSpawnTime: 0
            }
            // Future items can be added here:
            // health: { maxItems: 5, spawnInterval: 20000, entityClass: HealthItem, lastSpawnTime: 0 },
            // shield: { maxItems: 3, spawnInterval: 30000, entityClass: ShieldItem, lastSpawnTime: 0 }
        };
        
        // Spawn initial items immediately
        this.spawnInitialItems();
    }

    // Seeded random number generator
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Spawn some initial items when server starts
    spawnInitialItems() {
        console.log('Spawning initial items...');
        for (const [itemType, config] of Object.entries(this.itemConfigs)) {
            // Spawn half the max items initially
            const initialCount = Math.floor(config.maxItems / 2);
            for (let i = 0; i < initialCount; i++) {
                this.trySpawnItem(itemType, config);
            }
        }
    }

    update() {
        const currentTime = Date.now();
        
        // Check spawning for each item type
        for (const [itemType, config] of Object.entries(this.itemConfigs)) {
            if (currentTime - config.lastSpawnTime >= config.spawnInterval) {
                this.trySpawnItem(itemType, config);
                config.lastSpawnTime = currentTime;
            }
        }

        // Check for item pickups
        this.checkItemPickups();
    }

    trySpawnItem(itemType, config) {
        // Count current items of this type
        const itemCount = Array.from(this.items.values())
            .filter(item => item.type === itemType).length;

        if (itemCount >= config.maxItems) {
            return; // Max items reached
        }

        const position = this.findSafeItemSpawnPosition();
        if (position) {
            const itemId = `${itemType}_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
            const item = new config.entityClass(itemId, position.x, position.y);
            
            this.items.set(itemId, item);
            this.markItemsChanged(); // Mark for network update
            console.log(`Spawned ${itemType} item at (${position.x}, ${position.y})`);
            
            // Check if any player is already at this position for immediate pickup
            this.checkImmediatePickup(item);
        }
    }

    findSafeItemSpawnPosition() {
        const maxAttempts = 50;
        const itemRadius = 40; // Updated to match new pickup radius
        const margin = itemRadius + 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = margin + this.seededRandom() * (gameConfig.world.width - 2 * margin);
            const y = margin + this.seededRandom() * (gameConfig.world.height - 2 * margin);

            // Check if position collides with walls
            if (!this.gameState.checkWallCollision(x, y, itemRadius)) {
                return { x, y };
            }
        }

        console.log('Failed to find safe spawn position for item');
        return null;
    }

    checkImmediatePickup(item) {
        // Check if item spawned inside any player
        for (const [playerId, player] of this.gameState.players) {
            if (player.isAlive && item.isCollidingWithPlayer(player.x, player.y)) {
                this.pickupItem(playerId, item.id);
                break;
            }
        }
    }

    checkItemPickups() {
        const pickupsThisFrame = [];
        
        for (const [itemId, item] of this.items) {
            for (const [playerId, player] of this.gameState.players) {
                if (player.isAlive && item.isCollidingWithPlayer(player.x, player.y)) {
                    const pickup = this.pickupItem(playerId, item.id);
                    if (pickup) {
                        pickupsThisFrame.push(pickup);
                    }
                    break; // Item picked up, no need to check other players
                }
            }
        }
        
        return pickupsThisFrame; // Return pickups for potential broadcasting
    }

    pickupItem(playerId, itemId) {
        const item = this.items.get(itemId);
        const player = this.gameState.getPlayer(playerId);

        if (!item || !player) return;

        // Apply item effect based on type
        let effectValue;
        if (item.type === 'speed') {
            player.addSpeedBuff(item.speedBoost, item.duration);
            effectValue = item.speedBoost;
            console.log(`Player ${playerId} picked up speed item (+${item.speedBoost * 100}% speed for ${item.duration/1000}s)`);
        } else if (item.type === 'mana') {
            const manaRestored = player.restoreMana(item.manaRestore);
            effectValue = manaRestored;
            console.log(`Player ${playerId} picked up mana item (+${manaRestored} mana)`);
        } else if (item.type === 'ringOfFire') {
            // Ring of Fire doesn't stack - cap at 1 charge
            if (player.ringOfFireCharges >= 1) {
                console.log(`Player ${playerId} tried to pick up Ring of Fire but already has maximum charges (${player.ringOfFireCharges})`);
                return; // Don't pick up the item if already at max
            }
            player.ringOfFireCharges = 1;
            effectValue = 1;
            console.log(`Player ${playerId} picked up Ring of Fire item (charges: ${player.ringOfFireCharges})`);
        }

        // Remove item from world
        this.items.delete(itemId);
        this.markItemsChanged(); // Mark for network update

        return {
            playerId,
            itemId,
            itemType: item.type,
            effect: effectValue
        };
    }

    removeItem(itemId) {
        this.items.delete(itemId);
        this.markItemsChanged(); // Mark for network update
    }

    getItemsInArea(x, y, width, height) {
        const itemsInArea = [];
        for (const [id, item] of this.items) {
            if (item.x >= x && item.x <= x + width &&
                item.y >= y && item.y <= y + height) {
                itemsInArea.push(item);
            }
        }
        return itemsInArea;
    }

    getAllItems() {
        const items = {};
        for (const [id, item] of this.items) {
            items[id] = item.toJSON();
        }
        return items;
    }

    // Optimization methods for change tracking
    hasItemsChanged() {
        return this.itemsChanged;
    }

    resetChangeFlag() {
        this.itemsChanged = false;
    }

    markItemsChanged() {
        this.itemsChanged = true;
    }
}

module.exports = ItemSystem;
