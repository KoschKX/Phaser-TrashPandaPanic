export { Package };

class Package extends Phaser.Physics.Arcade.Sprite {
    static createAnimations(scene) {
        if (scene.anims.exists('package_idle')) return;
        
        scene.anims.create({
            key: 'package_idle',
            frames: scene.anims.generateFrameNumbers('package', { start: 0, end: 29 }),
            frameRate: 12,
            repeat: -1
        });
    }
    
    static getPlacementY(platforms, platformIndex, pkg = null) {
        const platform = platforms[platformIndex];
        const packageScale = (platform.height / 512) * 1;
        const packageHeight = 512 * packageScale;
        return platform.surfaceY - (packageHeight / 10) ;
    }
    
    static spawn(scene, platforms, rainbowColors, colorIndex) {
        if (platforms.length === 0) return null;
        
        const platIndex = Phaser.Math.Between(0, platforms.length - 1);
        const platform = platforms[platIndex];
        const x = platform.getRandomX();
        
        const targetHeight = platforms[platIndex].height;
        const packageScale = (targetHeight / 512) * 1;
        
        const pkg = new Package(scene, x, 0, platIndex);
        pkg.play('package_idle');
        
        pkg.setScale(packageScale);
        
        const y = Package.getPlacementY(platforms, platIndex, pkg);
        pkg.y = y;
        
        if (pkg.body) {
            pkg.body.y = pkg.y - pkg.body.halfHeight;
        }
        
        const outline = scene.add.sprite(x, y, 'package', 0);
        outline.setScale(packageScale * 1.08);
        outline.setTintFill(0xFFFFFF);
        outline.setDepth(platIndex + 0.9);
        outline.play('package_idle');
        
        // Apply rainbow tint
        const baseColor = rainbowColors[colorIndex % rainbowColors.length];
        const r = ((baseColor >> 16) & 0xFF);
        const g = ((baseColor >> 8) & 0xFF);
        const b = (baseColor & 0xFF);
        const s = 1.5;
        const tintColor = ((Math.floor((r + 255) / s) << 16) | (Math.floor((g + 255) / s) << 8) | Math.floor((b + 255) / s));
        pkg.setTint(tintColor, tintColor, tintColor, tintColor);
        
        pkg.setDepth(platIndex + 1);
        pkg.setData('outline', outline);
        
        pkg.body.allowGravity = false;
        pkg.body.setVelocityX(0);
        pkg.body.setImmovable(true);
        
        pkg.setData('pickedUp', false);
        pkg.setData('falling', false);
        pkg.setData('tintColor', tintColor);
        
        return pkg;
    }
    
    static spawnBonus(scene, platforms, rainbowColors, colorIndex) {
        if (platforms.length === 0) return null;
        
        const topPlatform = platforms[0];
        const targetHeight = topPlatform.height;
        const packageScale = (targetHeight / 512) * 1;
        
        const x = 400; // Center of screen
        const y = -50; // Above screen
        
        // Create white outline sprite (regular sprite, not Package instance)
        const outline = scene.add.sprite(x, y, 'package', 0);
        outline.setScale(packageScale * 1.08);
        outline.setTintFill(0xFFFFFF);
        outline.setDepth(0.9);
        outline.play('package_idle');
        
        // Create Package instance (not just a sprite)
        const pkg = new Package(scene, x, y, 0);
        pkg.play('package_idle');
        
        // Apply rainbow tint
        const baseColor = rainbowColors[colorIndex % rainbowColors.length];
        const r = ((baseColor >> 16) & 0xFF);
        const g = ((baseColor >> 8) & 0xFF);
        const b = (baseColor & 0xFF);
        const tintColor = ((Math.floor((r + 255) / 2) << 16) | (Math.floor((g + 255) / 2) << 8) | Math.floor((b + 255) / 2));
        pkg.setTint(tintColor, tintColor, tintColor, tintColor);
        
        pkg.setScale(packageScale);
        pkg.setDepth(1);
        pkg.setData('outline', outline);
        
        pkg.setData('pickedUp', false);
        pkg.setData('falling', true);
        pkg.setData('bonusDrop', true);
        pkg.setData('tintColor', tintColor);
        
        return pkg;
    }
    
