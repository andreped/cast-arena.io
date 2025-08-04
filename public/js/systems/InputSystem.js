import { GAME_CONFIG } from '../config/gameConfig.js';

export class InputSystem {
    constructor(game) {
        this.game = game;
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            ArrowUp: false,
            ArrowLeft: false,
            ArrowDown: false,
            ArrowRight: false,
            ' ': false
        };
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.joystickActive = false;
        this.joystickDirection = { x: 0, y: 0 };
        this.lastFireTime = 0;

        // Client-side prediction and reconciliation
        this.inputSequence = 0;
        this.pendingInputs = new Map(); // Store pending inputs for reconciliation
        this.lastServerUpdate = 0;
        this.reconciliationThreshold = 3; // Max pixels difference before reconciliation (increased back up to reduce sensitivity)
        
        // Advanced smoothing system for jitter reduction
        this.positionDebt = { x: 0, y: 0 }; // Accumulated position difference to smooth out
        this.maxSnapThreshold = 15; // If debt exceeds this, snap immediately (prevents rubber-banding)
        this.smoothingRate = 0.1; // Max 10% of debt corrected per frame
        this.frameDebtReduction = 0.5; // Max pixels to correct per frame
        this.serverStateBuffer = []; // Buffer recent server states for interpolation
        this.maxBufferSize = 3; // Keep 3 recent states for smooth interpolation

        // Debug logging for production
        this.debugMode = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        this.debugStats = {
            totalInputs: 0,
            reconciliations: 0,
            largestDelta: 0,
            avgLatency: 0,
            networkUpdates: 0
        };
        this.debugLog = [];
        this.maxDebugLogs = 100;

        // FPS monitoring
        this.frameCount = 0;
        this.lastFpsTime = performance.now();
        this.currentFps = 0;
        this.frameTimes = [];
        this.maxFrameTimeHistory = 60; // Keep last 60 frame times
        this.serverTps = 0; // Server ticks per second
        this.targetTps = 20; // Expected server TPS
        this.lastTpsUpdateTime = 0; // Track when TPS was last updated from network
        
        // Enhanced FPS debugging
        this.fpsHistory = [];
        this.maxFpsHistory = 100;
        this.lowFpsThreshold = 40;
        this.consecutiveLowFps = 0;

        // Store bound event handlers for cleanup
        this.boundHandlers = {
            keyDown: this.handleKeyDown.bind(this),
            keyUp: this.handleKeyUp.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            click: this.handleClick.bind(this),
            joystickStart: this.handleJoystickStart.bind(this),
            joystickMove: this.handleJoystickMove.bind(this),
            joystickEnd: this.handleJoystickEnd.bind(this),
            fireButton: this.handleFireButton.bind(this)
        };

        this.setupEventListeners();
        if (this.isMobile) {
            this.initMobileControls();
        }

        // Initialize debug tools
        this.exposeDebugToConsole();
        
        // Always initialize FPS monitor
        this.initFpsMonitor();
        
