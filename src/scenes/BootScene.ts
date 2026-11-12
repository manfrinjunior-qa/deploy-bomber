import Phaser from 'phaser';
import { registerTextures } from '../gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    registerTextures(this);
    this.scene.start('Title');
  }
}
