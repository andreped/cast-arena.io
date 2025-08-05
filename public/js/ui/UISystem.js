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
        this.initPlayerStatsUI();
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
        
        // Clean up tooltip events
        if (this.healthBar) {
            this.healthBar.removeEventListener('mouseenter', this.showTooltip);
            this.healthBar.removeEventListener('mousemove', this.updateTooltipPosition);
            this.healthBar.removeEventListener('mouseleave', this.hideTooltip);
        }
        
        if (this.manaBar) {
            this.manaBar.removeEventListener('mouseenter', this.showTooltip);
            this.manaBar.removeEventListener('mousemove', this.updateTooltipPosition);
            this.manaBar.removeEventListener('mouseleave', this.hideTooltip);
        }
        
        // Remove created DOM elements
        const elements = ['leaderboardModal', 'deathModal', 'activeEffects', 'mobileControls', 'healthTooltip', 'manaTooltip'];
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
        // Check if the element already exists in HTML
        const existingEffectsDiv = document.getElementById('activeEffects');
        if (existingEffectsDiv) {
            // Element already exists in HTML, just ensure it's properly styled
            return;
        }
        
        // Create the element dynamically if it doesn't exist
        const effectsDiv = document.createElement('div');
        effectsDiv.id = 'activeEffects';
        effectsDiv.style.position = 'absolute';
        effectsDiv.style.bottom = '10px';
        effectsDiv.style.left = '10px';
        effectsDiv.style.zIndex = '1000';
        effectsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        effectsDiv.style.color = 'white';
        effectsDiv.style.padding = '6px';
        effectsDiv.style.borderRadius = '6px';
        effectsDiv.style.border = '2px solid #34495e';
        effectsDiv.style.fontFamily = 'Arial, sans-serif';
        effectsDiv.style.fontSize = '11px';
        effectsDiv.style.fontWeight = 'bold';
        effectsDiv.style.minWidth = '150px';
        effectsDiv.style.display = 'none'; // Hidden by default
        document.body.appendChild(effectsDiv);
    }

    initPlayerStatsUI() {
        // Get references to the health and mana bar elements
        this.healthFill = document.getElementById('healthFill');
        this.healthBar = document.getElementById('healthBar');
        this.manaFill = document.getElementById('manaFill');
        this.manaBar = document.getElementById('manaBar');
        this.playerStats = document.getElementById('playerStats');
        
        // Get tooltip elements
        this.healthTooltip = document.getElementById('healthTooltip');
        this.manaTooltip = document.getElementById('manaTooltip');
        
        // Create Ring of Fire indicator
        this.createRingOfFireIndicator();
        
        // Setup hover events for instant tooltips
        this.setupTooltipEvents();
        
        // Initially hide until player is available
        if (this.playerStats) {
            this.playerStats.style.display = 'none';
        }
    }

    createRingOfFireIndicator() {
        // Get the game area container to position relative to it
        const gameArea = document.getElementById('gameArea');
        
        // Create inventory panel container if it doesn't exist
        let inventoryPanel = document.getElementById('inventoryPanel');
        if (!inventoryPanel) {
            inventoryPanel = document.createElement('div');
            inventoryPanel.id = 'inventoryPanel';
            inventoryPanel.style.cssText = `
                position: absolute;
                top: 82px;
                left: 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                z-index: 100;
            `;
            gameArea.appendChild(inventoryPanel);
        }
        
        // Create Ring of Fire inventory slot container (half size)
        const slotContainer = document.createElement('div');
        slotContainer.id = 'ringOfFireSlot';
        slotContainer.style.cssText = `
            position: relative;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #2c1810, #4a2c18, #2c1810);
            border: 1px solid #8B4513;
            border-radius: 4px;
            display: none;
            box-shadow: 
                inset 0 0 5px rgba(0,0,0,0.5),
                0 1px 4px rgba(0,0,0,0.3);
        `;
        
        // Create the Ring of Fire icon (smaller)
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            width: 26px;
            height: 26px;
            background: radial-gradient(circle, #FF4500 20%, #FF8C00 50%, #FFA500 80%);
            border: 1px solid #FFD700;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 
                0 0 8px rgba(255,69,0,0.6),
                inset 0 0 5px rgba(255,215,0,0.3);
            transition: all 0.2s ease;
        `;
        // Use a more static ring of fire representation with CSS (smaller)
        iconDiv.innerHTML = `
            <div style="
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: 18px;
                    height: 18px;
                    border: 2px solid #FF6B35;
                    border-radius: 50%;
                    background: radial-gradient(circle, transparent 40%, #FF4500 70%, #FF8C00 85%, transparent 100%);
                    position: relative;
                ">
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 8px;
                    ">🔥</div>
                </div>
            </div>
        `;
        iconDiv.title = 'Ring of Fire - Press 1 to activate (25 mana)';
        
        // Create key binding indicator (smaller)
        const keyDiv = document.createElement('div');
        keyDiv.style.cssText = `
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 8px;
            background: linear-gradient(135deg, #3a3a3a, #5a5a5a);
            border: 1px solid #777;
            border-radius: 1px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
            box-shadow: 0 1px 1px rgba(0,0,0,0.5);
        `;
        keyDiv.textContent = '1';
        
        // Create charge counter (smaller)
        const chargeDiv = document.createElement('div');
        chargeDiv.id = 'ringOfFireCharges';
        chargeDiv.style.cssText = `
            position: absolute;
            top: -3px;
            right: -3px;
            width: 12px;
            height: 12px;
            background: radial-gradient(circle, #FF1493, #DC143C);
            border: 1px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
            box-shadow: 0 1px 2px rgba(0,0,0,0.5);
        `;
        chargeDiv.textContent = '0';
        
        // Add hover effect
        iconDiv.addEventListener('mouseenter', () => {
            iconDiv.style.transform = 'scale(1.05)';
            iconDiv.style.boxShadow = '0 0 20px rgba(255,69,0,0.8), inset 0 0 15px rgba(255,215,0,0.4)';
        });
        
        iconDiv.addEventListener('mouseleave', () => {
            iconDiv.style.transform = 'scale(1)';
            iconDiv.style.boxShadow = '0 0 15px rgba(255,69,0,0.6), inset 0 0 10px rgba(255,215,0,0.3)';
        });
        
        // Add click handler for activation
        iconDiv.addEventListener('click', () => {
            // Simulate pressing "1" key
            const event = new KeyboardEvent('keydown', { key: '1' });
            document.dispatchEvent(event);
        });
        
        slotContainer.appendChild(iconDiv);
        slotContainer.appendChild(keyDiv);
        slotContainer.appendChild(chargeDiv);
        
        inventoryPanel.appendChild(slotContainer);
        this.ringOfFireIndicator = slotContainer;
        this.ringOfFireCharges = chargeDiv;
        this.ringOfFireIcon = iconDiv;
    }

    setupTooltipEvents() {
        if (this.healthBar && this.healthTooltip) {
            this.healthBar.addEventListener('mouseenter', (e) => this.showTooltip(e, this.healthTooltip, 'health'));
            this.healthBar.addEventListener('mousemove', (e) => this.updateTooltipPosition(e, this.healthTooltip));
            this.healthBar.addEventListener('mouseleave', () => this.hideTooltip(this.healthTooltip));
        }
        
        if (this.manaBar && this.manaTooltip) {
            this.manaBar.addEventListener('mouseenter', (e) => this.showTooltip(e, this.manaTooltip, 'mana'));
            this.manaBar.addEventListener('mousemove', (e) => this.updateTooltipPosition(e, this.manaTooltip));
            this.manaBar.addEventListener('mouseleave', () => this.hideTooltip(this.manaTooltip));
        }
    }

    showTooltip(event, tooltip, type) {
        const player = this.game.players.get(this.game.myId);
        if (!player) return;
        
        let text = '';
        if (type === 'health') {
            text = `Health: ${Math.ceil(player.health)}/${player.maxHealth}`;
        } else if (type === 'mana') {
            text = `Mana: ${Math.ceil(player.mana)}/${player.maxMana}`;
        }
        
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        this.updateTooltipPosition(event, tooltip);
    }

    updateTooltipPosition(event, tooltip) {
        // Get the game area container to position relative to it
        const gameArea = document.getElementById('gameArea');
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        // Calculate position relative to the game area
        const relativeX = event.clientX - gameAreaRect.left;
        const relativeY = event.clientY - gameAreaRect.top;
        
        // Get tooltip dimensions
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position tooltip above the cursor, centered horizontally
        tooltip.style.left = (relativeX - tooltipRect.width / 2) + 'px';
        tooltip.style.top = (relativeY - tooltipRect.height - 8) + 'px';
    }

    hideTooltip(tooltip) {
        tooltip.style.display = 'none';
    }

    updatePlayerStats() {
        const player = this.game.players.get(this.game.myId);
        if (!player || !this.healthFill || !this.manaFill) return;

        // Hide stats UI when player is dead
        if (!player.isAlive) {
            this.playerStats.style.display = 'none';
            return;
        } else {
            this.playerStats.style.display = 'block';
        }

        // Update health bar
        const healthPercent = (player.health / player.maxHealth) * 100;
        this.healthFill.style.width = healthPercent + '%';
        
        // Update health bar color based on percentage
        if (healthPercent > 60) {
            this.healthFill.style.background = 'linear-gradient(90deg, #4CAF50, #66BB6A)';
        } else if (healthPercent > 30) {
            this.healthFill.style.background = 'linear-gradient(90deg, #FF9800, #FFB74D)';
        } else {
            this.healthFill.style.background = 'linear-gradient(90deg, #F44336, #EF5350)';
        }

        // Update mana bar
        const manaPercent = (player.mana / player.maxMana) * 100;
        this.manaFill.style.width = manaPercent + '%';
        
        // Update mana bar color based on percentage
        if (manaPercent > 60) {
            this.manaFill.style.background = 'linear-gradient(90deg, #2196F3, #42A5F5)';
        } else if (manaPercent > 30) {
            this.manaFill.style.background = 'linear-gradient(90deg, #FF9800, #FFB74D)';
        } else {
            this.manaFill.style.background = 'linear-gradient(90deg, #F44336, #EF5350)';
        }
        
        // Update Ring of Fire indicator
        this.updateRingOfFireIndicator(player);
    }

    updateRingOfFireIndicator(player) {
        if (!this.ringOfFireIndicator || !this.ringOfFireCharges) return;
        
        if (player.ringOfFireCharges > 0) {
            this.ringOfFireIndicator.style.display = 'block';
            
            // Update charge count display
            this.ringOfFireCharges.textContent = player.ringOfFireCharges;
            
            // Add pulsing effect if player has enough mana to use it
            if (player.mana >= 25) {
                this.ringOfFireIcon.style.animation = 'ringOfFirePulse 2s infinite';
                this.ringOfFireIcon.style.opacity = '1';
                this.ringOfFireIcon.style.filter = 'brightness(1.2)';
            } else {
                this.ringOfFireIcon.style.animation = 'none';
                this.ringOfFireIcon.style.opacity = '0.6';
                this.ringOfFireIcon.style.filter = 'brightness(0.7) grayscale(0.3)';
            }
        } else {
            this.ringOfFireIndicator.style.display = 'none';
        }
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

        // Check for recent mana pickups
        if (myPlayer.recentManaPickups && myPlayer.recentManaPickups.length > 0) {
            const totalRecentMana = myPlayer.getTotalRecentMana();
            if (totalRecentMana > 0) {
                effects.push(`💙 Mana Restored: +${totalRecentMana}`);
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
