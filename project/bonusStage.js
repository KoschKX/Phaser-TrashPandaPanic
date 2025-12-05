import { Ninja } from './ninja.js';
import { Star } from './Star.js';
import { Platform } from './platform.js';
import { Package } from './package.js';
import { Cannon } from './cannon.js';
import { HUD } from './hud.js';
import { Input } from './input.js';

export class BonusStage extends Phaser.Scene {
    constructor() {
        super('BonusStage');
    }

    maxNinjas = 25; // max ninjas on screen at once
    rainbowColors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3]; // red, orange, yellow, green, blue, indigo, violet

    create() {
        const pkgTexture = this.textures.get('package');
        if (pkgTexture) {
            const glTexture = pkgTexture.getSourceImage();
        }
        
        // Play background music
        this.bgm = this.sound.add('bgm', { volume: 0.66, loop: true });
        this.bgm.play();

        this.add.image(400, 300, 'warehouse_bg').setDisplaySize(800, 600).setDepth(-100);
        
        // Create animations for each class
        Ninja.createAnimations(this);
        Star.createAnimations(this);
        Package.createAnimations(this);
       
        this.setupPlatforms();
        this.setupNinjas();
        this.setupPackages();
        this.starsGroup = this.physics.add.group();
        
        // Create cannon
        this.cannon = new Cannon(this, 400, 450);
        
        // Setup input controls
        this.inputHandler = new Input(this, this.cannon);

        this.stars = [];
        
        // Create HUD
        this.hud = new HUD(this);
        
        this.gameOver = false;
        
        // Timer to award points based on packages remaining
        this.scoreTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.gameOver && this.packages.length > 0) {
                    this.hud.addScore(this.packages.length);
                }
            },
            loop: true
        });
        
        this.physics.add.overlap(this.starsGroup, this.ninjasGroup, this.handleStarNinjaCollision, null, this);
        this.physics.add.overlap(this.ninjasGroup, this.packagesGroup, this.handleNinjaPackageCollision, null, this);
        this.physics.add.overlap(this.starsGroup, this.packagesGroup, this.handleStarPackageCollision, null, this);
    }
    
    setupPlatforms() {
        this.platforms = [];
        const hboxData = this.cache.json.get('warehouse_hbox');
        const platData = (hboxData && hboxData.frames && hboxData.frames[0]) ? hboxData.frames[0] : [];
        
        const scaleX = 800 / 1024;
        const scaleY = 600 / 1024;
        
        platData.forEach((p, i) => {
            const platform = new Platform(this, p, i, scaleX, scaleY);
            this.platforms.push(platform);
        });
        
        this.platformYs = this.platforms.map(p => p.y);
    }
    
    setupNinjas() {
        this.ninjas = [];
        this.ninjasGroup = this.physics.add.group();
        
        this.ninjaSpawnTimer = this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (this.gameOver) return; // Don't spawn during game over
                const ninja = Ninja.spawn(this, this.platforms, false);
                if (ninja) {
                    this.ninjas.push(ninja);
                    this.ninjasGroup.add(ninja);
                }
            },
            callbackScope: this,
            loop: true
        });
    }
    
    spawnNinja(initialSpawn = false) {
        if (this.platforms.length === 0 || this.gameOver) return;
        
        // don't spawn if we're at the limit
        if (this.ninjas.length >= this.maxNinjas) return;
        
        const plat = 0;
        const x = this.platforms[plat].getRandomX();
        
        let startY;
        let targetY;
        if (initialSpawn) {
            startY = this.platforms[plat].surfaceY;
            targetY = startY;
        } else {
            startY = -100;
            targetY = this.platforms[plat].surfaceY;
        }
        
        const ninja = new Ninja(this, x, startY, plat, 'raccoon_sheet');
        ninja.name = 'Ninja_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        ninja.setData('hasPackage', false);
        
        const targetHeight = this.platforms[plat].height;
        const ninjaScale = (targetHeight / 512) * 2;
        ninja.setScale(ninjaScale).setDepth(plat + 1);
        
        if (!initialSpawn) {
            if (!ninja.body) {
                this.physics.world.enable(ninja);
            }
            ninja.body.allowGravity = false;
            ninja.body.setVelocityX(0);
            ninja.setData('spawning', true);
            ninja.setData('targetY', this.platforms[plat].y); // Target center Y, not surface
            ninja.setAlpha(1); // Make sure visible
            ninja.setActive(true);
            ninja.setVisible(true);
            ninja.play('ninja_drop');
            
            this.time.delayedCall(16, () => {
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
        
        this.ninjas.push(ninja);
        this.ninjasGroup.add(ninja);
    }
    
    setupPackages() {
        this.packages = [];
        this.packagesGroup = this.physics.add.group();
        this.packageColorIndex = 0;
        
        if (this.platforms.length > 0) {
            for (let i = 0; i < 5; i++) {
                const pkg = Package.spawn(this, this.platforms, this.rainbowColors, this.packageColorIndex);
                if (pkg) {
                    this.packageColorIndex++;
                    this.packages.push(pkg);
                    
                    const platIndex = pkg.getData('platformIndex');
                    const yBeforeGroup = pkg.y;
                    
                    this.packagesGroup.add(pkg);
                    
                    // Re-sync position AFTER adding to group (group might reset body position)
                    const correctY = Package.getPlacementY(this.platforms, platIndex, pkg);
                    pkg.y = correctY;
                    if (pkg.body) {
                        pkg.body.y = pkg.y - pkg.body.halfHeight;
                    }
                    
                    // console.log(`Package ${i} on platform ${platIndex}: surfaceY=${this.platforms[platIndex].surfaceY}, beforeGroup=${yBeforeGroup}, afterGroup=${pkg.y}, body.y=${pkg.body.y}, displayHeight=${pkg.displayHeight}`);
                }
            }
        }
    }
    
    // Spawn a bonus package from top
    spawnBonusPackage() {
        if (this.packages.length >= 10) return;
        
        const pkg = Package.spawnBonus(this, this.platforms, this.rainbowColors, this.packageColorIndex);
        if (pkg) {
            this.packageColorIndex++;
            this.packages.push(pkg);
            this.packagesGroup.add(pkg);
            
            // Re-enable physics AFTER adding to group (group might reset properties)
            pkg.body.setImmovable(false);
            pkg.body.allowGravity = true;
            pkg.body.setGravityY(600);
            pkg.body.setVelocityY(100);
            
            // console.log('Bonus package spawned:', 'x:', pkg.x, 'y:', pkg.y, 'vY:', pkg.body.velocity.y, 'gravity:', pkg.body.allowGravity, 'immovable:', pkg.body.immovable);
            
            // Add a square to the HUD
            this.hud.addPackageSquare();
        }
    }
    handleStarNinjaCollision(star, ninja) {
        if (!star.active || star.getData('hasHit')) {
            return;
        }
        
        if (ninja.getData('spawning') || ninja.getData('dropping') || ninja.getData('jumping')) {
            return;
        }
        
        if (ninja.hit()) {
            
            // play random hit sound
            const hitSounds = ['raccoon_hit_A', 'raccoon_hit_B', 'raccoon_hit_C'];
            const randomHit = Phaser.Utils.Array.GetRandom(hitSounds);
            this.sound.play(randomHit, { volume: 0.66 });
            
            if (ninja.getData('hasPackage')) {
                const pkg = ninja.getData('package');
                if (pkg && pkg.active) {
                    const isBottomPlatform = ninja.platformIndex === this.platforms.length - 1;
                    
                    // If on bottom platform and package would be out of bounds, clamp it
                    if (isBottomPlatform) {
                        const platform = this.platforms[ninja.platformIndex];
                        const leftBound = platform.topL;
                        const rightBound = platform.topR;
                        const margin = 50;
                        
                        let pkgX = ninja.x;
                        
                        // Check if package is out of bounds
                        if (pkgX < leftBound + margin || pkgX > rightBound - margin) {
                            // Determine which edge is closer
                            const distToLeft = Math.abs(pkgX - leftBound);
                            const distToRight = Math.abs(pkgX - rightBound);
                            
                            if (distToLeft < distToRight) {
                                pkgX = leftBound + margin;
                            } else {
                                pkgX = rightBound - margin;
                            }
                            
                            pkg.x = pkgX;
                            
                            // Set package Y to platform
                            const targetHeight = platform.height;
                            const packageScale = (targetHeight / 512) * 1;
                            pkg.setScale(packageScale);
                            pkg.y = Package.getPlacementY(this.platforms, ninja.platformIndex, pkg);
                            
                            pkg.setData('pickedUp', false);
                            pkg.setData('carrier', null);
                            pkg.setData('falling', false);
                            pkg.setData('platformIndex', ninja.platformIndex);
                            pkg.body.allowGravity = false;
                            pkg.body.setVelocityY(0);
                            if (pkg.getData('tintColor')) pkg.setTint(pkg.getData('tintColor'));
                        } else {
                            // Package is in bounds, drop normally
                            pkg.setData('pickedUp', false);
                            pkg.setData('carrier', null);
                            pkg.setData('falling', true);
                            pkg.setData('platformIndex', ninja.platformIndex);
                            pkg.body.allowGravity = true;
                            pkg.body.setVelocityY(100);
                            if (pkg.getData('tintColor')) pkg.setTint(pkg.getData('tintColor'));
                            
                            const targetHeight = platform.height;
                            const packageScale = (targetHeight / 512) * 1;
                            pkg.setScale(packageScale);
                        }
                    } else {
                        // Normal behavior - drop the package
                        pkg.setData('pickedUp', false);
                        pkg.setData('carrier', null);
                        pkg.setData('falling', true);
                        pkg.setData('platformIndex', ninja.platformIndex);
                        pkg.body.allowGravity = true;
                        pkg.body.setVelocityY(100);
                        if (pkg.getData('tintColor')) pkg.setTint(pkg.getData('tintColor'));
                        
                        const platform = this.platforms[ninja.platformIndex];
                        const targetHeight = platform.height;
                        const packageScale = (targetHeight / 512) * 1;
                        pkg.setScale(packageScale);
                    }
                }
                ninja.setData('hasPackage', false);
                ninja.setData('package', null);
            }
            
            star.setData('hasHit', true);
            star.destroy();
            
            // play random smash sound
            const smashSounds = ['potato_smash_A', 'potato_smash_B', 'potato_smash_C'];
            const randomSmash = Phaser.Utils.Array.GetRandom(smashSounds);
            this.sound.play(randomSmash, { volume: 0.25 });
            
            this.hud.addScore(100);
            
            // Track ninja kills and spawn bonus package every 25
            const ninjasKilled = this.hud.incrementNinjasKilled();
            if (ninjasKilled % 25 === 0) {
                this.spawnBonusPackage();
            }
        }
    }
    
    handleNinjaPackageCollision(ninja, pkg) {
        if (!pkg.active || pkg.getData('pickedUp') || pkg.getData('jumping')) {
            return;
        }
        
        if (ninja.getData('hasPackage')) {
            return;
        }
        
        if (ninja.getData('spawning') || ninja.getData('dropping') || ninja.getData('jumping') || ninja.getData('dead')) {
            return;
        }
        
        ninja.setData('hasPackage', true);
        ninja.setData('package', pkg);
        pkg.setData('pickedUp', true);
        pkg.setData('carrier', ninja);
        
        // play joy sound
        this.sound.play('raccoon_joy_A');
    }
    
    handleStarPackageCollision(star, pkg) {
        if (!pkg.active || pkg.getData('jumping') || pkg.getData('falling')) {
            return;
        }
        
        const currentPlatIndex = pkg.getData('platformIndex');
        
        // Can't jump up from top platform
        if (currentPlatIndex === 0) {
            star.destroy();
            const smashSounds = ['potato_smash_A', 'potato_smash_B', 'potato_smash_C'];
            const randomSmash = Phaser.Utils.Array.GetRandom(smashSounds);
            this.sound.play(randomSmash, { volume: 0.5 });
            return;
        }
        
        // If package is being carried, drop it first
        if (pkg.getData('pickedUp')) {
            const carrier = pkg.getData('carrier');
            if (carrier) {
                carrier.setData('hasPackage', false);
                carrier.setData('package', null);
            }
            pkg.setData('pickedUp', false);
            pkg.setData('carrier', null);
        }
        
        const targetPlatIndex = currentPlatIndex - 1;
        const targetPlatform = this.platforms[targetPlatIndex];
        const currentPlatform = this.platforms[currentPlatIndex];
        
        // make sure package lands within platform bounds
        const platformLeft = targetPlatform.x - (targetPlatform.width / 2);
        const platformRight = targetPlatform.x + (targetPlatform.width / 2);
        let targetX = pkg.x;
        
        // keep it away from edges
        const margin = 50;
        if (targetX < platformLeft + margin) {
            targetX = platformLeft + margin;
        } else if (targetX > platformRight - margin) {
            targetX = platformRight - margin;
        }
        
        // Set up jump
        pkg.setData('jumping', true);
        pkg.setData('startPlatformIndex', currentPlatIndex);
        pkg.setData('endPlatformIndex', targetPlatIndex);
        pkg.setData('falling', false);
        pkg.targetJumpX = targetX;
        
        pkg.body.allowGravity = true;
        pkg.body.setGravityY(600);
        pkg.body.setVelocityY(-500);
        
        const targetY = targetPlatform.y - targetPlatform.height;
        const platformFloor = targetPlatform.y;
        const platformTop = targetPlatform.y - targetPlatform.height;
        pkg.targetJumpY = Package.getPlacementY(this.platforms, targetPlatIndex, pkg);
        
        star.destroy();
        const smashSounds = ['potato_smash_A', 'potato_smash_B', 'potato_smash_C'];
        const randomSmash = Phaser.Utils.Array.GetRandom(smashSounds);
        this.sound.play(randomSmash, { volume: 0.5 });
        const bounceSounds = ['bounce_A', 'bounce_B', 'bounce_C'];
        const randomBounce = Phaser.Utils.Array.GetRandom(bounceSounds);
        this.sound.play(randomBounce, { volume: 0.25 });
    }
    
    update() {
        // Don't update if paused
        if (this.hud.isPaused) {
            return;
        }
        
        // Check for game over condition
        if (!this.gameOver && this.packages.length === 0) {
            this.gameOver = true;
            this.showGameOver();
        }
        
        if (this.gameOver) {
            this.updateNinjas();
            return;
        }
        
        this.cannon.update(this.inputHandler.getCursors());
        this.updateNinjas();
        this.updatePackages();
        this.updateStars();
    }
    
    showGameOver() {
        // Stop spawning regular ninjas
        if (this.ninjaSpawnTimer) {
            this.ninjaSpawnTimer.remove(false);
            this.ninjaSpawnTimer = null;
        }
        
        // Destroy all stars
        this.stars.forEach(star => {
            if (star.active) {
                star.destroy();
            }
        });
        this.stars = [];
        
        // Show game over UI and handle cannon
        this.hud.showGameOver(this.cannon, () => this.spawnGameOverNinja());
    }
    
    spawnGameOverNinja() {
        const ninja = Ninja.spawnGameOver(this, this.platforms);
        if (ninja) {
            // Add to arrays and physics group
            this.ninjas.push(ninja);
            this.ninjasGroup.add(ninja);
            
            // Force enable physics
            this.physics.world.enable(ninja);
            ninja.body.allowGravity = true;
            ninja.body.setGravityY(600);
            ninja.body.setVelocityY(200);
            
        }
    }
    


    updateNinjas() {
        Ninja.updateAll(this, this.ninjas, this.platforms, this.gameOver);
    }
    
    updatePackages() {
        for (let i = this.packages.length - 1; i >= 0; i--) {
            const pkg = this.packages[i];
            pkg.update(this.platforms);
        }
    }
    
    updateStars() {
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const star = this.stars[i];
            if (star.active) {
                star.update();
            }
        }
    }
}
