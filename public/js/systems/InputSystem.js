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
        if (!this.game.canPlay()) return;
        
        const player = this.game.players.get(this.game.myId);
        if (!player || player.isRespawning) return;

        let moved = false;
        let newX = player.x;
        let newY = player.y;
        
        // Convert speed from pixels per frame to pixels per second
        // Assuming target framerate of 60 FPS for the base speed
        const effectiveSpeed = player.getEffectiveSpeed() * (deltaTime / 16.67); // 16.67ms = 60 FPS

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
            // Check for wall collisions before applying movement
            const playerRadius = GAME_CONFIG.player.size;
            const wallCollision = this.game.checkWallCollision(newX, newY, playerRadius);
            
            if (!wallCollision) {
                // Check world boundaries
                newX = Math.max(playerRadius, Math.min(GAME_CONFIG.world.width - playerRadius, newX));
                newY = Math.max(playerRadius, Math.min(GAME_CONFIG.world.height - playerRadius, newY));
                
                player.move(newX, newY);
                this.game.network.sendMovement(player.getMovementData());
            }
        }
    }
}
