const gameConfig = require('../../config/gameConfig');
const Pathfinding = require('./Pathfinding');

class BotController {
    constructor(bot, gameState, pathfinding = null) {
        this.bot = bot;
        this.gameState = gameState;
        
        // Pathfinding system (shared or individual)
        this.pathfinding = pathfinding || new Pathfinding(gameState);
        this.currentPath = null;
        this.currentWaypoint = null;
        this.waypointReachedDistance = 30; // Distance to consider waypoint reached
        
        // Stuck detection for better pathfinding
        this.lastPosition = { x: bot.x, y: bot.y };
        this.stuckTimer = 0;
        this.stuckThreshold = 1000; // Consider stuck after 1 second of no movement
        this.stuckDistance = 10; // Must move less than 10 pixels to be considered stuck
        
        // AI state
        this.currentTarget = null; // Current enemy or item target
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.lastWanderChange = Date.now();
        this.lastShootTime = 0;
        this.reactionTarget = null; // Enemy we're reacting to
        this.reactionStartTime = 0;
        
        // Timing for stuck detection
        this.lastUpdateTime = Date.now();
        this.searchRadius = 100; // How far to search around last known position
        
        // Pending actions for BotManager to execute
        this.pendingInput = null; // Movement input
        this.pendingShot = null; // Shooting angle  
        this.pendingRingOfFire = null; // Ring of Fire position
        
        // Config shortcuts
        this.config = gameConfig.bots;
    }

    update(deltaTime) {
        if (!this.bot.isAlive) return;

        // Update AI decision making
        this.updateTarget();
        this.updateMovement(deltaTime);
        this.updateCombat();
    }

    updateTarget() {
        const now = Date.now();
        
        // 1. Look for enemies in vision (can see through walls, only range limited)
        const enemyInVision = this.findEnemyInVision();
        
        if (enemyInVision) {
            // Strategic priority: Ring of Fire vs regular combat
            if (this.bot.hasRingOfFire() && this.bot.mana >= 25) {
                // We have Ring of Fire and mana - prioritize close combat
                this.currentTarget = { type: 'enemy', entity: enemyInVision };
                return;
            } else if (this.bot.mana >= gameConfig.spells.fireball.manaCost) {
                // Regular combat with fireball
                this.currentTarget = { type: 'enemy', entity: enemyInVision };
                return;
            } else {
                // Low mana strategy
                if (this.bot.hasRingOfFire()) {
                    // We have Ring of Fire but need mana - prioritize mana over combat
                    const manaItem = this.findNearestItem('mana');
                    if (manaItem) {
                        this.currentTarget = { type: 'item', entity: manaItem };
                        return;
                    }
                } else {
                    // No Ring of Fire, try to get mana for regular combat
                    const manaItem = this.findNearestItem('mana');
                    if (manaItem) {
                        this.currentTarget = { type: 'item', entity: manaItem };
                        return;
                    }
                }
                // Still target enemy even without mana (might get close or find items)
                this.currentTarget = { type: 'enemy', entity: enemyInVision };
                return;
            }
        }
        
        // 2. No enemies in range - look for items
        // Prioritize Ring of Fire if we don't have one (very powerful)
        if (!this.bot.hasRingOfFire()) {
            const ringOfFireItem = this.findNearestItem('ringOfFire');
            if (ringOfFireItem) {
                this.currentTarget = { type: 'item', entity: ringOfFireItem };
                return;
            }
        }
        
        // Look for mana if low
        if (this.bot.mana < 20) {
            const manaItem = this.findNearestItem('mana');
            if (manaItem) {
                this.currentTarget = { type: 'item', entity: manaItem };
                return;
            }
        }
        
        // Look for speed boost if not boosted
        if (this.bot.currentSpeedMultiplier <= 1.0) {
            const speedItem = this.findNearestItem('speed');
            if (speedItem) {
                this.currentTarget = { type: 'item', entity: speedItem };
                return;
            }
        }
        
        // 3. No enemies or priority items - clear target to wander
        this.currentTarget = null;
    }

