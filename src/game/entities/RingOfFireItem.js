const gameConfig = require('../../config/gameConfig');

class RingOfFireItem {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = 'ringOfFire';
        this.size = 30;
        this.pickupRadius = 35;
        this.color = '#FF4500'; // Orange-red fire color
        this.createdAt = Date.now();
    }

    // Check if item is close enough to a player for pickup
    isCollidingWithPlayer(playerX, playerY, playerRadius = 20) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.pickupRadius + playerRadius);
    }

    // Convert to data for client
    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            type: this.type,
            size: this.size,
            pickupRadius: this.pickupRadius,
            color: this.color
        };
    }
}

module.exports = RingOfFireItem;
