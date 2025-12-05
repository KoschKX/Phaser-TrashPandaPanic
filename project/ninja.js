export { Ninja };
// console.log('ninja.js loaded');

class Ninja extends Phaser.Physics.Arcade.Sprite {
    static createAnimations(scene) {
        if (scene.anims.exists('ninja_walk')) return;
        
        scene.anims.create({
            key: 'ninja_walk',
            frames: scene.anims.generateFrameNumbers('raccoon_sheet', { start: 0, end: 15 }),
            frameRate: 16,
            repeat: -1
        });
        scene.anims.create({
            key: 'ninja_walk_box',
            frames: scene.anims.generateFrameNumbers('raccoon_run_box', { start: 0, end: 15 }),
            frameRate: 32,
            repeat: -1
        });
        scene.anims.create({
            key: 'ninja_fall',
            frames: scene.anims.generateFrameNumbers('raccoon_fall', { start: 0, end: 15 }),
            frameRate: 16,
            repeat: 0
        });
        scene.anims.create({
            key: 'ninja_drop',
            frames: scene.anims.generateFrameNumbers('raccoon_drop', { start: 0, end: 9 }),
            frameRate: 16,
            repeat: -1
        });
        scene.anims.create({
            key: 'ninja_dance',
            frames: scene.anims.generateFrameNumbers('raccoon_dance', { start: 0, end: 20 }),
            frameRate: 16,
            repeat: -1
        });
    }
    
    static spawn(scene, platforms, initialSpawn = false) {
        if (platforms.length === 0) return null;
        
        const plat = 0;
        const x = platforms[plat].getRandomX();
        
        let startY;
        if (initialSpawn) {
            startY = platforms[plat].surfaceY;
        } else {
            startY = -100;
        }
        
        const ninja = new Ninja(scene, x, startY, plat, 'raccoon_sheet');
        ninja.name = 'Ninja_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        ninja.setData('hasPackage', false);
        
        const targetHeight = platforms[plat].height;
        const ninjaScale = (targetHeight / 512) * 2;
        ninja.setScale(ninjaScale).setDepth(plat + 1);
        
        if (!initialSpawn) {
            if (!ninja.body) {
                scene.physics.world.enable(ninja);
            }
            ninja.body.allowGravity = false;
            ninja.body.setVelocityX(0);
            ninja.setData('spawning', true);
            ninja.setData('targetY', platforms[plat].y);
            ninja.setAlpha(1);
            ninja.setActive(true);
            ninja.setVisible(true);
            ninja.play('ninja_drop');
            
            scene.time.delayedCall(16, () => {
                if (ninja && ninja.body && ninja.getData('spawning')) {
                    ninja.body.allowGravity = true;
                    ninja.body.setGravityY(200);
                    ninja.body.setVelocity(0, 50);
                }
            });
        } else {
            ninja.body.allowGravity = false;
            ninja.play('ninja_walk');
        }
        
        return ninja;
    }
    
    // Spawn game over ninja
    static spawnGameOver(scene, platforms) {
        if (platforms.length === 0) return null;
        
        const bottomPlat = 2;
        const x = 400; // Center of screen
        const startY = -100;
        
        const ninja = new Ninja(scene, x, startY, bottomPlat, 'raccoon_sheet');
        ninja.name = 'GameOverNinja_' + Date.now();
        ninja.setData('hasPackage', false);
        ninja.setData('gameOverNinja', true);
        ninja.setData('gameOverState', 'falling');
        
        const targetHeight = platforms[bottomPlat].height;
        const ninjaScale = (targetHeight / 512) * 2;
        ninja.setScale(ninjaScale).setDepth(bottomPlat + 1);
        
        ninja.setVisible(true);
        ninja.setActive(true);
        ninja.setAlpha(1);
        
        if (!ninja.body) {
            scene.physics.world.enable(ninja);
        }
        
        ninja.setData('targetY', platforms[bottomPlat].y);
        ninja.play('ninja_drop');
        
        ninja.body.allowGravity = true;
        ninja.body.setGravityY(600);
        ninja.body.setVelocityY(200);
        
        return ninja;
    }
    
