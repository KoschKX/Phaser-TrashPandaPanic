// Star class - throwable potato sprite
export class Star extends Phaser.Physics.Arcade.Sprite {
    // Create star animation (call once in scene create)
    static createAnimations(scene) {
        // Only create if not already created
        if (scene.anims.exists('potato_spin')) return;
        
        scene.anims.create({
            key: 'potato_spin',
            frames: scene.anims.generateFrameNumbers('potato', { start: 0, end: 7 }),
            frameRate: 16,
            repeat: -1
        });
    }
    
    constructor(scene, x, y) {
        super(scene, x, y, 'potato');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setDisplaySize(64, 64);
        this.setOrigin(0.5, 0.5);
        this.setDepth(21);
        
        // track starting Y for perspective scaling
        this.initY = y;
        
        this.play('potato_spin');
    }
    
    // throw toward target point
    throw(targetX, targetY, speed = 700) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        const vx = (dx / magnitude) * speed;
        const vy = (dy / magnitude) * speed;
        
        this.body.setVelocity(vx, vy);
    }
    
    // scale based on distance for perspective effect
    update() {
        // Calculate distance from starting point
        const distY = Math.abs(this.y - this.initY);
        
        // Scale down as star travels farther (perspective effect)
        const scale = Phaser.Math.Clamp(1 - distY / 600, 0.3, 1);
        this.setScale(scale * 1);
        
        // Destroy if star goes off-screen
        if (this.y < 0 || this.y > 600 || this.x < 0 || this.x > 800) {
            this.destroy();
        }
    }
}
