import Phaser from 'phaser';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { OptionsScene } from './scenes/OptionsScene';
import { ArenaScene } from './scenes/ArenaScene';
import { ResultsScene } from './scenes/ResultsScene';

async function start() {
  try {
    await Promise.all([
      document.fonts.load('16px "Press Start 2P"'),
      document.fonts.load('16px "Space Grotesk"'),
      document.fonts.load('bold 16px "Space Grotesk"'),
    ]);
  } catch {
    /* segue com a fonte de fallback */
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280, // resolução lógica fixa
    height: 800,
    backgroundColor: '#11131c',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60 },
    scene: [BootScene, TitleScene, StageSelectScene, CharacterSelectScene, OptionsScene, ArenaScene, ResultsScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

void start();
