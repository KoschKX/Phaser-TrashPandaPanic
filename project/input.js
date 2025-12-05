export class Input {
    constructor(scene, cannon) {
        this.scene = scene;
        this.cannon = cannon;
        
        this.setupKeyboard();
        this.setupMouse();
        this.setupDebug();
    }
    
    setupKeyboard() {
        this.cursors = this.scene.input.keyboard.addKeys({ 
            left: 'A', 
            right: 'D',
            arrowLeft: 'LEFT',
            arrowRight: 'RIGHT',
            arrowUp: 'UP',
            arrowDown: 'DOWN',
            space: 'SPACE',
            w: 'W',
            s: 'S',
        });
        
        this.scene.input.keyboard.on('keydown-SPACE', () => 
            this.cannon.startAutoFire(() => this.cannon.throwStar(this.scene.starsGroup, this.scene.stars), () => this.scene.gameOver)
        );
        this.scene.input.keyboard.on('keyup-SPACE', () => this.cannon.stopAutoFire());
        this.scene.input.keyboard.on('keydown-UP', () => 
            this.cannon.startAutoFire(() => this.cannon.throwStar(this.scene.starsGroup, this.scene.stars), () => this.scene.gameOver)
        );
        this.scene.input.keyboard.on('keyup-UP', () => this.cannon.stopAutoFire());
    }
    
    setupMouse() {
        this.scene.input.on('pointerdown', (pointer) => {
            // If touching bottom 10% of screen, move cannon
            if (pointer.y > 600 * 0.90) {
                this.cannon.setTargetX(pointer.x);
            } else {
                this.cannon.updateAngleFromPointer(pointer);
                this.scene.time.delayedCall(10, () => 
                    this.cannon.startAutoFire(() => this.cannon.throwStar(this.scene.starsGroup, this.scene.stars), () => this.scene.gameOver)
                );
            }
        });
        
        this.scene.input.on('pointerup', () => this.cannon.stopAutoFire());
        
        this.scene.input.on('pointermove', (pointer) => {
            if (!(pointer.isDown && pointer.y > 600 * 0.90)) {
                this.cannon.updateAngleFromPointer(pointer);
            }
            
            if (pointer.isDown && pointer.y > 600 * 0.90) {
                this.cannon.setTargetX(pointer.x);
            }
        });
        
        this.scene.input.setDefaultCursor('crosshair');
        this.scene.game.canvas.style.cursor = 'crosshair';
    }
    
    setupDebug() {
        this.scene.input.keyboard.on('keydown-TAB', (event) => {
            event.preventDefault();
            const currentDebug = this.scene.physics.world.drawDebug;
            this.scene.physics.world.drawDebug = !currentDebug;
            
            if (this.scene.physics.world.drawDebug) {
                this.scene.physics.world.createDebugGraphic();
            } else if (this.scene.physics.world.debugGraphic) {
                this.scene.physics.world.debugGraphic.clear();
            }
        });
    }
    
    getCursors() {
        return this.cursors;
    }
}
