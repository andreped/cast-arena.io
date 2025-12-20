import { GAME_CONFIG } from '../config/gameConfig.js';

export class Wall {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.x = data.x;
        this.y = data.y;
        this.width = data.width;
        this.height = data.height;
        this.segments = data.segments || [];
        this.hasWindows = data.hasWindows || false;
    }

    // Check if a point collides with this wall
    collidesWith(x, y, radius = 0) {
        if (this.hasWindows || this.segments.length > 0) {
            return this.segments.some(segment => 
                this.pointInRectangle(x, y, radius, {
                    x: this.x + segment.x,
                    y: this.y + segment.y,
                    width: segment.width,
                    height: segment.height
                })
            );
        }
        
        return this.pointInRectangle(x, y, radius, {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        });
    }

    pointInRectangle(x, y, radius, rect) {
        return x + radius > rect.x && 
               x - radius < rect.x + rect.width && 
               y + radius > rect.y && 
               y - radius < rect.y + rect.height;
    }

    // Check if a line intersects this wall
    intersectsLine(x1, y1, x2, y2) {
        if (this.hasWindows || this.segments.length > 0) {
            return this.segments.some(segment => 
                this.lineIntersectsRectangle(x1, y1, x2, y2, {
                    x: this.x + segment.x,
                    y: this.y + segment.y,
                    width: segment.width,
                    height: segment.height
                })
            );
        }
        
        return this.lineIntersectsRectangle(x1, y1, x2, y2, {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        });
    }

    lineIntersectsRectangle(x1, y1, x2, y2, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        return this.lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom) ||
               this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
               this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
               this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom);
    }

    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return false;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    isInViewport(cameraX, cameraY, viewportWidth = null, viewportHeight = null) {
        const vpWidth = viewportWidth || GAME_CONFIG.viewport.getWidth();
        const vpHeight = viewportHeight || GAME_CONFIG.viewport.getHeight();
        return this.x < cameraX + vpWidth &&
               this.x + this.width > cameraX &&
               this.y < cameraY + vpHeight &&
               this.y + this.height > cameraY;
    }
}
