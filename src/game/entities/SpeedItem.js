class SpeedItem {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = 'speed';
        this.speedBoost = 0.5; // 50% speed increase
        this.duration = 20000; // 20 seconds in milliseconds
        this.size = 10; // Increased visual size for better visibility
        this.pickupRadius = 40; // Larger pickup radius for easier collection
        this.color = '#00FF00'; // Bright green color
        this.createdAt = Date.now();
        this.animationOffset = Math.random() * Math.PI * 2; // Random animation offset for smooth animation
    }

    // Check if item is close enough to a player for pickup
    isCollidingWithPlayer(playerX, playerY, playerRadius = 20) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.pickupRadius + playerRadius);
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            type: this.type,
            size: this.size,
            pickupRadius: this.pickupRadius,
            color: this.color,
            speedBoost: this.speedBoost,
            duration: this.duration,
            animationOffset: this.animationOffset
        };
    }
}

module.exports = SpeedItem;
