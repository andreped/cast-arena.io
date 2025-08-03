const SpeedItem = require('../entities/SpeedItem');
const gameConfig = require('../../config/gameConfig');

class ItemSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.items = new Map();
        this.maxSpeedItems = 8;
        this.spawnInterval = 15000; // 15 seconds
        this.lastSpawnTime = 0;
        this.seed = 54321; // Different seed from walls
    }

    // Seeded random number generator
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    update() {
        const currentTime = Date.now();
        
        // Spawn new speed items if needed
        if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
            this.trySpawnSpeedItem();
            this.lastSpawnTime = currentTime;
        }

        // Check for item pickups
        this.checkItemPickups();
    }

    trySpawnSpeedItem() {
        // Count current speed items
        const speedItemCount = Array.from(this.items.values())
            .filter(item => item.type === 'speed').length;

        if (speedItemCount >= this.maxSpeedItems) {
            return; // Max items reached
        }

        const position = this.findSafeItemSpawnPosition();
        if (position) {
            const itemId = `speed_${Date.now()}_${Math.floor(this.seededRandom() * 1000)}`;
            const item = new SpeedItem(itemId, position.x, position.y);
            
            this.items.set(itemId, item);
            console.log(`Spawned speed item at (${position.x}, ${position.y})`);
            
            // Check if any player is already at this position for immediate pickup
            this.checkImmediatePickup(item);
        }
    }

    findSafeItemSpawnPosition() {
        const maxAttempts = 50;
        const itemRadius = 15;
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
        for (const [itemId, item] of this.items) {
            for (const [playerId, player] of this.gameState.players) {
                if (player.isAlive && item.isCollidingWithPlayer(player.x, player.y)) {
                    this.pickupItem(playerId, item.id);
                    break;
                }
            }
        }
    }

    pickupItem(playerId, itemId) {
        const item = this.items.get(itemId);
        const player = this.gameState.getPlayer(playerId);

        if (!item || !player) return;

        // Apply item effect based on type
        if (item.type === 'speed') {
            player.addSpeedBuff(item.speedBoost, item.duration);
            console.log(`Player ${playerId} picked up speed item (+${item.speedBoost * 100}% speed for ${item.duration/1000}s)`);
        }

        // Remove item from world
        this.items.delete(itemId);

        return {
            playerId,
            itemId,
            itemType: item.type,
            effect: item.speedBoost
        };
    }

    removeItem(itemId) {
        this.items.delete(itemId);
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
}

module.exports = ItemSystem;
