// Platform class - static platform with collision
export class Platform {
    constructor(scene, hitboxData, index, scaleX, scaleY) {
        this.scene = scene;
        this.index = index;
        
        // get scaled dimensions from hitbox
        const width = hitboxData.width * scaleX;
        const height = hitboxData.height * scaleY;
        
        // top-left corner (scaled)
        const x = 15 + hitboxData.x * scaleX;
        const y = 15 + hitboxData.y * scaleY;
        
        // center position
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // Store bounds
        this.topL = centerX - width / 2;
        this.topR = centerX + width / 2;
        this.y = centerY;
        this.width = width;
        this.height = height;
        this.surfaceY = centerY - height / 2; // Top surface of platform
        this.scale = 1;
        
        // Create physics body
        this.platform = scene.physics.add.staticGroup().create(centerX, centerY, null);
        this.platform.displayWidth = width;
        this.platform.displayHeight = height;
        this.platform.setVisible(false);
        this.platform.body.setSize(width, height);
        this.platform.body.setOffset(-width / 2, -height / 2);
    }
    
    // left edge with margin
    getLeftBound(margin = 20) {
        return this.topL + margin;
    }
    
    // right edge with margin
    getRightBound(margin = 20) {
        return this.topR - margin;
    }
    
    // check if x is within platform bounds
    containsX(x, margin = 20) {
        return x >= this.getLeftBound(margin) && x <= this.getRightBound(margin);
    }
    
    /**
     * Get a random X position within the platform bounds
     * @param {number} margin - Margin from edges
     * @returns {number}
     */
    getRandomX(margin = 50) {
        return Phaser.Math.Between(this.getLeftBound(margin), this.getRightBound(margin));
    }
}
