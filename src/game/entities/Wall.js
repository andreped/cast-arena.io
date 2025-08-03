class Wall {
    constructor(id, type, x, y, width, height, segments = []) {
        this.id = id;
        this.type = type; // 'line', 'L', 'house', 'window'
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.segments = segments; // Array of wall segments with their properties
        this.hasWindows = type === 'window';
    }

    // Check if a point collides with this wall
    collidesWith(x, y, radius = 0) {
        // For walls with windows, check each segment individually
        if (this.hasWindows || this.segments.length > 0) {
            return this.segments.some(segment => 
                this.pointInRectangle(x, y, radius, segment)
            );
        }
        
        // For simple rectangular walls
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

    // Check if a line (like a spell trajectory) intersects this wall
    intersectsLine(x1, y1, x2, y2) {
        if (this.hasWindows || this.segments.length > 0) {
            return this.segments.some(segment => 
                this.lineIntersectsRectangle(x1, y1, x2, y2, segment)
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
        // Check if line intersects any of the four sides of the rectangle
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

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            segments: this.segments,
            hasWindows: this.hasWindows
        };
    }
}

module.exports = Wall;
