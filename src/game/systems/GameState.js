const Player = require('../entities/Player');
const Spell = require('../entities/Spell');
const WallSystem = require('./WallSystem');
const ItemSystem = require('./ItemSystem');
const BotManager = require('../ai/BotManager');
const gameConfig = require('../../config/gameConfig');

class GameState {
    constructor(io = null) {
        this.players = new Map();
        this.spells = new Map();
        this.burnEffects = new Map();
        this.wallSystem = new WallSystem();
        this.itemSystem = new ItemSystem(this);
        this.io = io; // Store io for later bot manager initialization
        this.botManager = null; // Will be initialized after io is set
    }
    
    // Initialize bot manager with io instance
    initializeBots(io) {
        this.io = io;
        this.botManager = new BotManager(this, io);
    }

    addPlayer(socketId) {
        const player = new Player(socketId);
        this.players.set(socketId, player);
        return player;
    }

    // Get a safe spawn position for a player
    getSafeSpawnPosition() {
        return this.wallSystem.findSafeSpawnPosition(gameConfig.world.width, gameConfig.world.height, 25);
    }

    // Alias for compatibility
    findSafeSpawnPosition() {
        return this.getSafeSpawnPosition();
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

    // Create spell from data (for bot system)
    createSpell(spellData) {
        return this.castSpell(
            spellData.playerId,
            spellData.x,
            spellData.y,
            spellData.x + Math.cos(spellData.angle) * 100,
            spellData.y + Math.sin(spellData.angle) * 100,
            spellData.angle
        );
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

    getTreeState() {
        return this.wallSystem.getTreesState();
    }

    checkWallCollision(x, y, radius = 0) {
        return this.wallSystem.checkCollision(x, y, radius);
    }

    checkWallLineCollision(x1, y1, x2, y2) {
        return this.wallSystem.checkLineCollision(x1, y1, x2, y2);
    }

    // Update all game systems
    update() {
        const deltaTime = 50; // Server tick rate in ms
        
        // Update player buffs, mana, and spawn protection
        for (const [id, player] of this.players) {
            player.updateSpeedBuffs();
            player.updateMana();
            player.updateSpawnProtection();
        }

        // Update item system (spawning, pickups, etc.)
        this.itemSystem.update();
        
        // Note: Bots now have their own high-frequency update loop (60 FPS)
        // The botManager.update() here is kept for compatibility but bots update independently
    }

    // Get current items state
    getItemsState() {
        return this.itemSystem.getAllItems();
    }

    // Handle item pickup
    pickupItem(playerId, itemId) {
        return this.itemSystem.pickupItem(playerId, itemId);
    }

    // Get only players with active speed buffs (optimization)
    getPlayersWithActiveBuffs() {
        const playersWithBuffs = {};
        for (const [id, player] of this.players) {
            if (player.currentSpeedMultiplier > 1.0) {
                playersWithBuffs[id] = player.toJSON();
            }
        }
        return playersWithBuffs;
    }
}

module.exports = GameState;