    constructor(scene, x, y, platformIndex) {
        super(scene, x, y, 'package', 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.platformIndex = platformIndex;
        this.setData('platformIndex', platformIndex);
        this.setData('pickedUp', false);
        
        // Load hitbox data
        this.hitboxData = scene.cache.json.get('package_hbox');
        if (!this.hitboxData) {
            console.warn(`Hitbox data not found for 'package_hbox'. Make sure you load the JSON in preload.`);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        // Get the current animation frame index
        const anim = this.anims.currentAnim;
        const frame = this.anims.currentFrame;
        let frameIndex = 0;
        if (anim && frame) {
            frameIndex = frame.index - anim.frames[0].index;
        }

        // use hitbox for current frame
        if (this.hitboxData && this.hitboxData.frames && this.hitboxData.frames.length > 0) {
            const hbox = this.hitboxData.frames[frameIndex] || this.hitboxData.frames[0];
            if (hbox && hbox[0]) {
                const box = hbox[0];
                this.body.setSize(box.width, box.height);
                this.body.setOffset(box.x, box.y);
            } else {
                // no hitbox, use full frame
                this.body.setSize(this.width, this.height);
                this.body.setOffset(0, 0);
            }
        } else {
            // hitbox data missing
            this.body.setSize(this.width, this.height);
            this.body.setOffset(0, 0);
        }
    }
    
    // Update package behavior (called from scene update)
    update(platforms) {
        const outline = this.getData('outline');
        
        // Show outline only when stationary (not jumping, falling, or being carried)
        const isStationary = !this.getData('jumping') && !this.getData('falling') && !this.getData('pickedUp');
        
        if (outline && outline.active) {
            if (isStationary) {
                outline.setVisible(true);
                outline.x = this.x;
                outline.y = this.y;
                outline.setScale(this.scaleX * 1.08, this.scaleY * 1.08);
                outline.setDepth(this.depth - 0.1);
            } else {
                outline.setVisible(false);
            }
        }
        
        // Handle jumping between platforms
        if (this.getData('jumping')) {
            const startPlatIndex = this.getData('startPlatformIndex');
            const endPlatIndex = this.getData('endPlatformIndex');
            
            // Move horizontally toward target X
            if (this.targetJumpX !== undefined && this.x !== this.targetJumpX) {
                const dx = this.targetJumpX - this.x;
                this.x += Math.sign(dx) * Math.min(Math.abs(dx), 3);
            }

            const targetPlatform = platforms[endPlatIndex];
            const leftBound = targetPlatform.topL;
            const rightBound = targetPlatform.topR;

            if (this.x < leftBound) {
                this.x = leftBound;
            } else if (this.x > rightBound) {
                this.x = rightBound;
            }
            
            // Scale interpolation during jump
            const initialScale = (platforms[startPlatIndex].height / 512) * 1;
            const targetScale = (platforms[endPlatIndex].height / 512) * 1;
            const startY = platforms[startPlatIndex].y - platforms[startPlatIndex].height;
            const platformFloor = platforms[startPlatIndex].y;
            const startMiddle = (startY + platformFloor) / 2;
            const endY = this.targetJumpY;
            const progress = Math.max(0, Math.min(1, (startMiddle - this.y) / (startMiddle - endY)));
            const currentScale = initialScale + (targetScale - initialScale) * progress;
            this.setScale(currentScale);
            if (outline) outline.setScale(currentScale * 1.08);
            
            // Check if reached target platform
            if (this.y <= this.targetJumpY + 5) {
                const finalScale = (platforms[endPlatIndex].height / 512) * 1;
                this.setScale(finalScale);
                if (outline) outline.setScale(finalScale * 1.08);
                
                this.setData('platformIndex', endPlatIndex);
                this.setDepth(endPlatIndex + 5);
                if (outline) outline.setDepth(endPlatIndex + 4.9);
                this.body.setVelocityY(0);
                this.body.allowGravity = false;
                
                // snap to platform after jump
                this.y = Package.getPlacementY(platforms, endPlatIndex);
                
                // Force body position to match sprite
                if (this.body) {
                    this.body.y = this.y - this.body.halfHeight;
                }
                
                this.setData('jumping', false);
                delete this.targetJumpY;
                delete this.targetJumpX;
            }
        }
        // Handle being picked up by carrier
        else if (this.getData('pickedUp')) {
            const carrier = this.getData('carrier');
            if (carrier && carrier.active && !carrier.getData('jumping')) {
                this.x = carrier.x;
                this.y = carrier.y + (carrier.height * carrier.scaleY * -0.1);
                const pickedScale = 0.15 * carrier.scaleY / 0.5;
                this.setScale(pickedScale);
                if (outline) outline.setScale(pickedScale * 1.08);
                this.setDepth(carrier.depth + 1);
                if (outline) outline.setDepth(carrier.depth + 0.9);
            } else if (carrier && carrier.getData('jumping')) {
                this.setData('pickedUp', false);
                this.setData('carrier', null);
                this.setData('falling', true);
                this.setData('platformIndex', carrier.platformIndex);
                this.body.allowGravity = true;
                this.body.setVelocityY(100);
                if (this.getData('tintColor')) this.setTint(this.getData('tintColor'));
                
                const platform = platforms[carrier.platformIndex];
                const targetHeight = platform.height;
                const packageScale = (targetHeight / 512) * 1;
                this.setScale(packageScale);
                if (outline) outline.setScale(packageScale * 1.08);
                
                carrier.setData('hasPackage', false);
                carrier.setData('package', null);
            } else {
                let closestPlatIndex = 0;
                let closestDist = Infinity;
                for (let p = 0; p < platforms.length; p++) {
                    const platY = platforms[p].y - platforms[p].height;
                    const dist = Math.abs(this.y - platY);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestPlatIndex = p;
                    }
                }
                
                this.setData('pickedUp', false);
                this.setData('carrier', null);
                this.setData('platformIndex', closestPlatIndex);
                this.setData('falling', true);
                this.body.allowGravity = true;
                this.body.setVelocityY(100);
                if (this.getData('tintColor')) this.setTint(this.getData('tintColor'));
                
                const platform = platforms[closestPlatIndex];
                const targetHeight = platform.height;
                const packageScale = (targetHeight / 512) * 1;
                this.setScale(packageScale);
                if (outline) outline.setScale(packageScale * 1.08);
            }
        }
        // Handle falling to platform
        else if (this.getData('falling')) {
            const platIndex = this.getData('platformIndex');
            if (platforms[platIndex]) {
                const platform = platforms[platIndex];
                const targetHeight = platforms[platIndex].height;
                const packageScale = (targetHeight / 512) * 1;
                
                // Use the static method directly
                const targetY = Package.getPlacementY(platforms, platIndex);
                
                if (this.y >= targetY) {
                    this.setScale(packageScale);
                    if (outline) outline.setScale(packageScale * 1.08);
                    this.body.setVelocityY(0);
                    this.body.allowGravity = false;
                    this.body.setImmovable(true);
                    this.setData('falling', false);
                    this.setData('bonusDrop', false);
                    this.y = targetY;
                    // Force body position to match sprite
                    //if (this.body) {
                        this.body.y = this.y - this.body.halfHeight;
                    //}
                }
            }
        }
        
        // Sync outline position, scale, and depth with package - always keep it behind
        if (outline && outline.active) {
            outline.x = this.x;
            outline.y = this.y;
            outline.setScale(this.scaleX * 1.08, this.scaleY * 1.08);
            outline.setDepth(this.depth - 0.1);
        }
    }
}