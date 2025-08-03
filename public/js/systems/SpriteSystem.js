export class SpriteSystem {
    constructor() {
        this.sprites = new Map();
        this.animations = new Map();
        this.createWizardSprites();
    }

    createWizardSprites() {
        // Create pixel art wizard sprites for all 4 directions
        this.createWizardIdleSprite();
        this.createWizardCastSprite();
        this.createWizardFrontSprite();
        this.createWizardBackSprite();
        this.createStaffSprite();
        this.createVerticalStaffSprite();
        
        // Create left-facing versions (flip right-facing sprites)
        this.createFlippedSprites();
    }

    createFlippedSprites() {
        // Create horizontally flipped versions for left-facing
        const spritesToFlip = ['wizard_idle', 'wizard_cast', 'staff'];
        
        spritesToFlip.forEach(spriteName => {
            const originalSprite = this.sprites.get(spriteName);
            if (originalSprite) {
                const flippedCanvas = document.createElement('canvas');
                flippedCanvas.width = originalSprite.width;
                flippedCanvas.height = originalSprite.height;
                const ctx = flippedCanvas.getContext('2d');
                
                ctx.imageSmoothingEnabled = false;
                
                // Flip horizontally
                ctx.scale(-1, 1);
                ctx.drawImage(originalSprite, -originalSprite.width, 0);
                
                this.sprites.set(`${spriteName}_left`, flippedCanvas);
            }
        });
    }

    createWizardIdleSprite() {
        // Create a small canvas for the wizard sprite
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        // Disable image smoothing for pixel art
        ctx.imageSmoothingEnabled = false;
        
        // Draw wizard pixel art
        this.drawWizardPixelArt(ctx, 16, 20, 'idle');
        
        this.sprites.set('wizard_idle', canvas);
    }

    createWizardCastSprite() {
        // Create casting sprite (slightly different pose)
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawWizardPixelArt(ctx, 16, 20, 'cast');
        
        this.sprites.set('wizard_cast', canvas);
    }

    createWizardFrontSprite() {
        // Create front-facing wizard sprite
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawWizardPixelArt(ctx, 16, 20, 'front');
        
        this.sprites.set('wizard_front', canvas);
    }

    createWizardBackSprite() {
        // Create back-facing wizard sprite
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawWizardPixelArt(ctx, 16, 20, 'back');
        
        this.sprites.set('wizard_back', canvas);
    }

    createStaffSprite() {
        // Create staff sprite separately for easier rotation (horizontal aiming)
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawStaffPixelArt(ctx, 12, 16);
        
        this.sprites.set('staff', canvas);
    }

    createVerticalStaffSprite() {
        // Create vertical staff sprites for different animation frames
        this.createVerticalStaffFrame('idle', 0);
        this.createVerticalStaffFrame('cast1', 1);
        this.createVerticalStaffFrame('cast2', 2);
    }

    createVerticalStaffFrame(frameName, frameIndex) {
        const canvas = document.createElement('canvas');
        canvas.width = 12; // Narrower canvas
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawVerticalStaffPixelArt(ctx, 6, 20, frameIndex); // Centered in narrower canvas
        
        this.sprites.set(`staff_vertical_${frameName}`, canvas);
    }

    drawWizardPixelArt(ctx, centerX, centerY, pose = 'idle') {
        const pixel = (x, y, color, size = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(centerX + x, centerY + y, size, size);
        };

        // Flowing hair (will be customizable per player) - shown around the hat edges
        const hairColor = '#8B4513'; // Default brown, will be overridden with player color
        
        // Hair flowing from sides and back
        if (pose === 'back') {
            // More hair visible from behind
            pixel(-8, -16, hairColor);
            pixel(-6, -16, hairColor);
            pixel(-7, -14, hairColor);
            pixel(-5, -14, hairColor);
            pixel(-8, -12, hairColor);
            pixel(-6, -12, hairColor);
            pixel(4, -16, hairColor);
            pixel(6, -16, hairColor);
            pixel(5, -14, hairColor);
            pixel(7, -14, hairColor);
            pixel(6, -12, hairColor);
            pixel(8, -12, hairColor);
        } else {
            // Hair visible from sides
            pixel(-6, -16, hairColor);
            pixel(-5, -14, hairColor);
            pixel(-6, -12, hairColor);
            pixel(4, -16, hairColor);
            pixel(5, -14, hairColor);
            pixel(6, -12, hairColor);
        }

        // Wizard hat (customizable color with bright border)
        const hatColor = '#4A0E4E'; // Default purple, will be overridden with player color
        const hatBorder = '#FFD700'; // Bright gold border for visibility
        
        // Hat main body
        pixel(-6, -18, hatColor, 2);
        pixel(-4, -18, hatColor, 2);
        pixel(-2, -18, hatColor, 2);
        pixel(0, -18, hatColor, 2);
        pixel(2, -18, hatColor, 2);
        pixel(4, -18, hatColor, 2);
        
        pixel(-4, -16, hatColor, 2);
        pixel(-2, -16, hatColor, 2);
        pixel(0, -16, hatColor, 2);
        pixel(2, -16, hatColor, 2);
        
        pixel(-2, -14, hatColor, 2);
        pixel(0, -14, hatColor, 2);
        
        // Hat border/trim (bright gold for visibility)
        pixel(-7, -17, hatBorder);
        pixel(-5, -17, hatBorder);
        pixel(-3, -17, hatBorder);
        pixel(-1, -17, hatBorder);
        pixel(1, -17, hatBorder);
        pixel(3, -17, hatBorder);
        pixel(5, -17, hatBorder);
        
        pixel(-5, -15, hatBorder);
        pixel(-3, -15, hatBorder);
        pixel(-1, -15, hatBorder);
        pixel(1, -15, hatBorder);
        pixel(3, -15, hatBorder);
        
        pixel(-3, -13, hatBorder);
        pixel(-1, -13, hatBorder);
        pixel(1, -13, hatBorder);

        // Magical hat star/emblem (always bright gold)
        pixel(-1, -15, '#FFD700');
        pixel(0, -16, '#FFD700');
        pixel(1, -15, '#FFD700');
        pixel(0, -14, '#FFD700');
        pixel(0, -15, '#FFD700');

        // Face (peach) - same for all directions
        pixel(-4, -12, '#FFDBAC', 2);
        pixel(-2, -12, '#FFDBAC', 2);
        pixel(0, -12, '#FFDBAC', 2);
        pixel(2, -12, '#FFDBAC', 2);
        
        pixel(-4, -10, '#FFDBAC', 2);
        pixel(-2, -10, '#FFDBAC', 2);
        pixel(0, -10, '#FFDBAC', 2);
        pixel(2, -10, '#FFDBAC', 2);
        
        pixel(-4, -8, '#FFDBAC', 2);
        pixel(-2, -8, '#FFDBAC', 2);
        pixel(0, -8, '#FFDBAC', 2);
        pixel(2, -8, '#FFDBAC', 2);

        // Eyes - different for each direction
        if (pose === 'front') {
            // Front-facing: both eyes visible, looking forward
            pixel(-3, -11, '#000000');
            pixel(-2, -11, '#000000');
            pixel(1, -11, '#000000');
            pixel(2, -11, '#000000');
        } else if (pose === 'back') {
            // Back-facing: no eyes visible (back of head)
            // Add back-of-head hair detail instead
            pixel(-3, -13, '#8B4513');
            pixel(-1, -13, '#8B4513');
            pixel(1, -13, '#8B4513');
            pixel(3, -13, '#8B4513');
        } else {
            // Side view: eyes positioned for right-facing (will be flipped for left)
            pixel(-2, -11, '#000000');
            pixel(2, -11, '#000000');
        }

        // Beard - enhanced for different poses
        if (pose === 'back') {
            // Minimal beard visible from back
            pixel(-2, -6, '#E6E6E6');
            pixel(-1, -6, '#E6E6E6');
            pixel(0, -6, '#E6E6E6');
            pixel(1, -6, '#E6E6E6');
        } else {
            // Full beard for front and side views
            pixel(-4, -6, '#E6E6E6');
            pixel(-3, -6, '#E6E6E6');
            pixel(-2, -6, '#E6E6E6');
            pixel(-1, -6, '#E6E6E6');
            pixel(0, -6, '#E6E6E6');
            pixel(1, -6, '#E6E6E6');
            pixel(2, -6, '#E6E6E6');
            
            pixel(-3, -4, '#E6E6E6');
            pixel(-2, -4, '#E6E6E6');
            pixel(-1, -4, '#E6E6E6');
            pixel(0, -4, '#E6E6E6');
            pixel(1, -4, '#E6E6E6');
            pixel(2, -4, '#E6E6E6');
            
            pixel(-2, -2, '#E6E6E6');
            pixel(-1, -2, '#E6E6E6');
            pixel(0, -2, '#E6E6E6');
            pixel(1, -2, '#E6E6E6');
            
            pixel(-1, 0, '#E6E6E6');
            pixel(0, 0, '#E6E6E6');
            
            // Beard highlights
            pixel(-3, -5, '#F0F0F0');
            pixel(-1, -5, '#F0F0F0');
            pixel(1, -5, '#F0F0F0');
            pixel(-2, -3, '#F0F0F0');
            pixel(0, -3, '#F0F0F0');
            pixel(-1, -1, '#F0F0F0');
        }

        // Body/Robe - color will be applied dynamically
        const bodyColor = '#4169E1'; // Default blue, will be overridden
        
        // Robe body - same for all directions
        pixel(-6, -4, bodyColor, 2);
        pixel(-4, -4, bodyColor, 2);
        pixel(-2, -4, bodyColor, 2);
        pixel(0, -4, bodyColor, 2);
        pixel(2, -4, bodyColor, 2);
        pixel(4, -4, bodyColor, 2);
        
        pixel(-6, -2, bodyColor, 2);
        pixel(-4, -2, bodyColor, 2);
        pixel(-2, -2, bodyColor, 2);
        pixel(0, -2, bodyColor, 2);
        pixel(2, -2, bodyColor, 2);
        pixel(4, -2, bodyColor, 2);
        
        pixel(-6, 0, bodyColor, 2);
        pixel(-4, 0, bodyColor, 2);
        pixel(-2, 0, bodyColor, 2);
        pixel(0, 0, bodyColor, 2);
        pixel(2, 0, bodyColor, 2);
        pixel(4, 0, bodyColor, 2);
        
        pixel(-8, 2, bodyColor, 2);
        pixel(-6, 2, bodyColor, 2);
        pixel(-4, 2, bodyColor, 2);
        pixel(-2, 2, bodyColor, 2);
        pixel(0, 2, bodyColor, 2);
        pixel(2, 2, bodyColor, 2);
        pixel(4, 2, bodyColor, 2);
        pixel(6, 2, bodyColor, 2);
        
        pixel(-8, 4, bodyColor, 2);
        pixel(-6, 4, bodyColor, 2);
        pixel(-4, 4, bodyColor, 2);
        pixel(-2, 4, bodyColor, 2);
        pixel(0, 4, bodyColor, 2);
        pixel(2, 4, bodyColor, 2);
        pixel(4, 4, bodyColor, 2);
        pixel(6, 4, bodyColor, 2);

        // Arms - different for each pose
        if (pose === 'front') {
            // Front view: both arms visible at sides
            pixel(-8, -3, '#FFDBAC');
            pixel(-7, -3, '#FFDBAC');
            pixel(6, -3, '#FFDBAC');
            pixel(7, -3, '#FFDBAC');
        } else if (pose === 'back') {
            // Back view: arms slightly visible at sides
            pixel(-7, -2, '#FFDBAC');
            pixel(6, -2, '#FFDBAC');
        } else if (pose === 'cast') {
            // Side casting: extended arm
            pixel(6, -6, '#FFDBAC');
            pixel(8, -6, '#FFDBAC');
            pixel(10, -6, '#FFDBAC');
            pixel(-6, -3, '#FFDBAC');
        } else {
            // Side idle: arms at sides
            pixel(-6, -2, '#FFDBAC');
            pixel(6, -2, '#FFDBAC');
        }
    }

    drawStaffPixelArt(ctx, centerX, centerY) {
        const pixel = (x, y, color, size = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(centerX + x, centerY + y, size, size);
        };

        // Staff handle (brown)
        pixel(0, -12, '#8B4513');
        pixel(0, -10, '#8B4513');
        pixel(0, -8, '#8B4513');
        pixel(0, -6, '#8B4513');
        pixel(0, -4, '#8B4513');
        pixel(0, -2, '#8B4513');
        pixel(0, 0, '#8B4513');
        pixel(0, 2, '#8B4513');
        pixel(0, 4, '#8B4513');
        pixel(0, 6, '#8B4513');
        pixel(0, 8, '#8B4513');
        pixel(0, 10, '#8B4513');

        // Staff orb (purple/blue with glow)
        pixel(-2, -16, '#9370DB');
        pixel(0, -16, '#9370DB');
        pixel(2, -16, '#9370DB');
        pixel(-2, -14, '#9370DB');
        pixel(0, -14, '#9370DB');
        pixel(2, -14, '#9370DB');
        pixel(-2, -12, '#9370DB');
        pixel(0, -12, '#9370DB');
        pixel(2, -12, '#9370DB');

        // Orb highlight
        pixel(-1, -15, '#E6E6FA');
        pixel(0, -15, '#E6E6FA');
        pixel(1, -15, '#E6E6FA');
    }

    drawVerticalStaffPixelArt(ctx, centerX, centerY, frameIndex = 0) {
        const pixel = (x, y, color, size = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(centerX + x, centerY + y, size, size);
        };

        // Animation offsets for pulsing effect
        const glowIntensity = frameIndex * 0.3; // 0, 0.3, 0.6 for frames 0, 1, 2
        const orbOffset = Math.sin(frameIndex * Math.PI / 2) * 0.5; // Subtle vertical movement

        // Vertical staff handle (brown) - thinner and more elegant
        const handleY = Math.round(orbOffset);
        pixel(0, -16 + handleY, '#8B4513');
        pixel(0, -14 + handleY, '#8B4513');
        pixel(0, -12 + handleY, '#8B4513');
        pixel(0, -10 + handleY, '#8B4513');
        pixel(0, -8 + handleY, '#8B4513');
        pixel(0, -6 + handleY, '#8B4513');
        pixel(0, -4 + handleY, '#8B4513');
        pixel(0, -2 + handleY, '#8B4513');
        pixel(0, 0 + handleY, '#8B4513');
        pixel(0, 2 + handleY, '#8B4513');
        pixel(0, 4 + handleY, '#8B4513');
        pixel(0, 6 + handleY, '#8B4513');

        // Elegant vertical staff orb (much smaller and more refined)
        const orbY = Math.round(-18 + orbOffset);
        
        // Core orb (bright purple)
        const coreColor = frameIndex === 1 ? '#B894F5' : '#9370DB'; // Brighter on cast frame 1
        pixel(-1, orbY, coreColor);
        pixel(0, orbY, coreColor);
        pixel(1, orbY, coreColor);
        pixel(0, orbY - 1, coreColor);
        pixel(0, orbY + 1, coreColor);

        // Outer glow effect for animation frames
        if (frameIndex > 0) {
            const glowColor = frameIndex === 2 ? '#DDA0DD' : '#C8A2C8'; // Different glow colors
            // Subtle glow around orb
            pixel(-2, orbY, glowColor);
            pixel(2, orbY, glowColor);
            pixel(0, orbY - 2, glowColor);
            pixel(0, orbY + 2, glowColor);
            
            if (frameIndex === 2) {
                // Extra glow for maximum cast frame
                pixel(-1, orbY - 1, glowColor);
                pixel(1, orbY - 1, glowColor);
                pixel(-1, orbY + 1, glowColor);
                pixel(1, orbY + 1, glowColor);
            }
        }

        // Highlight on orb center for all frames
        pixel(0, orbY, '#E6E6FA');
    }

    // Create colored version of wizard sprite
    createColoredWizardSprite(color, pose = 'idle', facingLeft = false) {
        const facingSuffix = facingLeft ? '_left' : '';
        const spriteKey = `wizard_${pose}${facingSuffix}_${color}`;
        
        if (this.sprites.has(spriteKey)) {
            return this.sprites.get(spriteKey);
        }

        const baseSpriteName = `wizard_${pose}${facingSuffix}`;
        const baseSprite = this.sprites.get(baseSpriteName);
        if (!baseSprite) return null;

        // Create new canvas
        const canvas = document.createElement('canvas');
        canvas.width = baseSprite.width;
        canvas.height = baseSprite.height;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        
        // Draw base sprite
        ctx.drawImage(baseSprite, 0, 0);
        
        // Apply color overlay to robe areas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert hex color to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Create darker version of player color for hat
        const hatR = Math.max(0, Math.floor(r * 0.7));
        const hatG = Math.max(0, Math.floor(g * 0.7));
        const hatB = Math.max(0, Math.floor(b * 0.7));
        
        // Create different hue for hair (shift towards brown/orange)
        const hairR = Math.min(255, Math.floor(r * 0.8 + 50));
        const hairG = Math.min(255, Math.floor(g * 0.6 + 30));
        const hairB = Math.max(0, Math.floor(b * 0.4));
        
        // Replace default colors with player colors
        for (let i = 0; i < data.length; i += 4) {
            // Replace blue robe color with player color
            if (data[i] === 65 && data[i + 1] === 105 && data[i + 2] === 225) { // #4169E1
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }
            // Replace default hat color with darker player color
            else if (data[i] === 74 && data[i + 1] === 14 && data[i + 2] === 78) { // #4A0E4E
                data[i] = hatR;
                data[i + 1] = hatG;
                data[i + 2] = hatB;
            }
            // Replace default hair color with player-themed hair color
            else if (data[i] === 139 && data[i + 1] === 69 && data[i + 2] === 19) { // #8B4513
                data[i] = hairR;
                data[i + 1] = hairG;
                data[i + 2] = hairB;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Cache the colored sprite
        this.sprites.set(spriteKey, canvas);
        return canvas;
    }

    getSprite(name, color = null, pose = 'idle', facingLeft = false) {
        if (name === 'wizard' && color) {
            return this.createColoredWizardSprite(color, pose, facingLeft);
        }
        
        // For other sprites like staff, get the appropriate facing version
        if (name === 'staff') {
            const baseName = facingLeft ? 'staff_left' : 'staff';
            return this.sprites.get(baseName);
        }
        
        if (name === 'staff_vertical') {
            return this.sprites.get('staff_vertical');
        }
        
        return this.sprites.get(name);
    }

    // Get direction based on aiming angle (in radians)
    getDirectionFromAngle(angle) {
        // Normalize angle to 0-2π
        angle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        
        // Convert to degrees for easier calculation
        const degrees = (angle * 180) / Math.PI;
        
        // Determine direction based on angle
        if (degrees >= 315 || degrees < 45) {
            return 'right';
        } else if (degrees >= 45 && degrees < 135) {
            return 'front'; // Changed from 'down' to 'front' for consistency
        } else if (degrees >= 135 && degrees < 225) {
            return 'left';
        } else {
            return 'back'; // Changed from 'up' to 'back' for consistency
        }
    }

    // Get appropriate wizard sprite based on direction
    getWizardSpriteForDirection(direction, color, pose) {
        let spriteName;
        let isFlipped = false;
        
        switch (direction) {
            case 'left':
                spriteName = `wizard_${pose === 'cast' ? 'cast' : 'idle'}`;
                isFlipped = true;
                break;
            case 'right':
                spriteName = `wizard_${pose === 'cast' ? 'cast' : 'idle'}`;
                isFlipped = false;
                break;
            case 'back':
                spriteName = 'wizard_back';
                isFlipped = false;
                break;
            case 'front':
                spriteName = 'wizard_front';
                isFlipped = false;
                break;
            default:
                spriteName = 'wizard_idle';
                isFlipped = false;
        }
        
        return this.createColoredWizardSprite(color, spriteName.replace('wizard_', ''), isFlipped);
    }

    // Get appropriate staff sprite based on direction
    getStaffSpriteForDirection(direction, staffRotation = 0) {
        switch (direction) {
            case 'left':
                return this.sprites.get('staff_left');
            case 'right':
                return this.sprites.get('staff');
            case 'front':
            case 'back':
                // Use animated vertical staff based on cast state
                if (Math.abs(staffRotation) > 0.15) { // Significant rotation means casting
                    const rotationProgress = Math.abs(staffRotation) / (20 * Math.PI / 180); // Normalize to 0-1
                    if (rotationProgress > 0.7) {
                        return this.sprites.get('staff_vertical_cast2'); // Max cast frame
                    } else if (rotationProgress > 0.3) {
                        return this.sprites.get('staff_vertical_cast1'); // Mid cast frame
                    }
                }
                return this.sprites.get('staff_vertical_idle'); // Idle frame
            default:
                return this.sprites.get('staff');
        }
    }

    // Animation system for staff casting
    createCastAnimation(playerId) {
        const animation = {
            type: 'cast',
            startTime: Date.now(),
            duration: 300, // 300ms cast animation
            phase: 'wind-up' // wind-up -> cast -> return
        };
        
        this.animations.set(playerId, animation);
        
        // Auto-remove animation after duration
        setTimeout(() => {
            this.animations.delete(playerId);
        }, animation.duration);
    }

    getAnimationState(playerId) {
        return this.animations.get(playerId);
    }

    getStaffRotation(playerId) {
        const animation = this.getAnimationState(playerId);
        if (!animation || animation.type !== 'cast') {
            return 0; // No rotation when not casting
        }

        const elapsed = Date.now() - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);
        
        // Smooth rotation: 0° -> 20° -> 0°
        const maxRotation = 20 * Math.PI / 180; // 20 degrees in radians
        const rotation = Math.sin(progress * Math.PI) * maxRotation;
        
        return rotation;
    }

    getCastPose(playerId) {
        const animation = this.getAnimationState(playerId);
        if (!animation || animation.type !== 'cast') {
            return 'idle';
        }

        const elapsed = Date.now() - animation.startTime;
        const progress = elapsed / animation.duration;
        
        if (progress < 0.3) {
            return 'idle'; // Wind-up
        } else if (progress < 0.7) {
            return 'cast'; // Casting pose
        } else {
            return 'idle'; // Return to idle
        }
    }
}
