const gameConfig = require('../../config/gameConfig');

class Player {
    constructor(id) {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.color = this.getRandomColor();
        this.health = gameConfig.player.maxHealth;
        this.maxHealth = gameConfig.player.maxHealth;
        this.kills = 0;
        this.isBurning = false;
        this.burnEndTime = 0;
        this.isAlive = true;
        this.facingLeft = false;
        this.hasSpawned = false;
        this.respawnImmunity = false;
        this.spawnProtection = false;
    }

    getRandomColor() {
        return gameConfig.colors[Math.floor(Math.random() * gameConfig.colors.length)];
    }

    respawn() {
        this.health = this.maxHealth;
        this.x = Math.random() * gameConfig.world.width;
        this.y = Math.random() * gameConfig.world.height;
        this.isBurning = false;
        this.isAlive = true;
        this.burnEndTime = 0;
        this.respawnImmunity = true;
        this.spawnProtection = true;

        if (this.hasSpawned) {
            this.kills = 0;
        } else {
            this.hasSpawned = true;
        }

        return {
            id: this.id,
            x: this.x,
            y: this.y,
            health: this.health,
            kills: this.kills,
            isAlive: this.isAlive
        };
    }

    takeDamage(amount) {
        if (!this.isAlive || this.spawnProtection) return false;
        
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.isAlive = false;
        }
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            color: this.color,
            health: this.health,
            maxHealth: this.maxHealth,
            kills: this.kills,
            isBurning: this.isBurning,
            burnEndTime: this.burnEndTime,
            isAlive: this.isAlive,
            facingLeft: this.facingLeft
        };
    }
}

module.exports = Player;
