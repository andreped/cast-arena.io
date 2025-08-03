export class UISystem {
    constructor(game) {
        this.game = game;
        this.showLeaderboard = false;
        this.setupUI();
    }

    setupUI() {
        // Initialize UI elements if needed
        this.createLeaderboardModal();
        this.createDeathModal();
        if (this.game.input.isMobile) {
            this.createMobileControls();
        }
    }

    createLeaderboardModal() {
        const modal = document.createElement('div');
        modal.id = 'leaderboardModal';
        modal.style.display = 'none';
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.innerHTML = '<h2>Leaderboard</h2><div id="leaderboardContent"></div>';
        
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
        content.innerHTML = '<h2>You Died!</h2><p>Respawning in 3 seconds...</p>';
        
        modal.appendChild(content);
        document.body.appendChild(modal);
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

    toggleLeaderboard() {
        this.showLeaderboard = !this.showLeaderboard;
        document.getElementById('leaderboardModal').style.display = 
            this.showLeaderboard ? 'block' : 'none';
        if (this.showLeaderboard) {
            this.updateLeaderboard();
        }
    }

    updateLeaderboard() {
        const content = document.getElementById('leaderboardContent');
        const players = Array.from(this.game.players.values())
            .sort((a, b) => (b.kills || 0) - (a.kills || 0));
        
        let html = '<table><tr><th>Player</th><th>Kills</th></tr>';
        players.forEach(player => {
            const isMe = player.id === this.game.myId;
            html += `
                <tr class="${isMe ? 'highlight' : ''}">
                    <td>${isMe ? 'You' : 'Player ' + player.id.substr(0, 4)}</td>
                    <td>${player.kills || 0}</td>
                </tr>
            `;
        });
        html += '</table>';
        
        content.innerHTML = html;
    }

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
