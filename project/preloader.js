export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Create loading bar
        const width = 800;
        const height = 600;
        
        // Progress bar dimensions
        const barWidth = 400;
        const barHeight = 50;
        const barX = (width - barWidth) / 2;
        const barY = (height - barHeight) / 2;
        
        // Create progress bar background (outline)
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0xffffff, 1);
        progressBox.fillRect(barX, barY, barWidth, barHeight);
        
        // Create progress bar fill (will grow as loading progresses)
        const progressBar = this.add.graphics();
        
        // Create percentage text
        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontSize: '24px',
            fill: '#000000',
            fontStyle: 'bold'
        });
        percentText.setOrigin(0.5, 0.5);
        
        // Update progress bar as files load
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(barX, barY, barWidth * value, barHeight);
            
            percentText.setText(Math.floor(value * 100) + '%');
        });
        
        // Load all assets
        this.load.json('warehouse_hbox', './assets/warehouse_hbox.json');
        this.load.image('warehouse_bg', './assets/warehouse.jpg');
        this.load.spritesheet('raccoon_sheet', './assets/racoon_run.png', { frameWidth: 512, frameHeight: 512 });
        this.load.spritesheet('raccoon_run_box', './assets/racoon_run_box.png', { frameWidth: 512, frameHeight: 512 });
        this.load.spritesheet('raccoon_fall', './assets/racoon_fall.png', { frameWidth: 512, frameHeight: 512 });
        this.load.spritesheet('raccoon_drop', './assets/racoon_drop.png', { frameWidth: 512, frameHeight: 512 });
        this.load.spritesheet('raccoon_dance', './assets/racoon_dance.png', { frameWidth: 512, frameHeight: 512 });
        this.load.json('raccoon_sheet_hbox', './assets/racoon_run_hbox.json');
        this.load.json('raccoon_run_box_hbox', './assets/racoon_run_box_hbox.json');
        this.load.json('cannon_hbox', './assets/cannon_hbox.json');
        this.load.spritesheet('potato', './assets/potato.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('cannon', './assets/cannon.png', { frameWidth: 960, frameHeight: 760 });
        this.load.spritesheet('package', './assets/package.png', { frameWidth: 512, frameHeight: 512 });
        this.load.json('package_hbox', './assets/package_hbox.json');
        this.load.audio('potato_launch_A', './assets/audio/potato_launch_A.mp3');
        this.load.audio('potato_launch_B', './assets/audio/potato_launch_B.mp3');
        this.load.audio('potato_launch_C', './assets/audio/potato_launch_C.mp3');
        this.load.audio('potato_smash_A', './assets/audio/potato_smash_A.mp3');
        this.load.audio('potato_smash_B', './assets/audio/potato_smash_B.mp3');
        this.load.audio('potato_smash_C', './assets/audio/potato_smash_C.mp3');
        this.load.audio('raccoon_joy_A', './assets/audio/raccoon_joy_A.mp3');
        this.load.audio('raccoon_joy_B', './assets/audio/raccoon_joy_B.mp3');
        this.load.audio('raccoon_hit_A', './assets/audio/raccoon_hit_A.mp3');
        this.load.audio('raccoon_hit_B', './assets/audio/raccoon_hit_B.mp3');
        this.load.audio('raccoon_hit_C', './assets/audio/raccoon_hit_C.mp3');
        this.load.audio('hydraulic_A', './assets/audio/hydraulic_A.mp3');
        this.load.audio('hydraulic_B', './assets/audio/hydraulic_B.mp3');
        this.load.audio('bounce_A', './assets/audio/bounce_A.mp3');
        this.load.audio('bounce_B', './assets/audio/bounce_B.mp3');
        this.load.audio('bounce_C', './assets/audio/bounce_C.mp3');
        this.load.audio('bgm', './assets/audio/Basic Industrial Run - TeknoAXE\'s Royalty Free Music.mp3');
    }

    create() {
        // Start the game after loading is complete
        this.scene.start('BonusStage');
    }
}
