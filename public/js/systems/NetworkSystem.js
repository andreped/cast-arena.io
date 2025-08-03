import { GAME_CONFIG } from '../config/gameConfig.js';
import { Player } from '../entities/Player.js';
import { Spell } from '../entities/Spell.js';

export class NetworkSystem {
    constructor(game) {
        this.game = game;
        this.socket = io();
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            this.game.myId = this.socket.id;
            console.log('Connected to server with ID:', this.game.myId);
        });

        this.socket.on('currentPlayers', this.handleCurrentPlayers.bind(this));
        this.socket.on('newPlayer', this.handleNewPlayer.bind(this));
        this.socket.on('playerMoved', this.handlePlayerMoved.bind(this));
        this.socket.on('playerPositionUpdate', this.handlePlayerPositionUpdate.bind(this));
        this.socket.on('forceSyncPlayer', this.handleForceSyncPlayer.bind(this));
        this.socket.on('playerDisconnected', this.handlePlayerDisconnected.bind(this));
        this.socket.on('playerStateUpdate', this.handlePlayerStateUpdate.bind(this));
        this.socket.on('spellCast', this.handleSpellCast.bind(this));
        this.socket.on('healthUpdate', this.handleHealthUpdate.bind(this));
        this.socket.on('playerKilled', this.handlePlayerKilled.bind(this));
        this.socket.on('playerRespawned', this.handlePlayerRespawned.bind(this));
        this.socket.on('burnEnded', this.handleBurnEnded.bind(this));
        this.socket.on('playerDied', this.handlePlayerDied.bind(this));
        this.socket.on('spawnProtectionEnded', this.handleSpawnProtectionEnded.bind(this));
    }

    handleCurrentPlayers(serverPlayers) {
        Object.entries(serverPlayers).forEach(([id, data]) => {
            this.game.players.set(id, new Player(id, data));
        });
        this.game.ui.updatePlayerCount();
        this.game.ui.updateLeaderboard();  // Update leaderboard with initial players
    }

    handleNewPlayer(data) {
        this.game.players.set(data.id, new Player(data.id, data));
        this.game.ui.updatePlayerCount();
        this.game.ui.updateLeaderboard();  // Update when new player joins
    }

    handlePlayerMoved(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            if (data.facingLeft !== undefined) {
                player.facingLeft = data.facingLeft;
            }
            if (data.isAlive !== undefined) {
                player.isAlive = data.isAlive;
            }
        }
    }

    handlePlayerPositionUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player && data.id !== this.game.myId) {
            player.x = data.x;
            player.y = data.y;
        }
    }

    handleForceSyncPlayer(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.update(data);
        }
    }

    handlePlayerDisconnected(id) {
        this.game.players.delete(id);
        this.game.ui.updatePlayerCount();
        this.game.ui.updateLeaderboard();  // Update leaderboard when player leaves
    }

    handlePlayerStateUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.update(data);
            if (!player.isAlive && data.isAlive === true) {
                player.isBurning = false;
                player.burnEndTime = 0;
            }
        }
    }

    handleSpellCast(data) {
        this.game.spells.set(data.id, new Spell(data));
    }

    handleHealthUpdate(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.health = data.health;
            player.isBurning = data.isBurning;
            player.burnEndTime = data.burnEndTime;
        }
    }

    handlePlayerKilled(data) {
        const killer = this.game.players.get(data.killerId);
        if (killer) {
            killer.kills = data.killerKills;
            this.game.ui.updateLeaderboard();  // Update leaderboard when kills change
        }
    }

    handlePlayerRespawned(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.update({
                x: data.x,
                y: data.y,
                health: data.health,
                kills: data.kills,
                isBurning: false,
                burnEndTime: 0,
                isAlive: true,
                spawnProtection: true,
                isRespawning: true
            });

            if (data.id === this.game.myId) {
                this.game.handleLocalPlayerRespawn();
            }
        }
    }

    handleBurnEnded(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.isBurning = false;
        }
    }

    handlePlayerDied() {
        this.game.handleLocalPlayerDeath();
    }

    handleSpawnProtectionEnded(data) {
        const player = this.game.players.get(data.id);
        if (player) {
            player.spawnProtection = false;
        }
    }

    sendMovement(movementData) {
        this.socket.emit('playerMovement', movementData);
    }

    castSpell(spellData) {
        this.socket.emit('castSpell', spellData);
    }
}
