export class HUD {
    constructor(scene) {
        this.scene = scene;
        this.packageSquares = [];
        this.score = 0;
        this.ninjasKilled = 0;
        this.isMuted = false;
        this.isPaused = false;
        
        const gameWidth = scene.sys.game.config.width;
        const gameHeight = scene.sys.game.config.height;
        
        const scaleX = scene.scale.displaySize.width / gameWidth;
        const scaleY = scene.scale.displaySize.height / gameHeight;
        const displayScale = Math.min(scaleX, scaleY);
        this.fixedScale = 1 / displayScale;

        this.hudFontSize = 48;
        this.hudLineHeight = 48;
        this.hudIconSpacing = 96;
        this.hudFontFamily = 'Courier New, monospace';
        this.fontStyle = 'bold';
        
        for (let i = 0; i < 5; i++) {
            this.packageSquares.push(true);
        }
        this.packageSquaresText = scene.add.text(10, 10, '▢'.repeat(this.packageSquares.length), { 
            fontSize: this.hudFontSize+'px', 
            fill: '#fff',
            fontFamily: this.hudFontFamily,
            fontStyle: this.fontStyle
        }).setDepth(15).setScale(this.fixedScale);
        
        this.scoreText = scene.add.text(10, 10 + this.hudLineHeight, '$0', { 
            fontSize: this.hudFontSize+'px', 
            fill: '#fff',
            fontFamily: this.hudFontFamily,
            fontStyle: this.fontStyle
        }).setDepth(15).setScale(this.fixedScale);
        
        this.ninjasKilledText = scene.add.text(10, 10 + this.hudLineHeight * 2, '☠×0', { 
            fontSize: this.hudFontSize+'px', 
            fill: '#fff',
            // fontFamily: this.hudFontFamily,
            fontStyle: this.fontStyle
        }).setDepth(15).setScale(this.fixedScale);
        
        this.restartButton = scene.add.text(gameWidth - 10, 10, '↻', {
            fontSize: this.hudFontSize+'px',
            fill: '#fff',
            // fontFamily: this.hudFontFamily,
            fontStyle: this.fontStyle
        }).setOrigin(1, 0).setDepth(15).setInteractive().setScale(this.fixedScale);
        
        this.soundButton = scene.add.text(gameWidth - 10 - this.hudIconSpacing * 1.25, 10, '🔊', {
            fontSize: this.hudFontSize+'px',
            fill: '#fff',
            fontFamily: this.hudFontFamily,
            fontStyle: this.fontStyle
        }).setOrigin(1, 0).setDepth(15).setInteractive().setScale(this.fixedScale);
        
        this.pauseButton = scene.add.text(gameWidth - 10 - this.hudIconSpacing * 2, 10, '❚❚', {
            fontSize: this.hudFontSize+'px',
            fill: '#fff',
            fontFamily: this.hudFontFamily,
            fontStyle: this.fontStyle
        }).setOrigin(1, 0).setDepth(15).setInteractive().setScale(this.fixedScale);
        
        this.pauseButton.on('pointerdown', () => {
            this.togglePause();
        });
        

        this.soundButton.on('pointerdown', () => {
            this.toggleMute();
        });
        
        this.restartButton.on('pointerdown', () => {
            this.restartGame();
        });
        
        this.gameOverText = null;
        this.gameOverNinjaSpawned = false;
        
        scene.scale.on('resize', this.onResize, this);
        this.onResize();
    }
    
    onResize() {
        const gameWidth = this.scene.sys.game.config.width;
        const gameHeight = this.scene.sys.game.config.height;
        
        const scaleX = this.scene.scale.displaySize.width / gameWidth;
        const scaleY = this.scene.scale.displaySize.height / gameHeight;
        const displayScale = Math.min(scaleX, scaleY);
        this.fixedScale = 1 / displayScale;
        
        const fixedOffset = 10 * this.fixedScale;
        const fixedIconSpacing = this.hudIconSpacing * this.fixedScale;
        const leftMargin = 10 * this.fixedScale;
        const topMargin = 10 * this.fixedScale;
        const verticalSpacing = this.hudLineHeight * this.fixedScale;
        
        this.packageSquaresText.setPosition(leftMargin, topMargin).setScale(this.fixedScale);
        this.scoreText.setPosition(leftMargin, topMargin + verticalSpacing).setScale(this.fixedScale);
        this.ninjasKilledText.setPosition(leftMargin, topMargin + verticalSpacing * 2).setScale(this.fixedScale);
        this.restartButton.setPosition(gameWidth - fixedOffset, topMargin).setScale(this.fixedScale);
        this.soundButton.setPosition(gameWidth - fixedOffset - fixedIconSpacing * 0.85, topMargin).setScale(this.fixedScale);
        this.pauseButton.setPosition(gameWidth - fixedOffset - fixedIconSpacing * 2, topMargin).setScale(this.fixedScale);
        if (this.gameOverText) {
            this.gameOverText.setScale(this.fixedScale);
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.scene.sound.mute = this.isMuted;
        this.soundButton.setText(this.isMuted ? '🔇' : '🔊');
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.scene.physics.pause();
            this.scene.time.paused = true;
            this.scene.tweens.pauseAll();
            this.scene.anims.pauseAll();
            this.pauseButton.setText('▶');
        } else {
            this.scene.physics.resume();
            this.scene.time.paused = false;
            this.scene.tweens.resumeAll();
            this.scene.anims.resumeAll();
            this.pauseButton.setText('❚❚');
        }
    }
    
    restartGame() {
        if (this.scene.bgm) {
            this.scene.bgm.stop();
        }
        this.scene.scene.restart();
    }
    
    addPackageSquare() {
        this.packageSquares.push(true);
        this.packageSquaresText.setText('▢'.repeat(this.packageSquares.length));
    }
    
    removePackageSquare() {
        if (this.packageSquares.length > 0) {
            this.packageSquares.pop();
            if (this.packageSquares.length === 0) {
                this.packageSquaresText.setText('Ø');
            } else {
                this.packageSquaresText.setText('▢'.repeat(this.packageSquares.length));
            }
        }
    }
    
    addScore(points) {
        this.score += points;
        this.scoreText.setText('$' + this.score);
    }
    
    incrementNinjasKilled() {
        this.ninjasKilled++;
        this.ninjasKilledText.setText('☠×' + this.ninjasKilled);
        return this.ninjasKilled;
    }
    
    showGameOver(cannon, onCannonDestroyed) {
        this.gameOverText = this.scene.add.text(400, 300, 'GAME OVER', {
            fontSize: '120px',
            fontStyle: 'bold',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        });
        this.gameOverText.setOrigin(0.5, 0.5);
        this.gameOverText.setDepth(1000);
        this.gameOverText.setScale(this.fixedScale);
        
        cannon.straightenAndLower(() => {
            if (this.gameOverText) {
                this.gameOverText.setText("YOU'RE FIRED");
                this.gameOverText.setFontSize('80px');
                
                if (!this.gameOverNinjaSpawned) {
                    this.gameOverNinjaSpawned = true;
                    //this.scene.time.delayedCall(200, () => {
                        if (onCannonDestroyed) onCannonDestroyed();
                    //});
                }
            }
        });
    }
}