    constructor(scene, x, y, platformIndex, sheetKey = 'raccoon_sheet') {
        super(scene, x, y, sheetKey, 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.2);
        this.baseSpeed = Phaser.Math.Between(120, 180);
        this.body.setVelocityX(this.baseSpeed * (Math.random() > 0.5 ? 1 : -1));
        this.platformIndex = platformIndex;
        this.jumpTimer = 0;
        this.setData('hit', false);
        this.direction = this.body.velocity.x > 0 ? 1 : -1;
        this.isJumping = false;
        this.jumpTarget = null;
        this.jumpFrames = 0;

        // Derive hitbox key from the spritesheet path (e.g., racoon_run_hbox)
        let textureSource = scene.textures.get(sheetKey).getSourceImage && scene.textures.get(sheetKey).getSourceImage();
        let hitboxKey = sheetKey + '_hbox';
        if (textureSource && textureSource.src) {
            const match = textureSource.src.match(/([^\/]+)\.png$/i);
            if (match) {
                hitboxKey = match[1] + '_hbox';
            }
        }
        this.hitboxData = scene.cache.json.get(hitboxKey);
        if (!this.hitboxData) {
            // console.warn(`Hitbox data not found for key '${hitboxKey}'. Make sure you load the JSON with this key in preload.`);
        } else {
            // console.log('Loaded hitboxData for', hitboxKey + ':', this.hitboxData);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        // Stop all movement if dead
        if (this.getData('dead')) {
            this.body.setVelocity(0, 0);
            this.body.allowGravity = false;
            return;
        }
        // Get the current animation frame index
        const anim = this.anims.currentAnim;
        const frame = this.anims.currentFrame;
        let frameIndex = 0;
        if (anim && frame) {
            frameIndex = frame.index - anim.frames[0].index;
        }
        // If hit, slow down after half the fall animation, then stop
        if (this.getData('hit') && anim && anim.key === 'ninja_fall') {
            const totalFrames = anim.frames.length;
            if (frameIndex > Math.floor(totalFrames / 2) && this.body.velocity.x !== 0) {
                this.body.setVelocityX(this.body.velocity.x * 0.85); // slow down
            }
            if (frameIndex >= totalFrames - 1) {
                this.body.setVelocityX(0); // stop at last frame
            }
        }
        // make sure frameIndex doesn't go out of bounds
        if (this.hitboxData && this.hitboxData.frames && this.hitboxData.frames.length > 0) {
            const hbox = this.hitboxData.frames[frameIndex] || null;
            if (hbox) {
                // use hitbox for this frame
                this.body.setSize(hbox.width, hbox.height);
                this.body.setOffset(hbox.x, hbox.y);
                // scale ninja to fit platform height (2.5x platform height)
                if (this.width && this.height && this.scene && this.scene.platforms && typeof this.platformIndex === 'number') {
                    let platform = this.scene.platforms[this.platformIndex];
                    if (platform && platform.platform && platform.platform.displayHeight) {
                        let targetHeight = platform.platform.displayHeight * 2.5; // 250% of platform height for larger ninja
                        let scale = targetHeight / this.height;
                        if (Math.abs(this.scaleY - scale) > 0.01) {
                            this.setScale(scale);
                        }
                    }
                }
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

    hit() {
        if (this.getData('hit') || this.getData('dead')) {
            return false; // Already hit
        }
        
        this.setTint(0xff0000);
        this.setData('hit', true);
        this.setData('dead', true);
        this.setData('fadeStartTime', null);
        this.setTexture('raccoon_fall');
        this.anims.play('ninja_fall');
        this.fallFrame = 0;
        this.body.setVelocityX(0);
        this.body.setVelocityY(0);
        this.body.allowGravity = false;
        
        // Clear red tint after 0.1 seconds
        this.scene.time.delayedCall(100, () => {
            if (this.active) {
                this.clearTint();
            }
        });
        
        // Wait 2 seconds, then start fading
        this.scene.time.delayedCall(2000, () => {
            if (this.active) {
                this.setData('fadeStartTime', this.scene.time.now);
            }
        });
        
        return true; // Hit was successful
    }

    update(platformYs) {
        // Handle fading for dead ninjas
        const fadeStartTime = this.getData('fadeStartTime');
        if (fadeStartTime !== null && fadeStartTime !== undefined) {
            const elapsed = this.scene.time.now - fadeStartTime;
            const fadeDuration = 1000;
            
            if (elapsed >= fadeDuration) {
                // Fade complete, mark for destruction
                this.setData('readyToDestroy', true);
                return;
            } else {
                // Update alpha based on fade progress
                this.alpha = 1 - (elapsed / fadeDuration);
            }
        }
        
        // Skip old jump logic if using new gravity-based jumping/dropping
        if (this.getData('jumping') || this.getData('dropping')) {
            return;
        }
        
        // Prevent and cancel hopping/jumping if dead
        if (this.getData('dead')) {
            // Cancel any jump in progress
            this.isJumping = false;
            this.jumpTarget = null;
            this.jumpFrames = 0;
            // Snap to floor/platform if not already
            if (this.scene && this.scene.platforms && typeof this.platformIndex === 'number' && this.scene.platforms[this.platformIndex]) {
                const platform = this.scene.platforms[this.platformIndex];
                this.y = platform.y - platform.height;
                this.body.setVelocityY(0);
            }
            return;
        }
        // bounds checking moved to bonusStage.js
        // if (!this.isJumping) {
        //     if (this.x < 80) { this.body.setVelocityX(Math.abs(this.body.velocity.x)); this.direction = 1; }
        //     if (this.x > 720) { this.body.setVelocityX(-Math.abs(this.body.velocity.x)); this.direction = -1; }
        // }
        
        // OLD JUMP CODE - handled in bonusStage.js now
        /*
        this.jumpTimer += 1;
        if (!this.isJumping && this.jumpTimer > Phaser.Math.Between(120, 240)) {
            let next = this.platformIndex - 1;
            if (next >= 0) {
                this.isJumping = true;
                this.jumpFrames = 0;
                this.jumpTarget = { x: Phaser.Math.Clamp(this.x + Phaser.Math.Between(-40, 40), 80, 720), y: platformYs[next] - 18, index: next };
                this.body.allowGravity = false;
                let dx = this.jumpTarget.x - this.x;
                let dy = this.jumpTarget.y - this.y;
                let frames = 40;
                this.body.setVelocity(dx/frames*60, dy/frames*60 - 250);
            }
            this.jumpTimer = 0;
        }
        if (this.isJumping) {
            this.jumpFrames++;
            if (this.jumpFrames >= 40) {
                this.x = this.jumpTarget.x;
                this.y = this.jumpTarget.y;
                this.platformIndex = this.jumpTarget.index;
                this.body.setVelocityY(0);
                this.body.setVelocityX(this.direction * Phaser.Math.Between(60, 100));
                this.body.allowGravity = true;
                this.isJumping = false;
                this.jumpTarget = null;
                this.jumpFrames = 0;
            }
        }
        */
    }
    
    isReadyToDestroy() {
        return this.getData('readyToDestroy') === true;
    }
    
    // Update all ninjas in the scene
    static updateAll(scene, ninjas, platforms, gameOver) {
        // Use reverse loop to avoid splice index issues
        for (let i = ninjas.length - 1; i >= 0; i--) {
            const ninja = ninjas[i];
            
            // Special handling for game over ninja
            if (ninja.getData('gameOverNinja')) {
                const state = ninja.getData('gameOverState');
                
                if (state === 'falling') {
                    // Just fall straight down to bottom platform
                    const bottomPlat = 2;
                    const targetY = platforms[bottomPlat].y - platforms[bottomPlat].height;
                    
                    if (ninja.y >= targetY) {
                        // Landed - play dance animation
                        ninja.y = targetY;
                        ninja.platformIndex = bottomPlat;
                        ninja.body.setVelocity(0, 0);
                        ninja.body.allowGravity = false;
                        ninja.setData('gameOverState', 'dancing');
                        ninja.play('ninja_dance');
                    }
                } else if (state === 'dancing') {
                    // Stay still and keep dancing
                    ninja.body.setVelocity(0, 0);
                }
                
                continue;
            }
            
            // Check if ninja is spawning (dropping from top)
            if (ninja.getData('spawning')) {
                const plat = 0; // Top platform
                const platform = platforms[plat];
                const halfWidth = (ninja.width * Math.abs(ninja.scaleX)) / 2;
                
                // Keep ninja within platform bounds while falling
                if (ninja.x - halfWidth < platform.getLeftBound()) {
                    ninja.x = platform.getLeftBound() + halfWidth;
                } else if (ninja.x + halfWidth > platform.getRightBound()) {
                    ninja.x = platform.getRightBound() - halfWidth;
                }
                
                // Activate ninja when it reaches the target (center Y of the platform)
                const targetY = ninja.getData('targetY') - platforms[plat].height;
                if (ninja.y >= targetY) {
                    // Activated! Stop at center and start walking
                    ninja.y = targetY - (platforms[ninja.platformIndex].height);
                    ninja.body.setVelocityY(0);
                    ninja.body.allowGravity = false;
                    ninja.setData('spawning', false);
                    
                    ninja.play('ninja_walk');
                    ninja.body.setVelocityX(ninja.baseSpeed * (Math.random() > 0.5 ? 1 : -1));
                }
                continue; // Skip other logic while spawning
            }
            
            // Check if ninja is ready to be destroyed
            if (ninja.isReadyToDestroy()) {
                ninjas.splice(i, 1);
                ninja.destroy();
                
                // Spawn a new ninja after random delay (unless game over)
                if (!gameOver) {
                    const spawnDelay = Phaser.Math.Between(1000, 3000);
                    scene.time.delayedCall(spawnDelay, () => {
                        const newNinja = Ninja.spawn(scene, platforms, false);
                        if (newNinja) {
                            ninjas.push(newNinja);
                            scene.ninjasGroup.add(newNinja);
                        }
                    }, [], scene);
                }
                continue;
            }
            
            // keep ninja at normal walking speed
            if (!ninja.getData('hit') && Math.abs(ninja.body.velocity.x) < 30) {
                const dir = (ninja.body.velocity.x >= 0) ? 1 : -1;
                const speedMultiplier = ninja.getData('hasPackage') ? 1.5 : 1;
                const newVX = ninja.baseSpeed * dir * speedMultiplier;
                ninja.body.setVelocityX(newVX);
            } else if (ninja.getData('hasPackage') && !ninja.getData('hit')) {
                const dir = (ninja.body.velocity.x >= 0) ? 1 : -1;
                ninja.body.setVelocityX(ninja.baseSpeed * dir * 1.5);
            }
            
            // Prevent ninjas from moving up to higher platforms (only when not in special states)
            if (!ninja.getData('spawning') && !ninja.getData('dropping') && !ninja.getData('jumping')) {
                const platform = platforms[ninja.platformIndex];
                const expectedY = platform.y - (platforms[ninja.platformIndex].height);
                
                if (Math.abs(ninja.y - expectedY) > 1) {
                    ninja.y = expectedY;
                    ninja.body.setVelocityY(0);
                    ninja.body.setAccelerationY(0);
                    ninja.body.allowGravity = false;
                }
            }
            
            // Clamp ninja x within platform bounds and turn around at edges (only when not dropping/jumping)
            const plat = ninja.platformIndex;
            const isBottomPlatform = plat === platforms.length - 1;
            
            // Special case: bottom platform ninja with package can walk off screen (or any ninja during game over)
            if (isBottomPlatform && (ninja.getData('hasPackage') || gameOver) && !ninja.getData('dropping') && !ninja.getData('jumping')) {
                // Check if ninja walked off screen
                if (ninja.x < -50 || ninja.x > 850) {
                    // Destroy the package
                    const pkg = ninja.getData('package');
                    if (pkg && pkg.active) {
                        scene.packages = scene.packages.filter(p => p !== pkg);
                        const outline = pkg.getData('outline');
                        if (outline) outline.destroy();
                        pkg.destroy();
                        
                        // play joy sound when escaping with package
                        scene.sound.play('raccoon_joy_B');
                        
                        // Remove a square from the HUD
                        scene.hud.removePackageSquare();
                    }
                    
                    // Destroy the ninja
                    ninjas.splice(i, 1);
                    ninja.destroy();
                    
                    // Deduct score
                    scene.hud.addScore(-100);
                    
                    // Spawn a new ninja after delay (unless game over)
                    if (!gameOver) {
                        const spawnDelay = Phaser.Math.Between(1000, 3000);
                        scene.time.delayedCall(spawnDelay, () => {
                            const newNinja = Ninja.spawn(scene, platforms, false);
                            if (newNinja) {
                                ninjas.push(newNinja);
                                scene.ninjasGroup.add(newNinja);
                            }
                        }, [], scene);
                    }
                    continue;
                }
                // No bounds checking - let them walk freely
            }
            // Normal bounds checking for all other ninjas
            else if (platforms[plat] && !ninja.getData('dropping') && !ninja.getData('jumping')) {
                const left = platforms[plat].getLeftBound(0);
                const right = platforms[plat].getRightBound(0);
                
                // get ninja hitbox for collision check
                const ninjaLeft = ninja.x - ninja.body.halfWidth;
                const ninjaRight = ninja.x + ninja.body.halfWidth;
                
                if (ninjaLeft <= left) {
                    ninja.x = left + ninja.body.halfWidth;
                    ninja.body.setVelocityX(Math.abs(ninja.body.velocity.x));
                } else if (ninjaRight >= right) {
                    ninja.x = right - ninja.body.halfWidth;
                    ninja.body.setVelocityX(-Math.abs(ninja.body.velocity.x));
                }
            }

            if (
                plat > 0 &&
                !ninja.getData('hit') &&
                !ninja.getData('jumping') &&
                !ninja.getData('dropping') &&
                ninja.getData('hasPackage') === false &&
                Math.random() < 0.01 &&
                !gameOver
            ) {
                const prevPlat = plat - 1;
                const prevLeft = platforms[prevPlat].getLeftBound();
                const prevRight = platforms[prevPlat].getRightBound();
                const newX = Phaser.Math.Clamp(ninja.x + Phaser.Math.Between(-40, 40), prevLeft, prevRight);
                
                if (ninja.getData('hasPackage')) {
                    const pkg = ninja.getData('package');
                    if (pkg && pkg.active) {
                        pkg.setData('pickedUp', false);
                        pkg.setData('carrier', null);
                        pkg.setData('falling', true);
                        pkg.setData('platformIndex', ninja.platformIndex);
                        pkg.body.allowGravity = true;
                        pkg.body.setVelocityY(100);
                        if (pkg.getData('tintColor')) pkg.setTint(pkg.getData('tintColor'));
                    }
                    ninja.setData('hasPackage', false);
                    ninja.setData('package', null);
                }
                
                ninja.setData('jumping', true);
                ninja.setData('preJumpVX', ninja.body.velocity.x);
                ninja.setData('startPlatformIndex', plat);
                ninja.setData('endPlatformIndex', prevPlat);
                ninja.body.setVelocityX(0);
                ninja.body.allowGravity = true;
                ninja.body.setGravityY(800);
                ninja.body.setVelocityY(-350);
                ninja.targetJumpY = platforms[prevPlat].y - platforms[prevPlat].height;
                ninja.targetJumpX = newX;
                ninja.play('ninja_drop'); // Play drop animation for jumping
            }
            
            // If ninja is jumping up, check if reached upper platform
            else if (ninja.getData('jumping')) {
                if (ninja.getData('hasPackage')) {
                    ninja.setData('jumping', false);
                    ninja.body.allowGravity = false;
                    ninja.body.setVelocityY(0);
                    ninja.body.setVelocityX(ninja.baseSpeed * (ninja.body.velocity.x > 0 ? 1 : -1));
                    const currPlat = platforms[ninja.platformIndex];
                    ninja.y = currPlat.y - currPlat.height;
                    delete ninja.targetJumpY;
                    delete ninja.targetJumpX;
                    ninja.setData('preJumpVX', null);
                    ninja.play('ninja_walk');
                } else {
                    if (ninja.x !== ninja.targetJumpX) {
                        const dx = ninja.targetJumpX - ninja.x;
                        ninja.x += Math.sign(dx) * Math.min(Math.abs(dx), 2);
                    }
                    
                    const startPlatIndex = ninja.getData('startPlatformIndex');
                    const endPlatIndex = ninja.getData('endPlatformIndex');
                    
                    // Clamp ninja to target platform bounds
                    const targetPlatform = platforms[endPlatIndex];
                    const leftBound = targetPlatform.topL;
                    const rightBound = targetPlatform.topR;
                    const margin = 50;
                    
                    if (ninja.x < leftBound + margin) {
                        ninja.x = leftBound + margin;
                    } else if (ninja.x > rightBound - margin) {
                        ninja.x = rightBound - margin;
                    }
                    
                    const initialScale = (platforms[startPlatIndex].height / 512) * 2;
                    const targetScale = (platforms[endPlatIndex].height / 512) * 2;
                    const startY = platforms[plat].y - platforms[plat].height;
                    const endY = ninja.targetJumpY;
                    const progress = Math.max(0, Math.min(1, (startY - ninja.y) / (startY - endY)));
                    const currentScale = initialScale + (targetScale - initialScale) * progress;
                    ninja.setScale(currentScale);
                    
                    if (ninja.y <= ninja.targetJumpY + 5) {
                        const prevPlatObj = platforms[plat - 1];
                        ninja.y = prevPlatObj.y - prevPlatObj.height;
                        ninja.x = ninja.targetJumpX;
                        ninja.platformIndex = plat - 1;
                        const finalScale = (platforms[plat - 1].height / 512) * 2;
                        ninja.setScale(finalScale);
                        ninja.setDepth(plat);
                        ninja.body.setVelocityY(0);
                        ninja.body.setAccelerationY(0);
                        ninja.body.allowGravity = false;
                        
                        let vx = ninja.getData('preJumpVX');
                        if (typeof vx !== 'number') {
                            vx = ninja.body.velocity.x || ninja.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
                        }
                        ninja.body.setVelocityX(vx);
                        ninja.setData('jumping', false);
                        delete ninja.targetJumpY;
                        delete ninja.targetJumpX;
                        ninja.setData('preJumpVX', null);
                        ninja.play('ninja_walk');
                    }
                }
            }

            // Random drop down logic
            else if (
                plat < platforms.length - 1 &&
                !ninja.getData('hit') &&
                !ninja.getData('dropping') &&
                Math.random() < (gameOver ? 0.05 : (ninja.getData('hasPackage') ? 0.02 : 0.002))
            ) {
                const nextPlat = plat + 1;
                const nextLeft = platforms[nextPlat].getLeftBound();
                const nextRight = platforms[nextPlat].getRightBound();
                const newX = Phaser.Math.Clamp(ninja.x + Phaser.Math.Between(-40, 40), nextLeft, nextRight);
                
                ninja.setData('dropping', true);
                ninja.setData('preDropVX', ninja.body.velocity.x);
                ninja.setData('startPlatformIndex', plat);
                ninja.setData('endPlatformIndex', nextPlat);
                ninja.body.setVelocityX(0);
                ninja.body.allowGravity = true;
                ninja.body.setVelocityY(350);
                ninja.targetDropY = platforms[nextPlat].y - platforms[nextPlat].height;
                ninja.targetDropX = newX;
                ninja.play('ninja_drop'); // Play drop animation
            }
            // If ninja is dropping, check if reached next platform
            if (ninja.getData('dropping')) {
                // Move toward target X while falling
                if (ninja.x !== ninja.targetDropX) {
                    const dx = ninja.targetDropX - ninja.x;
                    ninja.x += Math.sign(dx) * Math.min(Math.abs(dx), 2);
                }
                
                // Interpolate scale during drop
                const startPlatIndex = ninja.getData('startPlatformIndex');
                const endPlatIndex = ninja.getData('endPlatformIndex');
                const initialScale = (platforms[startPlatIndex].height / 512) * 2;
                const targetScale = (platforms[endPlatIndex].height / 512) * 2;
                const startY = platforms[plat].y - platforms[plat].height;
                const endY = ninja.targetDropY;
                const progress = Math.max(0, Math.min(1, (ninja.y - startY) / (endY - startY)));
                const currentScale = initialScale + (targetScale - initialScale) * progress;
                ninja.setScale(currentScale);
                
                // Check if reached the target Y position
                if (ninja.y >= ninja.targetDropY - 5) {
                    const nextPlatObj = platforms[plat + 1];
                    ninja.y = nextPlatObj.y - (platforms[ninja.platformIndex].height);
                    ninja.x = ninja.targetDropX;
                    ninja.platformIndex = plat + 1;
                    const finalScale = (platforms[plat + 1].height / 512) * 2;
                    ninja.setScale(finalScale);
                    ninja.setDepth(plat + 2);
                    ninja.body.setVelocityY(0);
                    ninja.body.setAccelerationY(0);
                    ninja.body.allowGravity = false;
                    
                    let vx = ninja.getData('preDropVX');
                    if (typeof vx !== 'number') {
                        vx = ninja.body.velocity.x || ninja.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
                    }
                    ninja.body.setVelocityX(vx);
                    ninja.setData('dropping', false);
                    delete ninja.targetDropY;
                    delete ninja.targetDropX;
                    ninja.setData('preDropVX', null);
                    ninja.play('ninja_walk'); // Resume walking animation
                }
            }

            if (!ninja.getData('hit') && !ninja.getData('dropping') && !ninja.getData('spawning') && !ninja.getData('jumping')) {
                const animKey = ninja.getData('hasPackage') ? 'ninja_walk_box' : 'ninja_walk';
                ninja.play(animKey, true);
                ninja.flipX = ninja.body.velocity.x < 0;
            }
            
            ninja.update(scene.platformYs);
        }
    }
}
