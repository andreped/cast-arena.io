const Player = require('../entities/Player');
const Spell = require('../entities/Spell');
const WallSystem = require('./WallSystem');
const gameConfig = require('../../config/gameConfig');

class GameState {
    constructor() {
        this.players = new Map();
        this.spells = new Map();
        this.burnEffects = new Map();
        this.wallSystem = new WallSystem();
    }

    addPlayer(socketId) {
        const player = new Player(socketId);
        this.players.set(socketId, player);
        return player;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        this.burnEffects.delete(socketId);
    }

    getPlayer(socketId) {
        return this.players.get(socketId);
    }

    castSpell(casterId, x, y, targetX, targetY, angle) {
        const spellId = Date.now() + '_' + casterId;
        const spell = new Spell(spellId, casterId, x, y, targetX, targetY, angle);
        this.spells.set(spellId, spell);
        return spell;
    }

    removeSpell(spellId) {
        this.spells.delete(spellId);
    }

    applyBurnEffect(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.isBurning = true;
        player.burnEndTime = Date.now() + gameConfig.burnEffect.duration;
        
        this.burnEffects.set(playerId, {
            endTime: player.burnEndTime,
            lastTick: Date.now()
        });
    }

    getCurrentState() {
        const state = {};
        for (const [id, player] of this.players) {
            state[id] = player.toJSON();
        }
        return state;
    }

    getSpellState() {
        const state = {};
        for (const [id, spell] of this.spells) {
            state[id] = spell.toJSON();
        }
        return state;
    }

    getWallState() {
        return this.wallSystem.getAllWalls();
    }

    checkWallCollision(x, y, radius = 0) {
        return this.wallSystem.checkCollision(x, y, radius);
    }

    checkWallLineCollision(x1, y1, x2, y2) {
        return this.wallSystem.checkLineCollision(x1, y1, x2, y2);
    }
}

module.exports = GameState;
