import { GAME_CONFIG } from '../config/gameConfig.js';

export class ManaItem {
    constructor(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.type = data.type;
        this.size = data.size || 25; // Larger size for visibility
        this.pickupRadius = data.pickupRadius || 30;
        this.color = data.color || '#0080FF'; // Bright blue
        this.manaRestore = data.manaRestore;
        // Use server-provided animationOffset or generate new one if missing
        this.animationOffset = data.animationOffset !== undefined ? data.animationOffset : Math.random() * Math.PI * 2;
    }

    // Check if item is close enough to a player for pickup
    isCollidingWithPlayer(playerX, playerY, playerRadius = 20) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.pickupRadius + playerRadius);
    }

    isInViewport(cameraX, cameraY, viewportWidth = null, viewportHeight = null) {
        const vpWidth = viewportWidth || GAME_CONFIG.viewport.getWidth();
        const vpHeight = viewportHeight || GAME_CONFIG.viewport.getHeight();
        return this.x > cameraX - this.size &&
               this.x < cameraX + vpWidth + this.size &&
               this.y > cameraY - this.size &&
               this.y < cameraY + vpHeight + this.size;
    }
}
