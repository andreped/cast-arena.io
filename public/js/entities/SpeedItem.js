export class SpeedItem {
    constructor(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.type = data.type;
        this.size = data.size || 15;
        this.speedBoost = data.speedBoost;
        this.duration = data.duration;
        this.animationOffset = Math.random() * Math.PI * 2; // Random start for animation
    }

    // Check if item is close enough to a player for pickup
    isCollidingWithPlayer(playerX, playerY, playerRadius = 20) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + playerRadius);
    }

    isInViewport(cameraX, cameraY, viewportWidth = 800, viewportHeight = 600) {
        return this.x > cameraX - this.size &&
               this.x < cameraX + viewportWidth + this.size &&
               this.y > cameraY - this.size &&
               this.y < cameraY + viewportHeight + this.size;
    }
}