    findEnemyInVision() {
        const enemies = [];
        
        for (const [id, player] of this.gameState.players) {
            // Skip self, dead players, and spawn-protected players
            if (id === this.bot.id || !player.isAlive || player.spawnProtection) continue;
            
            const dx = player.x - this.bot.x;
            const dy = player.y - this.bot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check range
            if (distance > this.config.visionRange) continue;
            
            // Check line of sight (bots can see through walls, range is only limit)
            if (this.hasLineOfSight(player.x, player.y)) {
                enemies.push({ player, distance });
            }
        }
        
        // Return closest enemy
        if (enemies.length > 0) {
            enemies.sort((a, b) => a.distance - b.distance);
            return enemies[0].player;
        }
        
        return null;
    }

    hasLineOfSight(targetX, targetY) {
        // Bots can see through walls - only range matters
        // (They still need to pathfind around walls for movement)
        return true; // No wall blocking for vision
    }

    findNearestItem(type) {
        let nearest = null;
        let nearestDist = this.config.itemScanRadius;
        
        // Items are stored in gameState.itemSystem.items (a Map)
        for (const [id, item] of this.gameState.itemSystem.items) {
            // Filter by type
            if (type === 'mana' && item.type !== 'mana') continue;
            if (type === 'speed' && item.type !== 'speed') continue;
            if (type === 'ringOfFire' && item.type !== 'ringOfFire') continue;
            
            const dx = item.x - this.bot.x;
            const dy = item.y - this.bot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = item;
            }
        }
        
