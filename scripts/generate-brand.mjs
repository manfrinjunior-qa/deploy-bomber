// Gera a logo e os ícones do jogo a partir da arte original em brand/logo-e-icone.png.
// Saída em public/brand/: logo.png (tela de abertura e título) e os ícones da aba do navegador.
// Usa o Chrome instalado (via Playwright) como "editor de imagem": recorte, máscara e redimensionamento em canvas.
// Rode `npm run gen:brand` só quando a arte original mudar.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'brand');
mkdirSync(out, { recursive: true });

/** Regiões na arte original (1536×1024). */
const SPEC = {
  bg: [6, 11, 28], // fundo da arte = #060b1c (as telas de abertura e título usam a mesma cor)
  logo: { x: 20, y: 25, w: 955, h: 845, feather: 48, height: 640 },
  icon: { x: 972, y: 198, w: 549, h: 572, radius: 64, pad: 14, glow: 8 },
  iconSizes: { 'favicon-16.png': 16, 'favicon-32.png': 32, 'apple-touch-icon.png': 180, 'icon-512.png': 512 },
};

const src = 'data:image/png;base64,' + readFileSync(join(root, 'brand', 'logo-e-icone.png')).toString('base64');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const files = await page.evaluate(
  async ({ src, SPEC }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvasOf = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      return [c, ctx];
    };
    /** Reduz em passos de no máximo 2× (evita serrilhado do downscale direto). */
    const resize = (c, w, h) => {
      let cur = c;
      while (cur.width / 2 > w) {
        const [n, nctx] = canvasOf(Math.round(cur.width / 2), Math.round(cur.height / 2));
        nctx.drawImage(cur, 0, 0, n.width, n.height);
        cur = n;
      }
      const [n, nctx] = canvasOf(w, h);
      nctx.drawImage(cur, 0, 0, w, h);
      return n;
    };
    const png = (c) => c.toDataURL('image/png').split(',')[1];
    const res = {};

    // logo: mantém o fundo original e esfuma as bordas do recorte para sumir no fundo da tela
    {
      const L = SPEC.logo;
      const [c, ctx] = canvasOf(L.w, L.h);
      ctx.drawImage(img, -L.x, -L.y);
      const d = ctx.getImageData(0, 0, L.w, L.h);
      for (let y = 0; y < L.h; y++)
        for (let x = 0; x < L.w; x++) {
          const edge = Math.min(x, y, L.w - 1 - x, L.h - 1 - y);
          if (edge >= L.feather) continue;
          const t = edge / L.feather;
          d.data[(y * L.w + x) * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
        }
      ctx.putImageData(d, 0, 0);
      res['logo.png'] = png(resize(c, Math.round((L.w * L.height) / L.h), L.height));
    }

    // ícone: dentro da moldura arredondada fica opaco; fora, só o brilho (cor → transparência)
    {
      const I = SPEC.icon;
      const side = Math.max(I.w, I.h) + I.pad * 2;
      const ox = Math.round((side - I.w) / 2);
      const oy = Math.round((side - I.h) / 2);
      const [c, ctx] = canvasOf(side, side);
      ctx.drawImage(img, -(I.x - ox), -(I.y - oy));
      const [m, mctx] = canvasOf(side, side);
      mctx.fillStyle = '#fff';
      mctx.beginPath();
      mctx.roundRect(ox, oy, I.w, I.h, I.radius);
      mctx.fill();
      const inside = mctx.getImageData(0, 0, side, side).data;
      // faixa do brilho: até `glow` px fora da moldura (além disso é a arte vizinha)
      mctx.clearRect(0, 0, side, side);
      mctx.beginPath();
      mctx.roundRect(ox - I.glow, oy - I.glow, I.w + I.glow * 2, I.h + I.glow * 2, I.radius + I.glow);
      mctx.fill();
      const halo = mctx.getImageData(0, 0, side, side).data;
      const d = ctx.getImageData(0, 0, side, side);
      const bg = SPEC.bg;
      for (let i = 0; i < d.data.length; i += 4) {
        if (inside[i + 3] > 127) continue;
        if (halo[i + 3] < 128) {
          d.data[i + 3] = 0;
          continue;
        }
        let a = 0;
        for (let k = 0; k < 3; k++) {
          const v = d.data[i + k];
          a = Math.max(a, v > bg[k] ? (v - bg[k]) / (255 - bg[k]) : (bg[k] - v) / bg[k]);
        }
        if (a < 0.12) {
          d.data[i + 3] = 0;
          continue;
        }
        for (let k = 0; k < 3; k++) d.data[i + k] = Math.round((d.data[i + k] - bg[k] * (1 - a)) / a);
        d.data[i + 3] = Math.round(a * 255);
      }
      ctx.putImageData(d, 0, 0);
      for (const [name, size] of Object.entries(SPEC.iconSizes)) res[name] = png(resize(c, size, size));
    }
    return res;
  },
  { src, SPEC },
);
await browser.close();

for (const [name, b64] of Object.entries(files)) {
  writeFileSync(join(out, name), Buffer.from(b64, 'base64'));
  console.log(`public/brand/${name}`);
}
