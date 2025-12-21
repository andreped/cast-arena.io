class Tree {
    constructor(x, y, type = 'oak') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = `tree_${x}_${y}`;
        
        // Standard tree dimensions (theme-specific sizes will be handled client-side)
        this.width = 80;
        this.height = 90;
        
        // Collision properties
        this.isCollidable = true;
    }

    // Check collision with entity
    isCollidingWith(entity, entityRadius = 10) {
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use a collision radius that's consistent with walls
        const collisionRadius = Math.min(this.width, this.height) / 3;
        return distance < (collisionRadius + entityRadius);
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
}

module.exports = Tree;