        return nearest;
    }

    updateMovement(deltaTime) {
        const now = Date.now();
        let targetX = 0;
        let targetY = 0;
        let hasTarget = false;
        
        if (this.currentTarget) {
            // PATHFINDING for bots - use A* pathfinding to navigate around walls
            let targetPos;
            
            // Use last known position if pursuing a hidden enemy
            if (this.currentTarget.useLastKnownPosition) {
                targetPos = { 
                    x: this.currentTarget.lastKnownX, 
                    y: this.currentTarget.lastKnownY 
                };
                console.log(`🧠🎯 Bot ${this.bot.name} pursuing last known position of ${this.currentTarget.entity.name} at (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)})`);
            } else {
                targetPos = { x: this.currentTarget.entity.x, y: this.currentTarget.entity.y };
                
                // For enemy targets, use tactical combat positioning instead of direct approach
                if (this.currentTarget.type === 'enemy') {
                    const enemyDistance = Math.sqrt(
                        (targetPos.x - this.bot.x) ** 2 + 
                        (targetPos.y - this.bot.y) ** 2
                    );
                    
                    // If within optimal shooting range, use strafe movement instead of approaching
                    if (enemyDistance >= this.config.minShootDistance && enemyDistance <= this.config.maxShootDistance) {
                        targetPos = this.getStrafePosition(targetPos, enemyDistance);
                    }
                    // If too close, move away
                    else if (enemyDistance < this.config.minShootDistance) {
                        const retreatAngle = Math.atan2(this.bot.y - targetPos.y, this.bot.x - targetPos.x);
                        const retreatDistance = this.config.minShootDistance + 50;
                        targetPos = {
                            x: this.bot.x + Math.cos(retreatAngle) * retreatDistance,
                            y: this.bot.y + Math.sin(retreatAngle) * retreatDistance
                        };
                    }
                    // If too far, approach normally (existing logic will handle pathfinding)
                }
            }
            
            // Stuck detection - force new path if bot hasn't moved much
            const currentPos = { x: this.bot.x, y: this.bot.y };
            const distanceMoved = Math.sqrt(
                (currentPos.x - this.lastPosition.x) ** 2 + 
                (currentPos.y - this.lastPosition.y) ** 2
            );
            
            if (distanceMoved < this.stuckDistance) {
                this.stuckTimer += (now - this.lastUpdateTime);
                if (this.stuckTimer > this.stuckThreshold) {
                    this.currentWaypoint = null; // Force new path calculation
                    this.stuckTimer = 0; // Reset stuck timer
                }
            } else {
                this.stuckTimer = 0; // Reset if moving
            }
            
            this.lastPosition = { x: currentPos.x, y: currentPos.y };
            this.lastUpdateTime = now;
            
            const botPos = { x: this.bot.x, y: this.bot.y };
            
            // Check if we need to update our path or if we've reached our current waypoint
            let needNewPath = false;
            
            if (!this.currentWaypoint) {
                needNewPath = true;
            } else {
                // Check if we've reached current waypoint
                const waypointDist = Math.sqrt(
                    (this.bot.x - this.currentWaypoint.x) ** 2 + 
                    (this.bot.y - this.currentWaypoint.y) ** 2
                );
                
                if (waypointDist < this.waypointReachedDistance) {
                    // Reached waypoint, get next one
                    this.currentWaypoint = this.pathfinding.getNextWaypoint(
                        this.bot.x, this.bot.y, targetPos.x, targetPos.y
                    );
                    
                    if (!this.currentWaypoint) {
                        needNewPath = true;
                    }
                }
            }
            
            if (needNewPath) {
                // Try pathfinding to find route around obstacles
                this.currentWaypoint = this.pathfinding.getNextWaypoint(
                    botPos.x, botPos.y, targetPos.x, targetPos.y
                );
                
                if (this.currentWaypoint) {
                    const waypointX = this.currentWaypoint.x - botPos.x;
                    const waypointY = this.currentWaypoint.y - botPos.y;
                    const length = Math.sqrt(waypointX * waypointX + waypointY * waypointY);
                    if (length > 0) {
                        targetX = waypointX / length;
                        targetY = waypointY / length;
                    }
                } else {
                    // No path found, try direct movement (will be stopped by collision detection)
                    const directX = targetPos.x - botPos.x;
                    const directY = targetPos.y - botPos.y;
                    const length = Math.sqrt(directX * directX + directY * directY);
                    if (length > 0) {
                        targetX = directX / length;
                        targetY = directY / length;
                    }
                }
            } else if (this.currentWaypoint) {
                // Move toward current waypoint
                const waypointX = this.currentWaypoint.x - botPos.x;
                const waypointY = this.currentWaypoint.y - botPos.y;
                const length = Math.sqrt(waypointX * waypointX + waypointY * waypointY);
                if (length > 0) {
                    targetX = waypointX / length;
                    targetY = waypointY / length;
                }
            }
            hasTarget = true;
        } else {
            // Wander behavior
            if (now - this.lastWanderChange > this.config.wanderChangeInterval) {
                this.wanderAngle = Math.random() * Math.PI * 2;
                this.lastWanderChange = now;
            }
            
            targetX = Math.cos(this.wanderAngle);
            targetY = Math.sin(this.wanderAngle);
        }
        
        // Normalize direction
        const length = Math.sqrt(targetX * targetX + targetY * targetY);
        if (length > 0) {
            targetX /= length;
            targetY /= length;
        }
        
        // Apply speed multiplier for wandering (combat already normalized)
        if (!hasTarget) {
            targetX *= this.config.wanderSpeed;
            targetY *= this.config.wanderSpeed;
            
            // Wall avoidance for wandering only - combat handles its own avoidance
            const lookAhead = 50;
            const checkX = this.bot.x + targetX * lookAhead;
            const checkY = this.bot.y + targetY * lookAhead;
            
            if (this.gameState.checkWallCollision(checkX, checkY, 20)) {
                const perpX = -targetY;
                const perpY = targetX;
                targetX = perpX;
                targetY = perpY;
                
                this.wanderAngle = Math.atan2(targetY, targetX);
                this.lastWanderChange = now;
            }
        }
        
        // Update bot aiming angle (face movement direction)
        if (this.currentTarget && this.currentTarget.type === 'enemy') {
            // Face the enemy when in combat
            const dx = this.currentTarget.entity.x - this.bot.x;
            const dy = this.currentTarget.entity.y - this.bot.y;
            this.bot.aimingAngle = Math.atan2(dy, dx);
        } else {
            // Face movement direction
            this.bot.aimingAngle = Math.atan2(targetY, targetX);
        }
        
        // Update facing direction for sprite
        this.bot.facingLeft = this.bot.aimingAngle > Math.PI / 2 || this.bot.aimingAngle < -Math.PI / 2;
        
        // Apply movement using bot's own physics
        // Use continuous movement (not WASD discrete) for smoother bot movement
        this.pendingInput = { x: targetX, y: targetY };
    }

    updateCombat() {
        const now = Date.now();
        
        // Only fight enemies
        if (!this.currentTarget || this.currentTarget.type !== 'enemy') {
            this.reactionTarget = null;
            return;
        }

        const enemy = this.currentTarget.entity;
        const dx = enemy.x - this.bot.x;
        const dy = enemy.y - this.bot.y;
        const distanceToEnemy = Math.sqrt(dx * dx + dy * dy);
        
        // STRATEGIC DECISION: Ring of Fire vs Fireball
        // Ring of Fire is very powerful but limited - use it strategically
        if (this.bot.hasRingOfFire() && this.bot.mana >= 25) {
            // Use Ring of Fire if enemy is close enough (more effective at close range)
            const ringOfFireRange = 240; // Effective range for Ring of Fire (matches actual radius)
            if (distanceToEnemy <= ringOfFireRange) {
                // Check cooldown for Ring of Fire usage
                if (now - this.lastShootTime >= this.config.shootCooldownMs) {
                    this.useRingOfFire();
                    this.lastShootTime = now;
                    return;
                }
            }
        }
        
        // If we can't/shouldn't use Ring of Fire, try regular fireball
        // But prioritize getting mana if we have Ring of Fire but not enough mana
        if (this.bot.hasRingOfFire() && this.bot.mana < 25) {
            // We have Ring of Fire but not enough mana - prioritize mana over shooting
            return; // Skip shooting to save mana for Ring of Fire
        }

        // Regular fireball combat
        if (this.bot.mana < gameConfig.spells.fireball.manaCost) {
            return;
        }

        // Check cooldown
        if (now - this.lastShootTime < this.config.shootCooldownMs) {
            return;
        }

        // Reaction time simulation
        if (this.reactionTarget !== enemy) {
            this.reactionTarget = enemy;
            this.reactionStartTime = now;
            return;
        }

        if (now - this.reactionStartTime < this.config.reactionTimeMs) {
            return;
        }

        // Calculate aim with accuracy
        let aimAngle = Math.atan2(dy, dx);
        
        // Check if spell will hit a wall before reaching target
        const spellWillHitWall = this.gameState.checkWallLineCollision(
            this.bot.x, this.bot.y, enemy.x, enemy.y
        );
        
        if (spellWillHitWall) {
            return; // Don't waste mana shooting at walls
        }

        // Add inaccuracy (random offset)
        if (Math.random() > this.config.accuracy) {
            const maxError = 0.3; // ~17 degrees
            const error = (Math.random() - 0.5) * maxError;
            aimAngle += error;
        }

        // Shoot!
        this.shoot(aimAngle);
        this.lastShootTime = now;
    }

    shoot(angle) {
        // This will be called by BotManager to actually cast the spell
        this.pendingShot = angle;
    }

    getPendingActions() {
        const actions = {
            input: this.pendingInput,
            shoot: this.pendingShot,
            ringOfFire: this.pendingRingOfFire
        };
        
        // Clear pending actions
        this.pendingInput = null;
        this.pendingShot = null;
        this.pendingRingOfFire = null;
        
        return actions;
    }

    useRingOfFire() {
        // Queue Ring of Fire usage
        this.pendingRingOfFire = { x: this.bot.x, y: this.bot.y };
    }

    /**
     * Calculate a strafe position that maintains optimal combat distance while moving
     * @param {Object} enemyPos - Enemy position {x, y}
     * @param {number} currentDistance - Current distance to enemy
     * @returns {Object} Target position for strafing movement
     */
    getStrafePosition(enemyPos, currentDistance) {
        // Calculate angle from enemy to bot
        const angleToBot = Math.atan2(this.bot.y - enemyPos.y, this.bot.x - enemyPos.x);
        
        // Add strafe offset (90 degrees perpendicular movement)
        // Use game time to create smooth circular movement
        const strafeAngle = angleToBot + (Date.now() * 0.001 % (Math.PI * 2));
        
        // Maintain current distance but move in circular pattern
        const optimalDistance = (this.config.minShootDistance + this.config.maxShootDistance) / 2;
        const targetDistance = Math.min(currentDistance, optimalDistance);
        
        const strafePos = {
            x: enemyPos.x + Math.cos(strafeAngle) * targetDistance,
            y: enemyPos.y + Math.sin(strafeAngle) * targetDistance
        };
        
        return strafePos;
    }

}

module.exports = BotController;
