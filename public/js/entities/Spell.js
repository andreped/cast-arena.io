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
        
        // Store normalized direction vectors for consistent movement
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        this.directionX = dx / length;
        this.directionY = dy / length;
    }

    update(dt, players, socket) {
        // Debug logging for Safari
        if (Math.random() < 0.01) { // Log only 1% of updates to avoid spam
            console.log('Spell update:', {
                id: this.id,
                position: { x: this.x, y: this.y },
                players: Array.from(players).map(([id, p]) => ({
                    id,
                    pos: { x: p.x, y: p.y },
                    alive: p.isAlive,
                    protected: p.spawnProtection
                }))
            });
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

        // Check collisions at intermediate points
        const steps = Math.max(1, Math.ceil(moveDistance / (GAME_CONFIG.player.size / 2)));
        const stepX = (newX - this.x) / steps;
        const stepY = (newY - this.y) / steps;

        for (let i = 1; i <= steps; i++) {
            const checkX = this.x + stepX * i;
            const checkY = this.y + stepY * i;

            // Check collision with each player
            // Use Array.from to ensure cross-browser compatibility
            Array.from(players).forEach(([playerId, player]) => {
                // Skip if it's the caster or if player is dead or has spawn protection
                if (playerId === this.casterId || !player.isAlive || player.spawnProtection) {
                    return; // using return in forEach instead of continue
                }

                // Calculate squared distance (faster than using Math.sqrt)
                const dx = player.x - checkX;
                const dy = player.y - checkY;
                const distanceSquared = dx * dx + dy * dy;
                const hitThresholdSquared = (GAME_CONFIG.player.size + GAME_CONFIG.spell.size) * 
                                          (GAME_CONFIG.player.size + GAME_CONFIG.spell.size);

                if (distanceSquared <= hitThresholdSquared) {
                    // Hit detected! Send hit event to server
                    if (socket) {
                        socket.emit('spellHit', {
                            spellId: this.id,
                            targetId: playerId,
                            position: { x: checkX, y: checkY },
                            casterId: this.casterId
                        });
                    }
                    this.shouldRemove = true; // Mark for removal instead of direct return
                }
            });
            
            if (this.shouldRemove) {
                return true;
            }
        }

        // Update position if no collision occurred
        this.x = newX;
        this.y = newY;

        // Check if spell is out of bounds or too old
        const age = (Date.now() - this.createdAt) / 1000;
        return age > 3 || 
               this.x < 0 || this.x > GAME_CONFIG.world.width ||
               this.y < 0 || this.y > GAME_CONFIG.world.height;
    }

    isInViewport(cameraX, cameraY) {
        const padding = GAME_CONFIG.canvas.width; // Extra padding for spell trails
        return this.x >= cameraX - padding &&
               this.x <= cameraX + GAME_CONFIG.canvas.width + padding &&
               this.y >= cameraY - padding &&
               this.y <= cameraY + GAME_CONFIG.canvas.height + padding;
    }
}