        // Immediate FPS diagnosis
        this.runImmediateFpsDiagnosis();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.boundHandlers.keyDown);
        document.addEventListener('keyup', this.boundHandlers.keyUp);
        this.game.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
        this.game.canvas.addEventListener('click', this.boundHandlers.click);
    }

    // Add cleanup method
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.boundHandlers.keyDown);
        document.removeEventListener('keyup', this.boundHandlers.keyUp);
        this.game.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
        this.game.canvas.removeEventListener('click', this.boundHandlers.click);

        // Remove mobile control listeners if they exist
        if (this.isMobile) {
            const joystickArea = document.getElementById('joystickArea');
            const fireButton = document.getElementById('fireButton');
            
            if (joystickArea) {
                joystickArea.removeEventListener('touchstart', this.boundHandlers.joystickStart);
                joystickArea.removeEventListener('touchmove', this.boundHandlers.joystickMove);
                joystickArea.removeEventListener('touchend', this.boundHandlers.joystickEnd);
            }
            
            if (fireButton) {
                fireButton.removeEventListener('touchstart', this.boundHandlers.fireButton);
                fireButton.removeEventListener('click', this.boundHandlers.fireButton);
            }
        }

        // Clear references
        this.boundHandlers = null;
        this.game = null;
    }

    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.key)) {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();
                this.handleSpellCast();
            }
        }
    }

    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.key)) {
            this.keys[e.key] = false;
        }
    }

    handleMouseMove(e) {
        const rect = this.game.canvas.getBoundingClientRect();
        const viewportX = e.clientX - rect.left;
        const viewportY = e.clientY - rect.top;
        
        this.mouseX = viewportX + this.game.camera.x;
        this.mouseY = viewportY + this.game.camera.y;
        
        // Update player's aiming angle based on mouse position
        const player = this.game.players.get(this.game.myId);
        if (player && this.game.canPlay()) {
            const dx = this.mouseX - player.x;
            const dy = this.mouseY - player.y;
            const previousAngle = player.aimingAngle;
            player.aimingAngle = Math.atan2(dy, dx);
            
            // Only send network update if angle changed significantly (avoid spam)
            const angleDiff = Math.abs(player.aimingAngle - previousAngle);
            if (angleDiff > 0.1 || angleDiff > Math.PI * 1.9) { // Handle angle wrap-around
                // Send only aiming data, not position data to avoid position desync
                this.game.network.sendAimingUpdate(player.getAimingData());
            }
        }
    }

    handleClick(e) {
        if (!this.game.canPlay()) return;
        
        const rect = this.game.canvas.getBoundingClientRect();
        const player = this.game.players.get(this.game.myId);
        
        const viewportX = e.clientX - rect.left;
        const viewportY = e.clientY - rect.top;
        const playerViewportX = player.x - this.game.camera.x;
        const playerViewportY = player.y - this.game.camera.y;
        
        this.castSpellTowards(viewportX - playerViewportX, viewportY - playerViewportY);
    }

    initMobileControls() {
        const joystickArea = document.getElementById('joystickArea');
        const joystick = document.getElementById('joystick');
        const fireButton = document.getElementById('fireButton');

        joystickArea.addEventListener('touchstart', this.boundHandlers.joystickStart, { passive: false });
        joystickArea.addEventListener('touchmove', this.boundHandlers.joystickMove, { passive: false });
        joystickArea.addEventListener('touchend', this.boundHandlers.joystickEnd, { passive: false });
        
        fireButton.addEventListener('touchstart', this.boundHandlers.fireButton, { passive: false });
        fireButton.addEventListener('click', this.boundHandlers.fireButton);
    }

    handleJoystickStart(e) {
        e.preventDefault();
        this.joystickActive = true;
        this.updateJoystick(e.touches[0]);
    }

    handleJoystickMove(e) {
        e.preventDefault();
        if (this.joystickActive) {
            this.updateJoystick(e.touches[0]);
        }
    }

    handleJoystickEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
        this.joystickDirection = { x: 0, y: 0 };
        document.getElementById('joystick').style.transform = 'translate(-50%, -50%)';
    }

    updateJoystick(touch) {
        const joystickArea = document.getElementById('joystickArea');
        const joystick = document.getElementById('joystick');
        const rect = joystickArea.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 40;
        
        if (distance <= maxDistance) {
            joystick.style.transform = 'translate(' + (deltaX - 20) + 'px, ' + (deltaY - 20) + 'px)';
            this.joystickDirection = {
                x: deltaX / maxDistance,
                y: deltaY / maxDistance
            };
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * maxDistance;
            const limitedY = Math.sin(angle) * maxDistance;
            
            joystick.style.transform = 'translate(' + (limitedX - 20) + 'px, ' + (limitedY - 20) + 'px)';
            this.joystickDirection = {
                x: limitedX / maxDistance,
                y: limitedY / maxDistance
            };
        }
    }

    handleFireButton(e) {
        e.preventDefault();
        const now = Date.now();
        if (now - this.lastFireTime > GAME_CONFIG.mobile.fireDelay) {
            this.handleMobileSpellCast();
            this.lastFireTime = now;
        }
    }

    handleMobileSpellCast() {
        if (!this.game.canPlay()) return;
        
        const player = this.game.players.get(this.game.myId);
        if (!player) return;

        if (Math.abs(this.joystickDirection.x) > 0.1 || Math.abs(this.joystickDirection.y) > 0.1) {
            this.castSpellTowards(this.joystickDirection.x, this.joystickDirection.y);
        } else {
            const direction = player.facingLeft ? -1 : 1;
            this.castSpellTowards(direction, 0);
        }
    }

    handleSpellCast() {
        if (!this.game.canPlay()) return;
        
        const player = this.game.players.get(this.game.myId);
        if (!player) return;

        const mouseViewportX = this.mouseX - this.game.camera.x;
        const mouseViewportY = this.mouseY - this.game.camera.y;
        const playerViewportX = player.x - this.game.camera.x;
        const playerViewportY = player.y - this.game.camera.y;

        if (this.mouseX !== 0 || this.mouseY !== 0) {
            this.castSpellTowards(mouseViewportX - playerViewportX, mouseViewportY - playerViewportY);
        } else {
            const direction = player.facingLeft ? -1 : 1;
            this.castSpellTowards(direction, 0);
        }
    }

    castSpellTowards(dx, dy) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;

        const player = this.game.players.get(this.game.myId);
        
        // Check if player has enough mana
        if (player.mana < GAME_CONFIG.spell.manaCost) {
            // Could add a visual/audio feedback for insufficient mana here
            console.log('Not enough mana! Need', GAME_CONFIG.spell.manaCost, 'but only have', player.mana);
            return;
        }

        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const angle = Math.atan2(normalizedDy, normalizedDx);
        const targetDistance = 1000;

        // Update player's aiming angle for directional sprites
        player.aimingAngle = angle;

        // Trigger casting animation
        this.game.renderer.spriteSystem.createCastAnimation(this.game.myId);

        this.game.network.castSpell({
            x: player.x,
            y: player.y,
            targetX: player.x + normalizedDx * targetDistance,
            targetY: player.y + normalizedDy * targetDistance,
            angle
        });

        // Update facing direction and send movement data (including aiming angle)
        if (player.setFacing(normalizedDx)) {
            this.game.network.sendMovement(player.getMovementData());
        }
    }

    update(deltaTime) {
        // Calculate FPS
        this.calculateFPS(deltaTime);
        
        if (!this.game.canPlay()) return;
        
        const player = this.game.players.get(this.game.myId);
        if (!player || player.isRespawning) return;

        let moved = false;
        let newX = player.x;
        let newY = player.y;
        
        // Frame-rate independent movement (speed is pixels per second)
        // Convert deltaTime from milliseconds to seconds and apply to speed
        const effectiveSpeed = player.getEffectiveSpeed() * (deltaTime / 1000);

        if (this.keys.w || this.keys.ArrowUp) {
            newY -= effectiveSpeed;
            moved = true;
        }
        if (this.keys.s || this.keys.ArrowDown) {
            newY += effectiveSpeed;
            moved = true;
        }
        if (this.keys.a || this.keys.ArrowLeft) {
            newX -= effectiveSpeed;
            moved = true;
            if (player.setFacing(-1)) moved = true;
        }
        if (this.keys.d || this.keys.ArrowRight) {
            newX += effectiveSpeed;
            moved = true;
            if (player.setFacing(1)) moved = true;
        }

        if (this.isMobile && this.joystickActive) {
            const moveThreshold = 0.1;
            if (Math.abs(this.joystickDirection.x) > moveThreshold || 
                Math.abs(this.joystickDirection.y) > moveThreshold) {
                newX += this.joystickDirection.x * effectiveSpeed * 1.5;
                newY += this.joystickDirection.y * effectiveSpeed * 1.5;
                moved = true;
            }
        }

        if (moved) {
            // Client-side prediction with reconciliation
            const playerRadius = GAME_CONFIG.player.size;
            let finalX = player.x;
            let finalY = player.y;
            
            // First, try the full movement (client prediction)
            if (!this.game.checkWallCollision(newX, newY, playerRadius)) {
                // No collision - apply full movement
                finalX = Math.max(playerRadius, Math.min(GAME_CONFIG.world.width - playerRadius, newX));
                finalY = Math.max(playerRadius, Math.min(GAME_CONFIG.world.height - playerRadius, newY));
            } else {
                // Collision detected - try sliding
                let didSlide = false;
                
                // Try horizontal movement only
                if (newX !== player.x && !this.game.checkWallCollision(newX, player.y, playerRadius)) {
                    finalX = newX;
                    didSlide = true;
                }
                
                // Try vertical movement only
                if (newY !== player.y && !this.game.checkWallCollision(player.x, newY, playerRadius)) {
                    finalY = newY;
                    didSlide = true;
                }
                
                if (didSlide) {
                    // Apply world boundaries
                    finalX = Math.max(playerRadius, Math.min(GAME_CONFIG.world.width - playerRadius, finalX));
                    finalY = Math.max(playerRadius, Math.min(GAME_CONFIG.world.height - playerRadius, finalY));
                }
            }
            
            // Only update if position actually changed
            if (finalX !== player.x || finalY !== player.y) {
                // Store input for potential reconciliation
                this.inputSequence++;
                this.debugStats.totalInputs++;
                
                const inputData = {
                    timestamp: performance.now(),
                    x: finalX,
                    y: finalY,
                    inputX: newX,
                    inputY: newY
                };
                
                this.pendingInputs.set(this.inputSequence, inputData);
                
                // Debug logging
                if (this.debugMode) {
                    this.addDebugLog(`INPUT #${this.inputSequence}: (${finalX.toFixed(1)}, ${finalY.toFixed(1)}) - Pending: ${this.pendingInputs.size}`);
                }
                
                // Clean old pending inputs (older than 1 second)
                const now = performance.now();
                for (const [seq, input] of this.pendingInputs) {
                    if (now - input.timestamp > 1000) {
                        this.pendingInputs.delete(seq);
                    }
                }
                
                // Apply movement immediately (client prediction)
                player.move(finalX, finalY);
                
                // Send to server with sequence number
                const movementData = player.getMovementData();
                movementData.sequence = this.inputSequence;
                this.debugStats.networkUpdates++;
                this.game.network.sendMovement(movementData);
            }
        }
    }

    // Handle server position reconciliation with advanced smoothing
    handleServerReconciliation(serverData) {
        const player = this.game.players.get(this.game.myId);
        if (!player || !serverData.sequence) return;

        // Check if we have the corresponding input
        const pendingInput = this.pendingInputs.get(serverData.sequence);
        if (!pendingInput) {
            if (this.debugMode) {
                this.addDebugLog(`⚠️ MISSING INPUT for sequence ${serverData.sequence}`);
            }
            return;
        }

        // Calculate latency
        const latency = performance.now() - pendingInput.timestamp;
        this.debugStats.avgLatency = (this.debugStats.avgLatency + latency) / 2;

        // Calculate difference between client prediction and server position
        const deltaX = serverData.x - player.x;
        const deltaY = serverData.y - player.y;
        const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Track largest delta for debugging
        if (totalDelta > this.debugStats.largestDelta) {
            this.debugStats.largestDelta = totalDelta;
        }

        // Debug logging
        if (this.debugMode || window.location.hostname === 'localhost') {
            this.addDebugLog(`RECONCILE #${serverData.sequence}: Δ=${totalDelta.toFixed(1)}px, latency=${latency.toFixed(1)}ms`);
        }

        // Use a much smaller threshold for frame-rate independent movement
        const reconciliationThreshold = 0.5; // Much smaller threshold for precise movement
        
        if (totalDelta > reconciliationThreshold) {
            // Apply immediate but gentle correction for frame-rate independent movement
            const correctionFactor = 0.3; // 30% immediate correction
            player.x += deltaX * correctionFactor;
            player.y += deltaY * correctionFactor;
            
            this.debugStats.reconciliations++;
            
            if (this.debugMode) {
                this.addDebugLog(`🔧 GENTLE CORRECT: applied ${(correctionFactor * 100)}% of ${totalDelta.toFixed(1)}px delta`);
            }
        }

        // Remove processed input and older ones
        for (const [seq, input] of this.pendingInputs) {
            if (seq <= serverData.sequence) {
                this.pendingInputs.delete(seq);
            }
        }
    }

    // Apply smooth position correction based on accumulated debt
    applySmoothCorrection(player, customRate = null) {
        const rate = customRate || this.smoothingRate;
        const maxCorrection = this.frameDebtReduction;
        
        // Calculate how much debt to pay off this frame
        const debtMagnitude = Math.sqrt(this.positionDebt.x * this.positionDebt.x + this.positionDebt.y * this.positionDebt.y);
        
        if (debtMagnitude > 0.1) { // Only correct if debt is meaningful
            // Limit correction to maximum per-frame amount
            const correctionMagnitude = Math.min(debtMagnitude * rate, maxCorrection);
            const correctionRatio = correctionMagnitude / debtMagnitude;
            
            const correctionX = this.positionDebt.x * correctionRatio;
            const correctionY = this.positionDebt.y * correctionRatio;
            
            // Apply correction to player position
            player.x += correctionX;
            player.y += correctionY;
            
            // Reduce debt by the amount corrected
            this.positionDebt.x -= correctionX;
            this.positionDebt.y -= correctionY;
            
            if (this.debugMode && Math.abs(correctionX) > 0.1 || Math.abs(correctionY) > 0.1) {
                this.addDebugLog(`🔧 SMOOTH: corrected (${correctionX.toFixed(1)}, ${correctionY.toFixed(1)}), remaining debt: ${(debtMagnitude - correctionMagnitude).toFixed(1)}px`);
            }
        }
    }

    // Debug utilities
    addDebugLog(message) {
        const timestamp = new Date().toISOString().substr(11, 12);
        this.debugLog.push(`[${timestamp}] ${message}`);
        if (this.debugLog.length > this.maxDebugLogs) {
            this.debugLog.shift();
        }
        console.log(`[InputSystem] ${message}`);
    }

    getDebugInfo() {
        const debtMagnitude = Math.sqrt(this.positionDebt.x * this.positionDebt.x + this.positionDebt.y * this.positionDebt.y);
        return {
            ...this.debugStats,
            pendingInputs: this.pendingInputs.size,
            positionDebt: debtMagnitude.toFixed(1) + 'px',
            serverBufferSize: this.serverStateBuffer.length,
            recentLogs: this.debugLog.slice(-10),
            reconciliationRate: this.debugStats.totalInputs > 0 ? 
                (this.debugStats.reconciliations / this.debugStats.totalInputs * 100).toFixed(1) + '%' : '0%'
        };
    }

    // Expose debug functions to window for console access
    exposeDebugToConsole() {
        if (this.debugMode) {
            window.inputDebug = {
                stats: () => this.getDebugInfo(),
                logs: () => this.debugLog,
                clearLogs: () => { this.debugLog = []; },
                setThreshold: (pixels) => { this.reconciliationThreshold = pixels; },
                enableVerbose: () => { this.verboseDebug = true; },
                disableVerbose: () => { this.verboseDebug = false; }
            };
            console.log('🔧 Debug tools available: inputDebug.stats(), inputDebug.logs(), etc.');
        }
    }

    initDebugOverlay() {
        const overlay = document.getElementById('debugOverlay');
        if (overlay) {
            overlay.style.display = 'block';
            
            // Update overlay every 500ms
            setInterval(() => this.updateDebugOverlay(), 500);
            
            // Toggle with Ctrl+D
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'd') {
                    e.preventDefault();
                    overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
    }

    updateDebugOverlay() {
        const statsEl = document.getElementById('debugStats');
        const logsEl = document.getElementById('debugLogs');
        
        if (statsEl && logsEl) {
            const stats = this.getDebugInfo();
            statsEl.innerHTML = `
                Inputs: ${stats.totalInputs} | Reconciles: ${stats.reconciliations} (${stats.reconciliationRate})<br>
                Pending: ${stats.pendingInputs} | Max Δ: ${stats.largestDelta.toFixed(1)}px | Debt: ${stats.positionDebt}<br>
                Avg Latency: ${stats.avgLatency.toFixed(1)}ms | Network: ${stats.networkUpdates} | Buffer: ${stats.serverBufferSize}
            `;
            
            logsEl.innerHTML = stats.recentLogs.map(log => `<div>${log}</div>`).join('');
            logsEl.scrollTop = logsEl.scrollHeight;
        }
        
        // Update FPS display
        this.updateFpsDisplay();
    }

    calculateFPS(deltaTime) {
        const now = performance.now();
        this.frameCount++;
        
        // Store frame time for average calculation
        this.frameTimes.push(deltaTime);
        if (this.frameTimes.length > this.maxFrameTimeHistory) {
            this.frameTimes.shift();
        }
        
        // Calculate FPS every second
        if (now - this.lastFpsTime >= 1000) {
            this.currentFps = Math.round(this.frameCount * 1000 / (now - this.lastFpsTime));
            
            // Store FPS history
            this.fpsHistory.push(this.currentFps);
            if (this.fpsHistory.length > this.maxFpsHistory) {
                this.fpsHistory.shift();
            }
            
            // Debug low FPS
            if (this.currentFps < this.lowFpsThreshold) {
                this.consecutiveLowFps++;
                if (this.consecutiveLowFps >= 3) {
                    console.warn(`🐌 Low FPS detected: ${this.currentFps} FPS for ${this.consecutiveLowFps} seconds`);
                    this.diagnoseFpsIssue();
                }
            } else {
                this.consecutiveLowFps = 0;
            }
            
            this.frameCount = 0;
            this.lastFpsTime = now;
        }
    }

    updateFpsDisplay() {
        const clientFpsEl = document.getElementById('clientFps');
        const serverTpsEl = document.getElementById('serverTps');
        const frameTimeEl = document.getElementById('frameTime');
        
        if (clientFpsEl && serverTpsEl && frameTimeEl) {
            // Update client FPS with color coding
            const fpsColor = this.getFpsColor(this.currentFps);
            clientFpsEl.innerHTML = `Client: <span style="color: ${fpsColor};">${this.currentFps} FPS</span>`;
            
            // Only update server TPS if it hasn't been recently updated by NetworkSystem
            // Give NetworkSystem 1.5 seconds priority to avoid overwriting fresh TPS data
            const timeSinceLastTpsUpdate = performance.now() - this.lastTpsUpdateTime;
            const shouldUpdateTps = timeSinceLastTpsUpdate > 1500; // 1.5 seconds
            
            if (shouldUpdateTps && this.serverTps > 0) {
                // Update server TPS only if we have valid data and enough time has passed
                const tpsColor = this.getTpsColor(this.serverTps);
                const tpsEfficiency = this.targetTps > 0 ? (this.serverTps / this.targetTps * 100).toFixed(0) : 100;
                serverTpsEl.innerHTML = `Server: <span style="color: ${tpsColor};">${this.serverTps} TPS</span>`;
            }
            
            // Update average frame time
            const avgFrameTime = this.frameTimes.length > 0 ? 
                this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length : 0;
            const frameColor = this.getFrameTimeColor(avgFrameTime);
            frameTimeEl.innerHTML = `Frame: <span style="color: ${frameColor};">${avgFrameTime.toFixed(1)}ms</span>`;
        }
    }

    getFpsColor(fps) {
        if (fps >= 50) return '#00ff00';      // Green - Good
        if (fps >= 30) return '#ffaa00';      // Orange - OK
        if (fps >= 20) return '#ff6600';      // Red-Orange - Poor
        return '#ff0000';                     // Red - Bad
    }

    getTpsColor(tps) {
        if (tps >= 18) return '#00ff00';      // Green - Good (server target is usually 20)
        if (tps >= 15) return '#ffaa00';      // Orange - OK
        if (tps >= 10) return '#ff6600';      // Red-Orange - Poor
        return '#ff0000';                     // Red - Bad
    }

    getFrameTimeColor(frameTime) {
        if (frameTime <= 16.67) return '#00ff00';  // Green - 60+ FPS
        if (frameTime <= 33.33) return '#ffaa00';  // Orange - 30-60 FPS
        if (frameTime <= 50) return '#ff6600';     // Red-Orange - 20-30 FPS
        return '#ff0000';                          // Red - <20 FPS
    }

    // Method to receive server TPS from network
    updateServerTps(tps) {
        this.serverTps = tps;
        this.lastTpsUpdateTime = performance.now();
    }

    initFpsMonitor() {
        // Update FPS display every 200ms for smooth updates
        setInterval(() => this.updateFpsDisplay(), 200);
        
        // Toggle FPS monitor with F key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                const monitor = document.getElementById('fpsMonitor');
                if (monitor) {
                    monitor.style.display = monitor.style.display === 'none' ? 'block' : 'none';
                }
            }
            
            // Debug FPS with Shift+F
            if (e.shiftKey && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                this.printFpsDebugInfo();
            }
        });
    }

    diagnoseFpsIssue() {
        const issues = [];
        
        // Check if tab is visible
        if (document.hidden) {
            issues.push("Tab is in background (browser throttling)");
        }
        
        // Check average frame time
        const avgFrameTime = this.frameTimes.length > 0 ? 
            this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length : 0;
        
        if (avgFrameTime > 33) {
            issues.push(`High frame time: ${avgFrameTime.toFixed(1)}ms (should be ~16ms for 60fps)`);
        }
        
        // Check requestAnimationFrame timing
        let rafTime = performance.now();
        requestAnimationFrame(() => {
            const rafDelta = performance.now() - rafTime;
            if (rafDelta > 20) {
                console.warn(`⏱️ requestAnimationFrame delayed: ${rafDelta.toFixed(1)}ms`);
            }
        });
        
        // Check for performance issues
        const memInfo = performance.memory;
        if (memInfo && memInfo.usedJSHeapSize > 100000000) { // >100MB
            issues.push(`High memory usage: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
        }
        
        if (issues.length > 0) {
            console.warn("🔍 FPS Issues detected:", issues);
        }
        
        return issues;
    }

    printFpsDebugInfo() {
        const avgFps = this.fpsHistory.length > 0 ? 
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length : 0;
        
        const minFps = Math.min(...this.fpsHistory);
        const maxFps = Math.max(...this.fpsHistory);
        
        console.log("📊 FPS Debug Info:");
        console.log(`Current: ${this.currentFps} FPS`);
        console.log(`Average: ${avgFps.toFixed(1)} FPS`);
        console.log(`Range: ${minFps}-${maxFps} FPS`);
        console.log(`Tab visible: ${!document.hidden}`);
        console.log(`Browser: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
        
        // Check if game loop is the issue
        console.log("🔧 To test game loop performance, run: window.testGameLoop()");
        window.testGameLoop = this.testGameLoopPerformance.bind(this);
    }

    testGameLoopPerformance() {
        console.log("🧪 Testing game loop performance...");
        const iterations = 1000;
        const start = performance.now();
        
        // Simulate game loop without rendering
        for (let i = 0; i < iterations; i++) {
            // Simulate typical update operations with frame-rate independent timing
            const deltaTime = 16.67; // Average frame time for testing (60 FPS equivalent)
            // Mock player update
            const mockPlayer = { x: 100, y: 100, getEffectiveSpeed: () => 180 }; // pixels per second
            const newX = mockPlayer.x + (mockPlayer.getEffectiveSpeed() * deltaTime / 1000);
            const newY = mockPlayer.y + 1;
        }
        
        const end = performance.now();
        const totalTime = end - start;
        const avgTimePerIteration = totalTime / iterations;
        
        console.log(`⏱️ ${iterations} iterations took ${totalTime.toFixed(2)}ms`);
        console.log(`📈 Average: ${avgTimePerIteration.toFixed(4)}ms per iteration`);
        console.log(`🎯 Target: <0.016ms per iteration for 60fps`);
        
        if (avgTimePerIteration > 0.016) {
            console.warn("⚠️ Game loop may be too heavy for 60fps");
        } else {
            console.log("✅ Game loop performance looks good");
        }
    }

    runImmediateFpsDiagnosis() {
        console.log("🚀 Running immediate FPS diagnosis...");
        
        // Check basic browser info
        console.log(`Browser: ${navigator.userAgent}`);
        console.log(`Tab visible: ${!document.hidden}`);
        console.log(`Hardware concurrency: ${navigator.hardwareConcurrency} cores`);
        
        // Check if canvas exists and size
        const canvas = document.querySelector('canvas');
        if (canvas) {
            console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
            console.log(`Canvas CSS size: ${canvas.style.width}x${canvas.style.height}`);
        }
        
        // Test requestAnimationFrame timing
        let rafCount = 0;
        let rafStart = performance.now();
        
        const testRaf = () => {
            rafCount++;
            if (rafCount >= 60) { // Test for 1 second at 60fps
                const elapsed = performance.now() - rafStart;
                const actualFps = rafCount * 1000 / elapsed;
                console.log(`🎯 requestAnimationFrame test: ${actualFps.toFixed(1)} FPS over ${elapsed.toFixed(0)}ms`);
                
                if (actualFps < 50) {
                    console.warn("⚠️ Browser is throttling requestAnimationFrame!");
                    console.warn("💡 Common causes:");
                    console.warn("  - Tab in background");
                    console.warn("  - Browser power saving mode");
                    console.warn("  - Low battery mode");
                    console.warn("  - Hardware limitations");
                }
            } else {
                requestAnimationFrame(testRaf);
            }
        };
        
        requestAnimationFrame(testRaf);
        
        // Check visibility API
        document.addEventListener('visibilitychange', () => {
            console.log(`👁️ Tab visibility changed: ${document.hidden ? 'hidden' : 'visible'}`);
        });
    }
}
