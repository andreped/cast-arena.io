export class UISystem {
    constructor(game) {
        this.game = game;
        this.showLeaderboard = false;
        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        // Initialize UI elements if needed
        this.createLeaderboardModal();
        this.createDeathModal();
        this.createEffectsDisplay();
        if (this.game.input.isMobile) {
            this.createMobileControls();
        }
    }

    setupEventListeners() {
        this.boundKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.toggleLeaderboard();
            }
        };
        document.addEventListener('keydown', this.boundKeyHandler);
    }

    // Add cleanup method
    destroy() {
        if (this.boundKeyHandler) {
            document.removeEventListener('keydown', this.boundKeyHandler);
            this.boundKeyHandler = null;
        }
        
        // Remove created DOM elements
        const elements = ['leaderboardModal', 'deathModal', 'activeEffects', 'mobileControls'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Clear game reference
        this.game = null;
    }

    createLeaderboardModal() {
        const modal = document.createElement('div');
        modal.id = 'leaderboardModal';
        modal.style.display = 'none';
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.innerHTML = `
            <h2>🏆 Leaderboard</h2>
            <div id="leaderboardContent"></div>
            <p class="modal-close-hint">Press ESC to close</p>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    createDeathModal() {
        const modal = document.createElement('div');
        modal.id = 'deathModal';
        modal.style.display = 'none';
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.innerHTML = `
            <h2>💀 You Died!</h2>
            <p>Click anywhere to respawn</p>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    createEffectsDisplay() {
        const effectsDiv = document.createElement('div');
        effectsDiv.id = 'activeEffects';
        effectsDiv.style.position = 'absolute';
        effectsDiv.style.top = '10px';
        effectsDiv.style.left = '10px';
        effectsDiv.style.zIndex = '1000';
        effectsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        effectsDiv.style.color = 'white';
        effectsDiv.style.padding = '10px';
        effectsDiv.style.borderRadius = '5px';
        effectsDiv.style.fontFamily = 'Arial, sans-serif';
        effectsDiv.style.fontSize = '14px';
        effectsDiv.style.minWidth = '150px';
        effectsDiv.style.display = 'none'; // Hidden by default
        document.body.appendChild(effectsDiv);
    }

    toggleLeaderboard() {
        this.showLeaderboard = !this.showLeaderboard;
        const modal = document.getElementById('leaderboardModal');
        modal.style.display = this.showLeaderboard ? 'block' : 'none';
        if (this.showLeaderboard) {
            this.updateLeaderboard();
        }
    }

    updateLeaderboard() {
        const content = document.getElementById('leaderboardContent');
        if (!content) {
            console.error('Leaderboard content element not found!');
            return;
        }

        // Create array of players from the Map
        const playersList = [];
        console.log('Updating leaderboard, players Map size:', this.game.players.size);
        
        for (const [id, player] of this.game.players) {
            console.log('Processing player:', id, player);
            playersList.push({
                id: player.id,
                kills: player.kills || 0,
                isAlive: player.isAlive,
                isMe: player.id === this.game.myId
            });
        }
        playersList.sort((a, b) => b.kills - a.kills);

        console.log('Final players list for leaderboard:', playersList);

        // Create HTML for leaderboard
        const html = playersList.map((player, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '▫️';
            const playerName = player.isMe ? 'You' : `Player ${player.id.slice(0, 4)}`;
            const status = player.isAlive ? '🧙‍♂️' : '💀';
            return `
                <div class="leaderboard-row ${player.isMe ? 'highlight' : ''}">
                    <span class="rank">${rankEmoji}</span>
                    <span class="player-name">${playerName}</span>
                    <span class="status">${status}</span>
                    <span class="kills">💀 ${player.kills}</span>
                </div>
            `;
        }).join('');

        content.innerHTML = html;
    }

    createMobileControls() {
        const controls = document.createElement('div');
        controls.id = 'mobileControls';
        
        const joystickArea = document.createElement('div');
        joystickArea.id = 'joystickArea';
        
        const joystick = document.createElement('div');
        joystick.id = 'joystick';
        joystickArea.appendChild(joystick);
        
        const fireButton = document.createElement('button');
        fireButton.id = 'fireButton';
        fireButton.textContent = '🔥';
        
        controls.appendChild(joystickArea);
        controls.appendChild(fireButton);
        document.body.appendChild(controls);
    }

    // Removed duplicate methods

    showDeathModal() {
        document.getElementById('deathModal').style.display = 'block';
    }

    hideDeathModal() {
        document.getElementById('deathModal').style.display = 'none';
    }

    updatePlayerCount() {
        const count = this.game.players.size;
        document.getElementById('playerCount').textContent = `Players: ${count}`;
    }

    updateActiveEffects() {
        const effectsDiv = document.getElementById('activeEffects');
        const myPlayer = this.game.players.get(this.game.myId);
        
        if (!myPlayer || !myPlayer.isAlive) {
            effectsDiv.style.display = 'none';
            return;
        }

        const effects = [];
        
        // Check for speed buffs
        if (myPlayer.currentSpeedMultiplier > 1.0) {
            const speedBoost = Math.round((myPlayer.currentSpeedMultiplier - 1.0) * 100);
            
            // Calculate remaining time for speed buffs
            let minTimeLeft = Infinity;
            if (myPlayer.speedBuffs && myPlayer.speedBuffs.length > 0) {
                const currentTime = Date.now();
                minTimeLeft = Math.min(...myPlayer.speedBuffs.map(buff => buff.endTime - currentTime));
                minTimeLeft = Math.max(0, Math.ceil(minTimeLeft / 1000)); // Convert to seconds
            }
            
            if (minTimeLeft > 0 && minTimeLeft !== Infinity) {
                effects.push(`🏃 Speed Boost: +${speedBoost}% (${minTimeLeft}s)`);
            } else {
                effects.push(`🏃 Speed Boost: +${speedBoost}%`);
            }
        }

        // Add other effects here in the future (health, shield, etc.)
        
        if (effects.length > 0) {
            effectsDiv.innerHTML = `
                <div style="margin-bottom: 5px; font-weight: bold; color: #00FF00;">🧙‍♂️ Active Effects:</div>
                ${effects.map(effect => `<div>${effect}</div>`).join('')}
            `;
            effectsDiv.style.display = 'block';
        } else {
            effectsDiv.style.display = 'none';
        }
    }
}
