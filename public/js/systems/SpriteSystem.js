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
        
        // Create cape sprites for all directions
        this.createCapeSprites();
        
        // Create leg sprites for all directions and animation frames
        this.createLegSprites();
        
        // Create left-facing versions (flip right-facing sprites)
        this.createFlippedSprites();
    }

    createFlippedSprites() {
        // Create horizontally flipped versions for left-facing
        const spritesToFlip = ['wizard_idle', 'wizard_cast', 'staff', 'cape_side', 'legs_side_idle', 'legs_side_walk1', 'legs_side_walk2'];
        
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

    createCapeSprites() {
        // Create cape sprites for different viewing angles
        this.createCapeSideSprite();
        this.createCapeFrontSprite();
        this.createCapeBackSprite();
    }

    createCapeSideSprite() {
        // Cape viewed from the side (for left/right facing)
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 44;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawCapePixelArt(ctx, 18, 22, 'side', null); // null = use default colors
        
        this.sprites.set('cape_side', canvas);
    }

    createCapeFrontSprite() {
        // Cape viewed from front (partially visible over shoulders)
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 44;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawCapePixelArt(ctx, 18, 22, 'front', null); // null = use default colors
        
        this.sprites.set('cape_front', canvas);
    }

    createCapeBackSprite() {
        // Cape viewed from behind (full cape visible)
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 44;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawCapePixelArt(ctx, 18, 22, 'back', null); // null = use default colors
        
        this.sprites.set('cape_back', canvas);
    }

    createLegSprites() {
        // Create leg sprites for all directions and animation frames
        this.createLegsSideSprites();
        this.createLegsFrontSprites();
        this.createLegsBackSprites();
    }

    createLegsSideSprites() {
        // Side-view legs (for left/right facing) with walk animation
        // Idle frame
        this.createSingleLegSprite('legs_side_idle', 'side', 'idle');
        // Walk frame 1 (left leg forward)
        this.createSingleLegSprite('legs_side_walk1', 'side', 'walk1');
        // Walk frame 2 (right leg forward)
        this.createSingleLegSprite('legs_side_walk2', 'side', 'walk2');
    }

    createLegsFrontSprites() {
        // Front-view legs with walk animation
        this.createSingleLegSprite('legs_front_idle', 'front', 'idle');
        this.createSingleLegSprite('legs_front_walk1', 'front', 'walk1');
        this.createSingleLegSprite('legs_front_walk2', 'front', 'walk2');
    }

    createLegsBackSprites() {
        // Back-view legs with walk animation
        this.createSingleLegSprite('legs_back_idle', 'back', 'idle');
        this.createSingleLegSprite('legs_back_walk1', 'back', 'walk1');
        this.createSingleLegSprite('legs_back_walk2', 'back', 'walk2');
    }

    createSingleLegSprite(spriteName, direction, animFrame) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 28; // Increased from 20 to 28 to make legs longer
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        this.drawLegsPixelArt(ctx, 16, 14, direction, animFrame); // Adjusted centerY from 10 to 14
        
        this.sprites.set(spriteName, canvas);
    }

    drawLegsPixelArt(ctx, centerX, centerY, direction = 'side', animFrame = 'idle', playerColor = null) {
        const pixel = (x, y, color, size = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(centerX + x, centerY + y, size, size);
        };

        // Generate leg colors based on player color if provided
        let pantColor, bootColor, pantShadow, bootShadow;
        
        if (playerColor) {
            // Convert player color to leg color variations
            const hex = playerColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Create pant color (darker version of player color)
            const pantR = Math.floor(r * 0.4);
            const pantG = Math.floor(g * 0.4);
            const pantB = Math.floor(b * 0.4);
            
            // Create boot color (brown/leather)
            const bootR = Math.min(255, Math.floor(r * 0.3 + 60));
            const bootG = Math.min(255, Math.floor(g * 0.3 + 30));
            const bootB = Math.floor(b * 0.2);
            
            pantColor = `rgb(${pantR}, ${pantG}, ${pantB})`;
            pantShadow = `rgb(${Math.floor(pantR * 0.7)}, ${Math.floor(pantG * 0.7)}, ${Math.floor(pantB * 0.7)})`;
            bootColor = `rgb(${bootR}, ${bootG}, ${bootB})`;
            bootShadow = `rgb(${Math.floor(bootR * 0.7)}, ${Math.floor(bootG * 0.7)}, ${Math.floor(bootB * 0.7)})`;
        } else {
            // Default leg colors
            pantColor = '#2F2F2F';    // Dark gray pants
            pantShadow = '#1F1F1F';   // Darker shadow
            bootColor = '#8B4513';    // Brown boots
            bootShadow = '#654321';   // Dark brown shadow
        }

        if (direction === 'side') {
            // Side view legs with walk animation
            if (animFrame === 'idle') {
                // Both legs together, standing
                // Left leg (player's left, our right side)
                pixel(2, -8, pantColor, 2);  // Upper thigh
                pixel(2, -6, pantColor, 2);  // Lower thigh
                pixel(2, -4, pantColor, 2);  // Knee
                pixel(2, -2, pantColor, 2);  // Upper shin
                pixel(2, 0, pantColor, 2);   // Lower shin
                pixel(2, 2, bootColor, 2);   // Boot top
                pixel(2, 4, bootColor, 2);   // Boot middle
                pixel(2, 6, bootColor, 2);   // Boot bottom
                pixel(4, 6, bootColor);      // Foot extension
                
                // Right leg (player's right, our left side) - slightly behind
                pixel(-2, -8, pantColor, 2);
                pixel(-2, -6, pantColor, 2);
                pixel(-2, -4, pantColor, 2);
                pixel(-2, -2, pantColor, 2);
                pixel(-2, 0, pantColor, 2);
                pixel(-2, 2, bootColor, 2);
                pixel(-2, 4, bootColor, 2);
                pixel(-2, 6, bootColor, 2);
                pixel(-4, 6, bootColor);
                
                // Add shadows
                pixel(3, -7, pantShadow);
                pixel(3, -5, pantShadow);
                pixel(3, 1, pantShadow);
                pixel(3, 3, bootShadow);
                pixel(3, 5, bootShadow);
                pixel(-1, -7, pantShadow);
                pixel(-1, -5, pantShadow);
                pixel(-1, 1, pantShadow);
                pixel(-1, 3, bootShadow);
                pixel(-1, 5, bootShadow);
                
            } else if (animFrame === 'walk1') {
                // Left leg forward, right leg back
                // Left leg forward
                pixel(4, -8, pantColor, 2);
                pixel(4, -6, pantColor, 2);
                pixel(4, -4, pantColor, 2);
                pixel(4, -2, pantColor, 2);
                pixel(4, 0, pantColor, 2);
                pixel(4, 2, bootColor, 2);
                pixel(4, 4, bootColor, 2);
                pixel(4, 6, bootColor, 2);
                pixel(6, 6, bootColor);
                
                // Right leg back
                pixel(-4, -7, pantColor, 2);
                pixel(-4, -5, pantColor, 2);
                pixel(-4, -3, pantColor, 2);
                pixel(-4, -1, pantColor, 2);
                pixel(-4, 1, pantColor, 2);
                pixel(-4, 3, bootColor, 2);
                pixel(-4, 5, bootColor, 2);
                pixel(-4, 7, bootColor, 2);
                pixel(-6, 7, bootColor);
                
                // Shadows
                pixel(5, -7, pantShadow);
                pixel(5, 1, pantShadow);
                pixel(5, 3, bootShadow);
                pixel(5, 5, bootShadow);
                pixel(-3, -6, pantShadow);
                pixel(-3, 2, pantShadow);
                pixel(-3, 4, bootShadow);
                pixel(-3, 6, bootShadow);
                
            } else if (animFrame === 'walk2') {
                // Right leg forward, left leg back
                // Right leg forward
                pixel(-4, -8, pantColor, 2);
                pixel(-4, -6, pantColor, 2);
                pixel(-4, -4, pantColor, 2);
                pixel(-4, -2, pantColor, 2);
                pixel(-4, 0, pantColor, 2);
                pixel(-4, 2, bootColor, 2);
                pixel(-4, 4, bootColor, 2);
                pixel(-4, 6, bootColor, 2);
                pixel(-6, 6, bootColor);
                
                // Left leg back
                pixel(4, -7, pantColor, 2);
                pixel(4, -5, pantColor, 2);
                pixel(4, -3, pantColor, 2);
                pixel(4, -1, pantColor, 2);
                pixel(4, 1, pantColor, 2);
                pixel(4, 3, bootColor, 2);
                pixel(4, 5, bootColor, 2);
                pixel(4, 7, bootColor, 2);
                pixel(6, 7, bootColor);
                
                // Shadows
                pixel(-3, -7, pantShadow);
                pixel(-3, 1, pantShadow);
                pixel(-3, 3, bootShadow);
                pixel(-3, 5, bootShadow);
                pixel(5, -6, pantShadow);
                pixel(5, 2, pantShadow);
                pixel(5, 4, bootShadow);
                pixel(5, 6, bootShadow);
            }
            
        } else if (direction === 'front') {
            // Front view legs
            if (animFrame === 'idle') {
                // Both legs visible, standing
                // Left leg
                pixel(-4, -8, pantColor, 2);
                pixel(-4, -6, pantColor, 2);
                pixel(-4, -4, pantColor, 2);
                pixel(-4, -2, pantColor, 2);
                pixel(-4, 0, pantColor, 2);
                pixel(-4, 2, bootColor, 2);
                pixel(-4, 4, bootColor, 2);
                pixel(-4, 6, bootColor, 2);
                
                // Right leg
                pixel(2, -8, pantColor, 2);
                pixel(2, -6, pantColor, 2);
                pixel(2, -4, pantColor, 2);
                pixel(2, -2, pantColor, 2);
                pixel(2, 0, pantColor, 2);
                pixel(2, 2, bootColor, 2);
                pixel(2, 4, bootColor, 2);
                pixel(2, 6, bootColor, 2);
                
                // Shadows
                pixel(-3, -7, pantShadow);
                pixel(-3, 1, pantShadow);
                pixel(-3, 3, bootShadow);
                pixel(-3, 5, bootShadow);
                pixel(3, -7, pantShadow);
                pixel(3, 1, pantShadow);
                pixel(3, 3, bootShadow);
                pixel(3, 5, bootShadow);
                
            } else if (animFrame === 'walk1') {
                // Left leg slightly forward
                // Left leg
                pixel(-4, -8, pantColor, 2);
                pixel(-4, -6, pantColor, 2);
                pixel(-4, -4, pantColor, 2);
                pixel(-4, -2, pantColor, 2);
                pixel(-4, 0, pantColor, 2);
                pixel(-4, 2, bootColor, 2);
                pixel(-4, 4, bootColor, 2);
                pixel(-4, 6, bootColor, 2);
                
                // Right leg
                pixel(2, -7, pantColor, 2);
                pixel(2, -5, pantColor, 2);
                pixel(2, -3, pantColor, 2);
                pixel(2, -1, pantColor, 2);
                pixel(2, 1, pantColor, 2);
                pixel(2, 3, bootColor, 2);
                pixel(2, 5, bootColor, 2);
                pixel(2, 7, bootColor, 2);
                
                // Shadows
                pixel(-3, -7, pantShadow);
                pixel(-3, 1, pantShadow);
                pixel(-3, 3, bootShadow);
                pixel(-3, 5, bootShadow);
                pixel(3, -6, pantShadow);
                pixel(3, 2, pantShadow);
                pixel(3, 4, bootShadow);
                pixel(3, 6, bootShadow);
                
            } else if (animFrame === 'walk2') {
                // Right leg slightly forward
                // Left leg
                pixel(-4, -7, pantColor, 2);
                pixel(-4, -5, pantColor, 2);
                pixel(-4, -3, pantColor, 2);
                pixel(-4, -1, pantColor, 2);
                pixel(-4, 1, pantColor, 2);
                pixel(-4, 3, bootColor, 2);
                pixel(-4, 5, bootColor, 2);
                pixel(-4, 7, bootColor, 2);
                
                // Right leg
                pixel(2, -8, pantColor, 2);
                pixel(2, -6, pantColor, 2);
                pixel(2, -4, pantColor, 2);
                pixel(2, -2, pantColor, 2);
                pixel(2, 0, pantColor, 2);
                pixel(2, 2, bootColor, 2);
                pixel(2, 4, bootColor, 2);
                pixel(2, 6, bootColor, 2);
                
                // Shadows
                pixel(-3, -6, pantShadow);
                pixel(-3, 2, pantShadow);
                pixel(-3, 4, bootShadow);
                pixel(-3, 6, bootShadow);
                pixel(3, -7, pantShadow);
                pixel(3, 1, pantShadow);
                pixel(3, 3, bootShadow);
                pixel(3, 5, bootShadow);
            }
            
        } else if (direction === 'back') {
            // Back view legs - similar to front but slightly different positioning
            if (animFrame === 'idle') {
                // Both legs visible from behind
                // Left leg
                pixel(-3, -8, pantColor, 2);
                pixel(-3, -6, pantColor, 2);
                pixel(-3, -4, pantColor, 2);
                pixel(-3, -2, pantColor, 2);
                pixel(-3, 0, pantColor, 2);
                pixel(-3, 2, bootColor, 2);
                pixel(-3, 4, bootColor, 2);
                pixel(-3, 6, bootColor, 2);
                
                // Right leg
                pixel(1, -8, pantColor, 2);
                pixel(1, -6, pantColor, 2);
                pixel(1, -4, pantColor, 2);
                pixel(1, -2, pantColor, 2);
                pixel(1, 0, pantColor, 2);
                pixel(1, 2, bootColor, 2);
                pixel(1, 4, bootColor, 2);
                pixel(1, 6, bootColor, 2);
                
                // Shadows
                pixel(-2, -7, pantShadow);
                pixel(-2, 1, pantShadow);
                pixel(-2, 3, bootShadow);
                pixel(-2, 5, bootShadow);
                pixel(2, -7, pantShadow);
                pixel(2, 1, pantShadow);
                pixel(2, 3, bootShadow);
                pixel(2, 5, bootShadow);
                
            } else if (animFrame === 'walk1') {
                // Left leg forward (less visible from back)
                // Left leg
                pixel(-3, -8, pantColor, 2);
                pixel(-3, -6, pantColor, 2);
                pixel(-3, -4, pantColor, 2);
                pixel(-3, -2, pantColor, 2);
                pixel(-3, 0, pantColor, 2);
                pixel(-3, 2, bootColor, 2);
                pixel(-3, 4, bootColor, 2);
                pixel(-3, 6, bootColor, 2);
                
                // Right leg back
                pixel(1, -7, pantColor, 2);
                pixel(1, -5, pantColor, 2);
                pixel(1, -3, pantColor, 2);
                pixel(1, -1, pantColor, 2);
                pixel(1, 1, pantColor, 2);
                pixel(1, 3, bootColor, 2);
                pixel(1, 5, bootColor, 2);
                pixel(1, 7, bootColor, 2);
                
                // Shadows
                pixel(-2, -7, pantShadow);
                pixel(-2, 1, pantShadow);
                pixel(-2, 3, bootShadow);
                pixel(-2, 5, bootShadow);
                pixel(2, -6, pantShadow);
                pixel(2, 2, pantShadow);
                pixel(2, 4, bootShadow);
                pixel(2, 6, bootShadow);
                
            } else if (animFrame === 'walk2') {
                // Right leg forward
                // Left leg back
                pixel(-3, -7, pantColor, 2);
                pixel(-3, -5, pantColor, 2);
                pixel(-3, -3, pantColor, 2);
                pixel(-3, -1, pantColor, 2);
                pixel(-3, 1, pantColor, 2);
                pixel(-3, 3, bootColor, 2);
                pixel(-3, 5, bootColor, 2);
                pixel(-3, 7, bootColor, 2);
                
                // Right leg
                pixel(1, -8, pantColor, 2);
                pixel(1, -6, pantColor, 2);
                pixel(1, -4, pantColor, 2);
                pixel(1, -2, pantColor, 2);
                pixel(1, 0, pantColor, 2);
                pixel(1, 2, bootColor, 2);
                pixel(1, 4, bootColor, 2);
                pixel(1, 6, bootColor, 2);
                
                // Shadows
                pixel(-2, -6, pantShadow);
                pixel(-2, 2, pantShadow);
                pixel(-2, 4, bootShadow);
                pixel(-2, 6, bootShadow);
                pixel(2, -7, pantShadow);
                pixel(2, 1, pantShadow);
                pixel(2, 3, bootShadow);
                pixel(2, 5, bootShadow);
            }
        }
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

    drawCapePixelArt(ctx, centerX, centerY, direction = 'back', playerColor = null) {
        const pixel = (x, y, color, size = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(centerX + x, centerY + y, size, size);
        };

        // Generate cape color based on player color if provided
        let capeColor, capeShadow, capeHighlight;
        
        if (playerColor) {
            // Convert player color to cape color variations
            const hex = playerColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Create cape color variations based on player color
            // Shift the hue and adjust saturation for cape
            const capeR = Math.min(255, Math.max(0, Math.floor(r * 0.8 + 40)));
            const capeG = Math.min(255, Math.max(0, Math.floor(g * 0.6 + 20)));
            const capeB = Math.min(255, Math.max(0, Math.floor(b * 1.2)));
            
            // Create shadow (darker version)
            const shadowR = Math.floor(capeR * 0.6);
            const shadowG = Math.floor(capeG * 0.6);
            const shadowB = Math.floor(capeB * 0.6);
            
            // Create highlight (lighter version)
            const highlightR = Math.min(255, Math.floor(capeR * 1.3));
            const highlightG = Math.min(255, Math.floor(capeG * 1.3));
            const highlightB = Math.min(255, Math.floor(capeB * 1.3));
            
            capeColor = `rgb(${capeR}, ${capeG}, ${capeB})`;
            capeShadow = `rgb(${shadowR}, ${shadowG}, ${shadowB})`;
            capeHighlight = `rgb(${highlightR}, ${highlightG}, ${highlightB})`;
        } else {
            // Default red cape colors if no player color provided
            capeColor = '#CC0000';      // Main cape color (red)
            capeShadow = '#800000';     // Darker red for shadows
            capeHighlight = '#FF3333'; // Lighter red for highlights
        }
        
        const clasp = '#FFD700';          // Gold clasp (always gold)

        if (direction === 'back') {
            // Full cape visible from behind - starting from shoulders only
            
            // Cape shoulders attachment - at shoulder level
            pixel(-3, -8, clasp);
            pixel(-2, -8, clasp);
            pixel(-1, -8, clasp);
            pixel(0, -8, clasp);
            pixel(1, -8, clasp);
            pixel(2, -8, clasp);
            
            // Cape main body - flowing outward from shoulders
            // Upper section - starting from shoulder level
            pixel(-5, -6, capeColor, 2);
            pixel(-3, -6, capeColor, 2);
            pixel(-1, -6, capeColor, 2);
            pixel(1, -6, capeColor, 2);
            pixel(3, -6, capeColor, 2);
            
            // Middle section
            pixel(-6, -4, capeColor, 2);
            pixel(-4, -4, capeColor, 2);
            pixel(-2, -4, capeColor, 2);
            pixel(0, -4, capeColor, 2);
            pixel(2, -4, capeColor, 2);
            pixel(4, -4, capeColor, 2);
            
            // Lower sections - flowing downward
            for (let row = 0; row < 8; row++) {
                const y = -2 + row * 2;
                const width = Math.max(2, 5 - Math.floor(row * 0.3)); // Start narrower, taper gradually
                
                for (let col = -width; col <= width; col += 2) {
                    pixel(col, y, capeColor, 2);
                }
            }
            
            // Add shadows on the right side for depth
            for (let row = 0; row < 6; row++) {
                const y = -2 + row * 2;
                const shadowX = 3 - Math.floor(row * 0.2);
                if (shadowX >= -4) { // Don't go too far left
                    pixel(shadowX, y, capeShadow, 2);
                }
            }
            
            // Add highlights on the left side
            for (let row = 0; row < 4; row++) {
                const y = 0 + row * 2;
                const highlightX = -4 + Math.floor(row * 0.1);
                pixel(highlightX, y, capeHighlight);
            }
            
        } else if (direction === 'side') {
            // Cape from side view - flowing behind the character from shoulders
            
            // Cape attachment at shoulder
            pixel(-2, -8, clasp);
            pixel(-1, -8, clasp);
            pixel(0, -8, clasp);
            
            // Cape flowing behind (starting from shoulders)
            // Upper flowing section
            pixel(-6, -6, capeColor, 2);
            pixel(-4, -6, capeColor, 2);
            pixel(-2, -6, capeColor, 2);
            
            pixel(-8, -4, capeColor, 2);
            pixel(-6, -4, capeColor, 2);
            pixel(-4, -4, capeColor, 2);
            
            // Flowing downward from shoulders
            for (let row = 0; row < 8; row++) {
                const y = -2 + row * 2;
                const width = 4 - Math.floor(row * 0.2);
                
                for (let col = -width - 4; col <= -2; col += 2) {
                    pixel(col, y, capeColor, 2);
                }
            }
            
            // Add shadows
            for (let row = 0; row < 6; row++) {
                const y = -2 + row * 2;
                pixel(-4, y, capeShadow, 2);
                pixel(-6, y, capeShadow);
            }
            
        } else if (direction === 'front') {
            // Cape from front - very subtle shoulder hints only, no visible flowing cape
            
            // Very subtle left shoulder cape hint
            pixel(-7, -6, capeColor);
            pixel(-6, -6, capeColor);
            pixel(-7, -4, capeColor);
            pixel(-6, -4, capeColor);
            pixel(-7, -2, capeColor);
            
            // Very subtle right shoulder cape hint
            pixel(5, -6, capeColor);
            pixel(6, -6, capeColor);
            pixel(5, -4, capeColor);
            pixel(6, -4, capeColor);
            pixel(6, -2, capeColor);
            
            // Small collar clasp visible at neck line
            pixel(-1, -9, clasp);
            pixel(0, -9, clasp);
            pixel(1, -9, clasp);
            
            // Tiny highlights on shoulder edges
            pixel(-6, -5, capeHighlight);
            pixel(5, -5, capeHighlight);
        }
    }

    // Create colored version of cape sprite
    createColoredCapeSprite(direction, playerColor) {
        const spriteKey = `cape_${direction}_${playerColor}`;
        
        if (this.sprites.has(spriteKey)) {
            return this.sprites.get(spriteKey);
        }

        // Create new canvas for colored cape
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 44;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        
        // Draw cape with player-specific colors
        this.drawCapePixelArt(ctx, 18, 22, direction, playerColor);
        
        // Cache the colored cape sprite
        this.sprites.set(spriteKey, canvas);
        return canvas;
    }

    // Create colored version of leg sprite
    createColoredLegSprite(direction, animFrame, playerColor) {
        const spriteKey = `legs_${direction}_${animFrame}_${playerColor}`;
        
        if (this.sprites.has(spriteKey)) {
            return this.sprites.get(spriteKey);
        }

        // Create new canvas for colored legs
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        
        // Draw legs with player-specific colors
        this.drawLegsPixelArt(ctx, 16, 10, direction, animFrame, playerColor);
        
        // Cache the colored leg sprite
        this.sprites.set(spriteKey, canvas);
        return canvas;
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

    // Get appropriate cape sprite based on direction
    getCapeSprite(direction, playerColor = null) {
        if (playerColor) {
            // Create colored cape based on player color
            let actualDirection = direction;
            
            // Handle left-facing (flipped) capes
            if (direction === 'left') {
                const flippedKey = `cape_side_left_${playerColor}`;
                if (!this.sprites.has(flippedKey)) {
                    // Create flipped version of the colored side cape
                    const originalSprite = this.createColoredCapeSprite('side', playerColor);
                    const flippedCanvas = document.createElement('canvas');
                    flippedCanvas.width = originalSprite.width;
                    flippedCanvas.height = originalSprite.height;
                    const ctx = flippedCanvas.getContext('2d');
                    
                    ctx.imageSmoothingEnabled = false;
                    ctx.scale(-1, 1);
                    ctx.drawImage(originalSprite, -originalSprite.width, 0);
                    
                    this.sprites.set(flippedKey, flippedCanvas);
                }
                return this.sprites.get(flippedKey);
            } else if (direction === 'right') {
                actualDirection = 'side';
            }
            
            return this.createColoredCapeSprite(actualDirection, playerColor);
        }
        
        // Fallback to default colored capes
        switch (direction) {
            case 'left':
                return this.sprites.get('cape_side_left');
            case 'right':
                return this.sprites.get('cape_side');
            case 'back':
                return this.sprites.get('cape_back');
            case 'front':
                return this.sprites.get('cape_front');
            default:
                return this.sprites.get('cape_side');
        }
    }

    // Get appropriate leg sprite based on direction and movement
    getLegSprite(direction, playerColor = null, isMoving = false, playerId = null) {
        // Determine animation frame based on movement
        let animFrame = 'idle';
        
        if (isMoving && playerId) {
            // Create walking animation based on time
            const walkSpeed = 8; // Animation speed
            const currentTime = Date.now();
            const walkCycle = Math.floor((currentTime / (1000 / walkSpeed)) % 2);
            animFrame = walkCycle === 0 ? 'walk1' : 'walk2';
        }

        // Handle left-facing (flipped) legs
        if (direction === 'left') {
            if (playerColor) {
                const flippedKey = `legs_side_${animFrame}_left_${playerColor}`;
                if (!this.sprites.has(flippedKey)) {
                    // Create flipped version of the colored side legs
                    const originalSprite = this.createColoredLegSprite('side', animFrame, playerColor);
                    const flippedCanvas = document.createElement('canvas');
                    flippedCanvas.width = originalSprite.width;
                    flippedCanvas.height = originalSprite.height;
                    const ctx = flippedCanvas.getContext('2d');
                    
                    ctx.imageSmoothingEnabled = false;
                    ctx.scale(-1, 1);
                    ctx.drawImage(originalSprite, -originalSprite.width, 0);
                    
                    this.sprites.set(flippedKey, flippedCanvas);
                }
                return this.sprites.get(flippedKey);
            } else {
                // Use default left-facing legs
                return this.sprites.get(`legs_side_${animFrame}_left`);
            }
        }

        // Handle other directions
        if (playerColor) {
            let actualDirection = direction;
            if (direction === 'right') {
                actualDirection = 'side';
            }
            return this.createColoredLegSprite(actualDirection, animFrame, playerColor);
        }
        
        // Fallback to default leg sprites
        let actualDirection = direction;
        if (direction === 'right') {
            actualDirection = 'side';
        }
        
        return this.sprites.get(`legs_${actualDirection}_${animFrame}`);
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

    // Gandalf-style Ring of Fire casting animation
    createRingOfFireCastAnimation(playerId) {
        const animation = {
            type: 'ringOfFire',
            startTime: Date.now(),
            duration: 1200, // 1.2 second dramatic animation
            phase: 'raise' // raise -> slam -> hold -> return
        };
        
        this.animations.set(playerId, animation);
        
        // Auto-remove animation after duration
        setTimeout(() => {
            this.animations.delete(playerId);
        }, animation.duration);
    }

    // Create Ring of Fire visual effect
    createRingOfFireEffect(data) {
        const effect = {
            id: data.id,
            x: data.x,
            y: data.y,
            radius: data.radius,
            startTime: Date.now(),
            duration: 2500, // Effect lasts 2.5 seconds (was 1.5)
            maxRadius: data.radius,
            expandTime: 800, // Ring expands for 800ms (was 400ms)
            holdTime: 1200, // Ring holds for 1.2 seconds (was 800ms)
            fadeTime: 500 // Ring fades for 500ms (was 300ms)
        };
        
        this.ringOfFireEffects = this.ringOfFireEffects || new Map();
        this.ringOfFireEffects.set(data.id, effect);
        
        // Auto-remove effect after duration
        setTimeout(() => {
            if (this.ringOfFireEffects) {
                this.ringOfFireEffects.delete(data.id);
            }
        }, effect.duration);
    }

    getAnimationState(playerId) {
        return this.animations.get(playerId);
    }

    getStaffRotation(playerId) {
        const animation = this.getAnimationState(playerId);
        if (!animation) {
            return 0; // No rotation when not casting
        }

        const elapsed = Date.now() - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);
        
        if (animation.type === 'cast') {
            // Regular spell cast: 0° -> 20° -> 0°
            const maxRotation = 20 * Math.PI / 180; // 20 degrees in radians
            const rotation = Math.sin(progress * Math.PI) * maxRotation;
            return rotation;
        } else if (animation.type === 'ringOfFire') {
            // Gandalf-style Ring of Fire: raise -> slam down -> hold -> return
            const phases = {
                raise: 0.25,    // 25% of animation
                slam: 0.15,     // 15% of animation  
                hold: 0.4,      // 40% of animation
                return: 0.2     // 20% of animation
            };
            
            if (progress < phases.raise) {
                // Raise staff high above head
                const phaseProgress = progress / phases.raise;
                return -Math.PI * 0.6 * phaseProgress; // Raise to -108 degrees
            } else if (progress < phases.raise + phases.slam) {
                // Slam staff down to ground
                const phaseProgress = (progress - phases.raise) / phases.slam;
                const startRotation = -Math.PI * 0.6;
                const endRotation = Math.PI * 0.5; // 90 degrees down
                return startRotation + (endRotation - startRotation) * phaseProgress;
            } else if (progress < phases.raise + phases.slam + phases.hold) {
                // Hold staff down (dramatic pause)
                return Math.PI * 0.5; // 90 degrees down
            } else {
                // Return to normal position
                const phaseProgress = (progress - phases.raise - phases.slam - phases.hold) / phases.return;
                const startRotation = Math.PI * 0.5;
                return startRotation * (1 - phaseProgress);
            }
        }
        
        return 0;
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
