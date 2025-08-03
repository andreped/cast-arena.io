export class SpriteSystem {
    constructor() {
        this.sprites = new Map();
        this.animations = new Map();
        this.createWizardSprites();
    }

    createWizardSprites() {
        // Create pixel art wizard sprites directly in code for now
        // Later we can load from actual sprite sheets
        this.createWizardIdleSprite();
        this.createWizardCastSprite();
        this.createStaffSprite();
        
        // Create left-facing versions
        this.createFlippedSprites();
    }

    createFlippedSprites() {
        // Create horizontally flipped versions of all sprites for left-facing
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

    createStaffSprite() {
        // Create staff sprite separately for easier rotation
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawStaffPixelArt(ctx, 12, 16);
        
        this.sprites.set('staff', canvas);
    }

    drawWizardPixelArt(ctx, centerX, centerY, pose = 'idle') {
        const pixel = (x, y, color, size = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(centerX + x, centerY + y, size, size);
        };

        // Hat (dark gray/black)
        pixel(-6, -18, '#2C2C2C', 2);
        pixel(-4, -18, '#2C2C2C', 2);
        pixel(-2, -18, '#2C2C2C', 2);
        pixel(0, -18, '#2C2C2C', 2);
        pixel(2, -18, '#2C2C2C', 2);
        pixel(4, -18, '#2C2C2C', 2);
        
        pixel(-4, -16, '#2C2C2C', 2);
        pixel(-2, -16, '#2C2C2C', 2);
        pixel(0, -16, '#2C2C2C', 2);
        pixel(2, -16, '#2C2C2C', 2);
        
        pixel(-2, -14, '#2C2C2C', 2);
        pixel(0, -14, '#2C2C2C', 2);
        
        // Hat star
        pixel(-1, -15, '#FFD700');
        pixel(0, -16, '#FFD700');
        pixel(1, -15, '#FFD700');
        pixel(0, -14, '#FFD700');
        pixel(0, -15, '#FFD700');

        // Face (peach)
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

        // Eyes (adjusted to face right more clearly)
        pixel(-2, -11, '#000000');
        pixel(2, -11, '#000000');

        // Beard (white/gray) - Enhanced and more prominent
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
        
        // Beard highlights for more definition
        pixel(-3, -5, '#F0F0F0');
        pixel(-1, -5, '#F0F0F0');
        pixel(1, -5, '#F0F0F0');
        pixel(-2, -3, '#F0F0F0');
        pixel(0, -3, '#F0F0F0');
        pixel(-1, -1, '#F0F0F0');

        // Body/Robe - color will be applied dynamically
        const bodyColor = '#4169E1'; // Default blue, will be overridden
        
        // Robe body
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

        // Arms (adjusted for clearer right-facing orientation)
        if (pose === 'cast') {
            // Casting arm extended to the right
            pixel(6, -6, '#FFDBAC');
            pixel(8, -6, '#FFDBAC');
            pixel(10, -6, '#FFDBAC');
            // Left arm slightly back
            pixel(-6, -3, '#FFDBAC');
        } else {
            // Idle arms - right arm more prominent (facing right)
            pixel(-6, -2, '#FFDBAC'); // Left arm
            pixel(6, -2, '#FFDBAC');  // Right arm (moved one pixel right)
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
        
        // Replace blue robe color with player color
        for (let i = 0; i < data.length; i += 4) {
            // Check if this pixel is the default robe color
            if (data[i] === 65 && data[i + 1] === 105 && data[i + 2] === 225) { // #4169E1
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
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
        
        return this.sprites.get(name);
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
