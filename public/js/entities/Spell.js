import { GAME_CONFIG } from '../config/gameConfig.js';

export class Spell {
    constructor(data) {
        this.id = data.id;
        this.casterId = data.casterId;
        this.type = data.type || 'fireball';
        this.x = data.x;
        this.y = data.y;
        this.targetX = data.targetX;
        this.targetY = data.targetY;
        this.angle = data.angle || Math.atan2(data.targetY - data.y, data.targetX - data.x);
        this.speed = GAME_CONFIG.spell.speed;
        this.damage = GAME_CONFIG.spell.damage;
        this.createdAt = Date.now();
        this.trail = [];
        this.shouldRemove = false; // Flag to track if spell should be removed
        
        // Store normalized direction vectors for consistent movement
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        this.directionX = dx / length;
        this.directionY = dy / length;
    }

    update(dt, players, socket, game) {
        // Early return if spell is already marked for removal
        if (this.shouldRemove) {
            return true;
        }

        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) {
            this.trail.shift();
        }

        // Calculate movement based on stored direction and deltaTime
        const moveDistance = this.speed * (dt / 1000);
        const newX = this.x + this.directionX * moveDistance;
        const newY = this.y + this.directionY * moveDistance;

        // FIRST: Check if the direct path from current position to new position hits a wall
        if (game && game.checkWallLineCollision) {
            const directWallHit = game.checkWallLineCollision(this.x, this.y, newX, newY);
            if (directWallHit) {
                // Wall collision detected - create explosion and remove spell immediately
                if (game.addExplosion) {
                    game.addExplosion(this.x, this.y, 'wall');
                }
                this.shouldRemove = true;
                return true;
            }
        }

        // SECOND: Check if the new position itself would be inside a wall
        if (game && game.checkWallCollision) {
            const positionBlocked = game.checkWallCollision(newX, newY, GAME_CONFIG.spell.size / 2);
            if (positionBlocked) {
                if (game.addExplosion) {
                    game.addExplosion(this.x, this.y, 'wall');
                }
                this.shouldRemove = true;
                return true;
            }
        }

        // THIRD: Only if no wall collision, check for player collisions along the path
        // Use small steps to ensure we don't miss any players
        const steps = Math.max(3, Math.ceil(moveDistance / 10)); // Small 10px steps
        const stepX = (newX - this.x) / steps;
        const stepY = (newY - this.y) / steps;

        for (let i = 1; i <= steps; i++) {
            const checkX = this.x + stepX * i;
            const checkY = this.y + stepY * i;
            
            // IMPORTANT: Before checking players, verify no wall is between spell and player
            for (const [playerId, player] of players) {
                // Skip if it's the caster or if player is dead or has spawn protection
                if (playerId === this.casterId || !player.isAlive || player.spawnProtection) {
                    continue;
                }

                // Calculate squared distance (faster than using Math.sqrt)
                const dx = player.x - checkX;
                const dy = player.y - checkY;
                const distanceSquared = dx * dx + dy * dy;
                const hitThresholdSquared = (GAME_CONFIG.player.size + GAME_CONFIG.spell.size) * 
                                          (GAME_CONFIG.player.size + GAME_CONFIG.spell.size);

                if (distanceSquared <= hitThresholdSquared) {
                    // BEFORE sending hit to server, double-check no wall between spell and player
                    if (game && game.checkWallLineCollision) {
                        const wallBetweenSpellAndPlayer = game.checkWallLineCollision(
                            checkX, checkY,  // Use current step position, not original spell position!
                            player.x, player.y
                        );
                        
                        if (wallBetweenSpellAndPlayer) {
                            // There's a wall between spell and player - treat as wall hit instead
                            if (game.addExplosion) {
                                game.addExplosion(checkX, checkY, 'wall');  // Explosion at step position
                            }
                            this.shouldRemove = true;
                            return true;
                        }
                    }
                    
                    // Player hit detected and no wall blocking! Send hit event to server
                    if (socket) {
                        socket.emit('spellHit', {
                            spellId: this.id,
                            targetId: playerId,
                            position: { x: checkX, y: checkY },
                            casterId: this.casterId
                        });
                    }
                    
                    // Create explosion effect for player hit
                    if (game && game.addExplosion) {
                        game.addExplosion(checkX, checkY, 'hit');
                    }
                    
                    this.shouldRemove = true;
                    return true;
                }
            }
        }

        // FOURTH: Only update position if no collisions occurred
        this.x = newX;
        this.y = newY;

        // Check if spell is out of bounds or too old
        const age = (Date.now() - this.createdAt) / 1000;
        const outOfBounds = age > 3 || 
               this.x < 0 || this.x > GAME_CONFIG.world.width ||
               this.y < 0 || this.y > GAME_CONFIG.world.height;
               
        if (outOfBounds) {
            this.shouldRemove = true;
            return true;
        }

        return false;
    }

    isInViewport(cameraX, cameraY) {
        const padding = GAME_CONFIG.canvas.width; // Extra padding for spell trails
        return this.x >= cameraX - padding &&
               this.x <= cameraX + GAME_CONFIG.canvas.width + padding &&
               this.y >= cameraY - padding &&
               this.y <= cameraY + GAME_CONFIG.canvas.height + padding;
    }
}
