class ManaItem {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = 'mana';
        this.manaRestore = 25; // Restore 25 mana points
        this.size = 10; // Visual size for visibility
        this.pickupRadius = 40; // Pickup radius for easy collection
        this.color = '#0080FF'; // Bright blue color
        this.createdAt = Date.now();
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
            manaRestore: this.manaRestore
        };
    }
}

module.exports = ManaItem;
