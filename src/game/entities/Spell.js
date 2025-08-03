const gameConfig = require('../../config/gameConfig');

class Spell {
    constructor(id, casterId, x, y, targetX, targetY, angle) {
        this.id = id;
        this.casterId = casterId;
        this.type = 'fireball';
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.angle = angle || Math.atan2(targetY - y, targetX - x);
        this.speed = gameConfig.spells.fireball.speed;
        this.damage = gameConfig.spells.fireball.damage;
        this.createdAt = Date.now();
        this.trail = [];
    }

    toJSON() {
        return {
            id: this.id,
            casterId: this.casterId,
            type: this.type,
            x: this.x,
            y: this.y,
            targetX: this.targetX,
            targetY: this.targetY,
            angle: this.angle,
            speed: this.speed,
            damage: this.damage,
            createdAt: this.createdAt,
            trail: this.trail
        };
    }
}

module.exports = Spell;
