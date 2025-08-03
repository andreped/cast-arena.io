class SpeedItem {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = 'speed';
        this.speedBoost = 0.5; // 50% speed increase
        this.duration = 20000; // 20 seconds in milliseconds
        this.size = 15; // Visual size
        this.createdAt = Date.now();
    }

    // Check if item is close enough to a player for pickup
    isCollidingWithPlayer(playerX, playerY, playerRadius = 20) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + playerRadius);
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            type: this.type,
            size: this.size,
            speedBoost: this.speedBoost,
            duration: this.duration
        };
    }
}

module.exports = SpeedItem;
