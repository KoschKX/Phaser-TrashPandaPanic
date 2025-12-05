import { BonusStage } from './bonusStage.js';
import { Preloader } from './preloader.js';

// Detect mobile and use Canvas renderer to avoid texture size limits
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const config = {
    type: isMobile ? Phaser.CANVAS : Phaser.WEBGL,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        premultipliedAlpha: false,
        antialias: true,
        pixelArt: false,
        powerPreference: 'high-performance',
        transparent: false,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,
        maxTextures: 16
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    fps: {
        target: 60,
        forceSetTimeOut: true
    },
    scene: [Preloader, BonusStage]
};
new Phaser.Game(config);
