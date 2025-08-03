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
        if (this.game.input.isMobile) {
            this.createMobileControls();
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleLeaderboard();
            }
        });
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
        content.className = 'modal-content death-modal';
        content.innerHTML = `
            <h2>💀 You Died!</h2>
            <p>Respawning in <span id="respawnTimer">3</span> seconds...</p>
            <p class="respawn-note">You'll respawn at a random location with 2 seconds of protection!</p>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
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
}
