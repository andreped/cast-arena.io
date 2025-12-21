import { GAME_CONFIG } from '../config/gameConfig.js';

export class Tree {
    constructor(x, y, type = 'oak') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = `tree_${x}_${y}`;
        
        // Get tree config from current theme
        const currentTheme = GAME_CONFIG.themes[GAME_CONFIG.themes.current];
        this.config = currentTheme.trees[type] || currentTheme.trees[Object.keys(currentTheme.trees)[0]];
        
        // Tree properties
        this.width = this.config.width || 20;
        this.height = this.config.height || 25;
        this.trunkHeight = Math.floor(this.height * 0.4); // Trunk is 40% of total height
        this.crownHeight = this.height - this.trunkHeight;
        this.trunkWidth = Math.floor(this.width * 0.3); // Trunk is 30% of total width
        
        // Collision properties (same as walls for gameplay)
        this.isCollidable = true;
    }

    // Check collision with player or spell
    isCollidingWith(entity, entityRadius = 10) {
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use a collision radius that's slightly smaller than visual size
        const collisionRadius = Math.min(this.width, this.height) / 3;
        return distance < (collisionRadius + entityRadius);
    }

    // Check if tree is in viewport for rendering optimization
    isInViewport(cameraX, cameraY, viewportWidth = 800, viewportHeight = 600) {
        const margin = 50; // Render trees slightly outside viewport
        return (
            this.x >= cameraX - margin &&
            this.x <= cameraX + viewportWidth + margin &&
            this.y >= cameraY - margin &&
            this.y <= cameraY + viewportHeight + margin
        );
    }

    // Get tree data for network synchronization
    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            type: this.type,
            width: this.width,
            height: this.height
        };
    }

    // Create tree from network data
    static fromJSON(data) {
        const tree = new Tree(data.x, data.y, data.type);
        if (data.width) tree.width = data.width;
        if (data.height) tree.height = data.height;
        return tree;
    }
}