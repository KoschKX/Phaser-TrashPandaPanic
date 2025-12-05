import { Star } from './Star.js';

export class Cannon {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scale = 0.5;
        this.frame = 8;
        this.targetX = null;
        this.turning = false;
        this.turnTick = 0;
        this.isFiring = false;
        this.fireTimer = null;
        
        const cannonWidth = 960 * this.scale;
        const cannonHeight = 760 * this.scale;
        
        this.sprite = scene.add.sprite(x, y, 'cannon', 0)
            .setDepth(25)
            .setDisplaySize(cannonWidth, cannonHeight)
            .setAlpha(1.0);
        
        this.sprite.setFrame(this.frame);
        
        // Firing angles for each cannon frame
        this.frameAngles = [
          // 1,  2,  3,  4,  5,  6,  7,  8,   9,  10,  11,  12,  13,  14,  15,  16,  17
            20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180
        ];
    }
    
    setFrame(frame) {
        const frameCount = this.scene.textures.get('cannon').frameTotal;
        const maxFrame = frameCount - 1;
        this.frame = Phaser.Math.Clamp(frame, 0, maxFrame);
        this.sprite.setFrame(this.frame);
    }
    
    updateAngleFromPointer(pointer) {
        const frameCount = this.scene.textures.get('cannon').frameTotal;
        const maxFrame = frameCount - 2;
        
        // Map pointer X (0-800) to cannon frame (0-maxFrame)
        let frame = Math.round((pointer.x / 800) * maxFrame);
        frame = Phaser.Math.Clamp(frame, 0, maxFrame);
        
        this.setFrame(frame);
    }S
    
    snapToDeg(straighten = false) {
        if (straighten) {
            return 7;
        }
        const frameCount = this.scene.textures.get('cannon').frameTotal;
        const maxFrame = frameCount - 1;
        const anglePerFrame = 180 / maxFrame;
        const angle = 180 - (this.frame * anglePerFrame);
        const snappedAngle = Math.round(angle / 30) * 30;
        let snappedFrame = Math.round((180 - snappedAngle) / anglePerFrame);
        snappedFrame = Phaser.Math.Clamp(snappedFrame, 0, maxFrame);
        return snappedFrame;
    }
    
    setTargetX(x) {
        this.targetX = x;
    }
    
    update(cursors) {
        if (this.scene.hud && this.scene.hud.isPaused) {
            return;
        }
        
        if (this.targetX !== null) {
            const dx = this.targetX - this.x;
            if (Math.abs(dx) > 2) {
                const direction = Math.sign(dx);
                this.x += direction * 6;
            } else {
                this.x = this.targetX;
                this.targetX = null;
            }
        }
        
        if (cursors.left.isDown) {
            this.x -= 6;
        }
        if (cursors.right.isDown) {
            this.x += 6;
        }
        
        this.x = Phaser.Math.Clamp(this.x, 80, 720);
        this.sprite.x = this.x;
        
        const frameCount = this.scene.textures.get('cannon').frameTotal;
        const maxFrame = frameCount - 1;
        
        this.turnTick++;
        
        const isTurning = cursors.arrowLeft.isDown || cursors.arrowRight.isDown;
        
        if (isTurning && !this.turning) {
            this.turning = true;
            this.scene.sound.play('hydraulic_A', { volume: 0.5 });
        }
        else if (!isTurning && this.turning) {
            this.turning = false;
            this.scene.sound.play('hydraulic_B', { volume: 0.5 });
        }
        
        if (this.turnTick % 2 === 0) {
            if (cursors.arrowLeft.isDown) {
                this.frame = Math.max(0, this.frame - 1);
            }
            if (cursors.arrowRight.isDown) {
                this.frame = Math.min(maxFrame - 1, this.frame + 1);
            }
        }
        
        this.sprite.setFrame(this.frame);
        
        if (Phaser.Input.Keyboard.JustDown(cursors.arrowDown)) {
            this.frame = this.snapToDeg(true);
            this.sprite.setFrame(this.frame);
        }
    }
    
    getFirePosition() {
        const currentFrame = this.sprite.frame.name;
        const cannonHbox = this.scene.cache.json.get('cannon_hbox');
        const frameData = cannonHbox.frames[currentFrame][0];
        
        const hboxCenterX = frameData.x + frameData.width / 2;
        const hboxCenterY = frameData.y + frameData.height / 2;
        
        const offsetX = (hboxCenterX - 960 / 2) * this.scale;
        const offsetY = (hboxCenterY - 760 / 2) * this.scale;
        
        return {
            x: this.x + offsetX,
            y: this.y + offsetY
        };
    }
    
    getFireAngle() {
        let frameIdx = this.sprite.frame.name;
        if (typeof frameIdx !== 'number') frameIdx = parseInt(frameIdx, 10);
        frameIdx = Phaser.Math.Clamp(frameIdx, 0, this.frameAngles.length - 1);
        return this.frameAngles[frameIdx];
    }
    
    straightenAndLower(onComplete) {
        this.frame = this.snapToDeg(true);
        this.sprite.setFrame(this.frame);
        
        this.scene.tweens.add({
            targets: this.sprite,
            y: 700,
            duration: 2000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (this.sprite) {
                    this.sprite.destroy();
                }
                if (onComplete) onComplete();
            }
        });
    }
    
    startAutoFire(fireCallback, gameOverCheck = null) {
        if (this.scene.hud && this.scene.hud.isPaused) return;
        if (this.isFiring || (gameOverCheck && gameOverCheck())) return;
        this.isFiring = true;
        fireCallback();
        this.fireTimer = this.scene.time.addEvent({
            delay: 250,
            callback: () => {
                if (this.scene.hud && this.scene.hud.isPaused) {
                    return;
                }
                if (gameOverCheck && gameOverCheck()) {
                    this.stopAutoFire();
                    return;
                }
                fireCallback();
            },
            callbackScope: this.scene,
            loop: true
        });
    }

    stopAutoFire() {
        this.isFiring = false;
        if (this.fireTimer) {
            this.fireTimer.remove(false);
            this.fireTimer = null;
        }
    }

    throwStar(starsGroup, starsArray) {
        const firePos = this.getFirePosition();
        const star = new Star(this.scene, firePos.x, firePos.y);
        
        starsGroup.add(star);
        starsArray.push(star);
        
        const launchSounds = ['potato_launch_A', 'potato_launch_B', 'potato_launch_C'];
        const randomLaunch = Phaser.Utils.Array.GetRandom(launchSounds);
        this.scene.sound.play(randomLaunch, { volume: 0.5 });
        
        const angleDeg = this.getFireAngle();
        const angleRad = Phaser.Math.DegToRad(angleDeg);
        const targetX = firePos.x + Math.cos(Math.PI - angleRad) * 500;
        const targetY = firePos.y - Math.sin(Math.PI - angleRad) * 500;
        star.throw(targetX, targetY);
    }

    destroy() {
        this.stopAutoFire();
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
}
