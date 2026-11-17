import Phaser from 'phaser';
import { registerTextures } from '../gfx/textures';
import { input } from '../input/input';
import { BRAND_BG, LOGO_KEY, LOGO_URL, addLogo, hideHtmlSplash } from '../ui/brand';
import { COLORS, hex, text } from '../ui/common';

/** Tempo mínimo da abertura com a logo (qualquer tecla pula depois que tudo carregou). */
const SPLASH_TIME = 1.6;
const BAR_W = 360;

/** Abertura: mostra a logo enquanto gera as texturas e depois segue para o título. */
export class BootScene extends Phaser.Scene {
  private elapsed = 0;
  private ready = false;
  private leaving = false;
  private bar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image(LOGO_KEY, LOGO_URL);
  }

  create() {
    this.elapsed = 0;
    this.ready = false;
    this.leaving = false;
    // a logo é arte ilustrada, não pixel art: suaviza ao reduzir
    this.textures.get(LOGO_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.cameras.main.setBackgroundColor(BRAND_BG);
    addLogo(this, 640, 350, 560);
    this.bar = this.add.graphics();
    text(this, 640, 712, 'carregando o backlog…', { font: 'body', size: 18, color: COLORS.dim, align: 'center' });
    hideHtmlSplash();
    // gera as texturas depois do primeiro quadro, para a logo aparecer antes do trabalho pesado
    this.time.delayedCall(30, () => {
      registerTextures(this);
      this.ready = true;
    });
  }

  update(_t: number, delta: number) {
    input.beginFrame(); // consome as teclas da abertura para não vazarem para o menu
    if (this.leaving) return;
    this.elapsed += delta / 1000;
    const p = Math.min(1, this.elapsed / SPLASH_TIME);
    const g = this.bar;
    g.clear();
    g.fillStyle(hex('#1e2232'), 1);
    g.fillRect(640 - BAR_W / 2, 680, BAR_W, 10);
    g.fillStyle(hex(COLORS.yellow), 1);
    g.fillRect(640 - BAR_W / 2, 680, BAR_W * (this.ready ? p : Math.min(p, 0.9)), 10);
    if (this.ready && (p >= 1 || input.anyPressed())) {
      this.leaving = true;
      this.cameras.main.fadeOut(250, 6, 11, 28);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Title'));
    }
  }
}
