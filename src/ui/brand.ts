import Phaser from 'phaser';

/** Fundo da arte da logo; as telas que mostram a logo usam a mesma cor para a borda esfumada sumir. */
export const BRAND_BG = '#060b1c';
export const LOGO_KEY = 'logo';
/** Gerado por `npm run gen:brand` (caminho relativo: funciona no dev e no build com base './'). */
export const LOGO_URL = 'brand/logo.png';

/** Logo com a altura dada, centrada em (x, y). */
export function addLogo(scene: Phaser.Scene, x: number, y: number, height: number) {
  const img = scene.add.image(x, y, LOGO_KEY);
  img.setScale(height / img.height);
  return img;
}

/** Esconde a abertura em HTML (index.html), mostrada enquanto o jogo carrega. */
export function hideHtmlSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 300);
}
