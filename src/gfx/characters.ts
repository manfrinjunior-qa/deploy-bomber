import type { CharacterLook, HeadStyle, Outfit, PropDef, PropKind, RoleDef, VariantDef } from '../core/types';
import { Pix, shade } from './pixel';

/**
 * Personagens 16×16 (+ contorno) montados em camadas:
 * pernas → tronco/roupa → objeto na mão → cabeça → cabelo/chapéu → rosto → acessórios.
 * Coordenadas locais: cabeça em (3..12, 2..8), tronco em (4..11, 9..12), mão direita em (12, 12).
 */

const INK = '#0b0d14';

/** Quadro do sprite: 16×16 + contorno, com uma linha extra em cima para coque, antena e chapéu. */
export const SPRITE_W = 18;
export const SPRITE_H = 19;
/** Linhas do quadro usadas no retrato (cabeça) do HUD e da seleção. */
export const FACE_ROWS: [number, number] = [0, 12];
const WHITE = '#f8fafc';
const BLUSH = '#f19a9a';
const LIP = '#9b2c2c';
const DARK_LENS = '#111827';
const LENS_SHINE = '#475569';

/** Aparência final de uma variante: aplica o objeto padrão do papel quando a variante não define o seu. */
export function resolveLook(role: RoleDef, v: VariantDef): CharacterLook {
  return v.prop === undefined ? { ...v, prop: role.prop ?? null } : v;
}

// ───────────────────────────── corpo

function drawLegs(p: Pix, v: CharacterLook, frame: number) {
  const lUp = frame === 1 ? 1 : 0;
  const rUp = frame === 2 ? 1 : 0;
  const leg = v.outfit === 'dress' ? v.skin : v.pants;
  p.rect(5, 13, 2, 2 - lUp, leg);
  p.rect(9, 13, 2, 2 - rUp, leg);
  p.rect(5, 15 - lUp, 2, 1, v.shoes);
  p.rect(9, 15 - rUp, 2, 1, v.shoes);
}

type OutfitFn = (p: Pix, v: CharacterLook, dark: string) => void;

function collarAndTie(p: Pix, v: CharacterLook) {
  p.rect(6, 9, 4, 1, v.accent);
  p.rect(7, 9, 2, 4, v.tie!);
}

const OUTFITS: Record<Outfit, OutfitFn> = {
  shirt: (p, v) => {
    if (v.tie) return collarAndTie(p, v);
    p.rect(6, 10, 4, 1, v.accent);
    p.rect(7, 9, 2, 1, v.accent);
  },
  polo: (p, v, dark) => {
    p.px(6, 9, v.accent);
    p.px(9, 9, v.accent);
    p.rect(7, 9, 2, 2, dark);
  },
  tee: (p, v) => {
    p.rect(6, 9, 4, 1, shade(v.shirt, -0.12));
  },
  suit: (p, v, dark) => {
    if (v.tie) return collarAndTie(p, v);
    p.px(6, 9, dark);
    p.px(9, 9, dark);
    p.rect(7, 9, 2, 2, v.accent);
  },
  dress: (p, v) => {
    p.rect(6, 9, 4, 1, v.skin);
    p.rect(4, 11, 8, 1, v.accent);
    p.rect(3, 12, 10, 1, v.shirt);
    p.rect(3, 13, 10, 1, shade(v.shirt, -0.2));
  },
  jacket: (p, v, dark) => {
    p.rect(6, 9, 4, 2, v.accent);
    p.px(5, 9, dark);
    p.px(10, 9, dark);
  },
  vest: (p, v) => {
    const vest = v.outer ?? '#7c4a1e';
    p.rect(4, 9, 2, 3, vest);
    p.rect(10, 9, 2, 3, shade(vest, -0.15));
    p.rect(4, 12, 8, 1, '#3f2a14');
    p.px(7, 12, '#fbbf24');
  },
  spacesuit: (p, v) => {
    p.rect(4, 9, 8, 1, v.accent);
    p.px(6, 10, '#ef4444');
    p.px(7, 10, '#38bdf8');
    p.px(6, 11, '#38bdf8');
    p.px(7, 11, '#fde047');
  },
  robot: (p, v) => {
    p.rect(6, 10, 4, 2, shade(v.shirt, -0.25));
    p.rect(7, 10, 2, 1, v.accent);
  },
};

function drawTorso(p: Pix, v: CharacterLook) {
  const outfit = v.outfit ?? 'shirt';
  const dark = shade(v.shirt, -0.2);
  const gloved = outfit === 'spacesuit' || outfit === 'robot';
  p.rect(4, 9, 8, 4, v.shirt);
  p.rect(11, 9, 1, 4, dark);
  p.rect(3, 9, 1, 3, v.shirt);
  p.rect(12, 9, 1, 3, dark);
  const hand = gloved ? '#cbd5e1' : v.skin;
  p.px(3, 12, hand);
  p.px(12, 12, hand);
  OUTFITS[outfit](p, v, dark);
  if (v.logo) {
    p.rect(7, 10, 2, 1, v.logo);
    p.rect(6, 11, 4, 1, v.logo);
  }
  if (v.bandana) {
    p.rect(5, 9, 6, 1, v.bandana);
    p.px(7, 10, v.bandana);
  }
}

const PROPS: Record<PropKind, (p: Pix, c: string) => void> = {
  magnifier: (p, c) => {
    p.rect(13, 10, 2, 2, c);
    p.px(13, 10, shade(c, 0.45));
    p.px(13, 12, '#64748b');
  },
  card: (p, c) => {
    p.rect(13, 10, 2, 3, c);
    p.px(13, 10, shade(c, 0.35));
  },
  phone: (p, c) => {
    p.rect(13, 10, 1, 3, DARK_LENS);
    p.px(13, 11, c);
  },
  guitar: (p, c) => {
    p.rect(14, 8, 1, 3, '#78350f');
    p.rect(12, 11, 3, 2, c);
    p.px(13, 11, INK);
  },
  briefcase: (p, c) => {
    p.rect(13, 10, 2, 3, c);
  },
  lasso: (p, c) => {
    p.rect(13, 10, 2, 1, c);
    p.px(14, 11, c);
    p.rect(13, 12, 2, 1, c);
  },
};

function drawProp(p: Pix, prop: PropDef | null | undefined) {
  if (prop) PROPS[prop.kind](p, prop.color);
}

// ───────────────────────────── cabeça

/** 'full' = olhos + boca + bochechas; 'eyes' = só olhos (rosto parcialmente coberto); 'none' = a cabeça desenha o próprio rosto. */
type FaceMode = 'full' | 'eyes' | 'none';

interface HeadDef {
  face: FaceMode;
  /** desenhado antes do rosto */
  draw: (p: Pix, v: CharacterLook) => void;
  /** desenhado depois do rosto (máscaras, visores) */
  over?: (p: Pix, v: CharacterLook) => void;
}

const sideHair = (p: Pix, v: CharacterLook, y: number, h: number) => {
  p.rect(2, y, 1, h, v.hair);
  p.rect(13, y, 1, h, shade(v.hair, -0.2));
};

const HEADS: Record<HeadStyle, HeadDef> = {
  quiff: {
    face: 'full',
    draw: (p, v) => {
      p.rect(3, 1, 10, 2, v.hair);
      p.rect(4, 0, 7, 1, v.hair);
      p.rect(3, 3, 2, 1, v.hair);
      p.rect(11, 3, 2, 1, v.hair);
      sideHair(p, v, 2, 4);
      p.rect(9, 0, 2, 1, shade(v.hair, 0.3));
    },
  },
  combed: {
    face: 'full',
    draw: (p, v) => {
      p.rect(3, 1, 10, 2, v.hair);
      p.rect(3, 3, 4, 1, v.hair);
      sideHair(p, v, 2, 4);
      p.rect(8, 1, 3, 1, shade(v.hair, 0.18));
    },
  },
  shaved: {
    face: 'full',
    draw: (p, v) => {
      p.rect(3, 1, 10, 2, v.hair);
      p.rect(2, 3, 1, 3, shade(v.hair, -0.2));
      p.rect(13, 3, 1, 3, shade(v.hair, -0.3));
      p.px(5, 1, shade(v.hair, 0.15));
    },
  },
  bald: {
    face: 'full',
    draw: (p, v) => {
      p.rect(4, 1, 8, 1, v.skin);
      p.px(6, 2, shade(v.skin, 0.35));
      sideHair(p, v, 4, 3);
    },
  },
  long: {
    face: 'full',
    draw: (p, v) => {
      p.rect(3, 1, 10, 2, v.hair);
      sideHair(p, v, 2, 9);
      p.rect(3, 3, 3, 1, v.hair);
      p.rect(4, 1, 3, 1, shade(v.hair, 0.18));
    },
  },
  bun: {
    face: 'full',
    draw: (p, v) => {
      p.rect(3, 1, 10, 2, v.hair);
      p.rect(6, 0, 4, 1, v.hair);
      p.rect(7, -1, 2, 1, v.hair);
      sideHair(p, v, 3, 4);
      p.rect(4, 1, 2, 1, shade(v.hair, 0.18));
    },
  },
  afro: {
    face: 'full',
    draw: (p, v) => {
      p.rect(2, 0, 12, 3, v.hair);
      p.rect(1, 2, 2, 6, v.hair);
      p.rect(13, 2, 2, 6, shade(v.hair, -0.2));
      p.rect(4, 0, 3, 1, shade(v.hair, 0.18));
    },
  },
  hood: {
    face: 'full',
    draw: (p, v) => {
      const h = v.hat ?? v.shirt;
      const hd = shade(h, -0.25);
      p.rect(2, 1, 12, 3, h);
      p.rect(2, 4, 1, 6, h);
      p.rect(13, 4, 1, 6, hd);
      p.rect(3, 3, 10, 1, hd);
      p.rect(4, 1, 6, 1, shade(h, 0.2));
    },
  },
  beanie: {
    face: 'full',
    draw: (p, v) => {
      const h = v.hat ?? v.hair;
      p.rect(2, 3, 1, 4, v.hair);
      p.rect(13, 3, 1, 4, v.hair);
      p.rect(3, 0, 10, 3, h);
      p.rect(3, 2, 10, 1, shade(h, -0.25));
      for (const x of [4, 7, 10]) p.px(x, 1, shade(h, 0.3));
    },
  },
  cap: {
    face: 'full',
    draw: (p, v) => {
      const h = v.hat ?? '#0f9b8e';
      sideHair(p, v, 4, 3);
      p.rect(3, 0, 10, 3, h);
      p.rect(2, 3, 12, 1, shade(h, -0.3));
      p.rect(7, 1, 2, 1, WHITE);
    },
  },
  cowboy: {
    face: 'full',
    draw: (p, v) => {
      const h = v.hat ?? '#8b5a2b';
      sideHair(p, v, 3, 3);
      p.rect(5, -1, 6, 1, h);
      p.rect(4, 0, 8, 2, h);
      p.rect(4, 1, 8, 1, shade(h, -0.35));
      p.rect(0, 2, 16, 1, shade(h, -0.1));
      p.rect(6, -1, 2, 1, shade(h, 0.2));
    },
  },
  ninja: {
    face: 'eyes',
    draw: (p, v) => {
      const hood = v.hair;
      const band = v.hat ?? '#8B5CF6';
      p.rect(2, 1, 12, 3, hood);
      p.rect(2, 4, 1, 6, hood);
      p.rect(13, 4, 1, 6, shade(hood, -0.25));
      p.rect(2, 3, 12, 1, band);
      p.rect(14, 3, 1, 2, band);
      p.rect(5, 1, 4, 1, shade(hood, 0.2));
    },
    over: (p, v) => {
      p.rect(3, 7, 10, 2, v.hair);
      p.rect(12, 7, 1, 2, shade(v.hair, -0.25));
    },
  },
  robot: {
    face: 'none',
    draw: (p, v) => {
      const metal = v.skin;
      const bolt = shade(metal, -0.35);
      p.rect(7, -1, 2, 1, v.accent);
      p.rect(7, 0, 2, 1, bolt);
      p.rect(2, 1, 12, 8, metal);
      p.rect(13, 1, 1, 8, shade(metal, -0.2));
      p.rect(2, 8, 12, 1, shade(metal, -0.2));
      p.rect(1, 4, 1, 3, bolt);
      p.rect(14, 4, 1, 3, bolt);
      p.rect(4, 3, 8, 4, '#0f172a');
      p.rect(5, 4, 2, 2, v.accent);
      p.rect(9, 4, 2, 2, v.accent);
      p.rect(6, 6, 4, 1, shade(v.accent, -0.2));
    },
  },
  helmet: {
    face: 'eyes',
    draw: (p, v) => {
      const suit = v.shirt;
      p.rect(3, -1, 10, 1, suit);
      p.rect(2, 0, 12, 1, suit);
      p.rect(1, 1, 14, 8, suit);
      p.rect(13, 1, 2, 8, shade(suit, -0.12));
      p.rect(3, 2, 10, 6, '#94a3b8');
      p.rect(4, 3, 8, 4, v.skin);
      p.rect(4, 3, 8, 1, v.hair);
      p.px(4, 4, shade(v.skin, 0.4));
    },
  },
};

export const HEAD_STYLES = Object.keys(HEADS) as HeadStyle[];

function drawFace(p: Pix, v: CharacterLook, mode: FaceMode) {
  if (mode === 'none') return;
  const beardColor = v.beardColor ?? v.hair;
  if (v.brows) {
    p.rect(4, 4, 3, 1, v.hair);
    p.rect(9, 4, 3, 1, v.hair);
  }
  // lentes claras ficam atrás dos olhos
  if (v.eyewear === 'clear' || v.eyewear === 'thick') {
    p.rect(4, 4, 3, 3, '#e5e7eb');
    p.rect(9, 4, 3, 3, '#e5e7eb');
    p.rect(7, 5, 2, 1, '#e5e7eb');
  }
  p.rect(5, 5, 2, 2, INK);
  p.rect(9, 5, 2, 2, INK);
  p.px(6, 5, '#ffffff');
  p.px(10, 5, '#ffffff');
  if (mode === 'full') {
    switch (v.beard) {
      case 'full':
        p.rect(4, 7, 8, 2, beardColor);
        break;
      case 'short':
        p.rect(3, 6, 1, 3, beardColor);
        p.rect(12, 6, 1, 3, beardColor);
        p.rect(4, 8, 8, 1, beardColor);
        p.px(4, 7, beardColor);
        p.px(11, 7, beardColor);
        break;
      case 'goatee':
        p.rect(5, 7, 6, 1, beardColor);
        p.rect(7, 8, 2, 1, beardColor);
        break;
      default:
        p.px(4, 7, BLUSH);
        p.px(11, 7, BLUSH);
    }
    if (v.beard !== 'goatee') {
      if (v.smile) {
        p.rect(5, 7, 6, 1, WHITE);
        p.px(5, 7, v.mouth ?? LIP);
        p.px(10, 7, v.mouth ?? LIP);
      } else p.rect(7, 7, 2, 1, v.mouth ?? LIP);
    }
  }
  switch (v.eyewear) {
    case 'thick':
      p.rect(4, 4, 3, 1, INK);
      p.rect(9, 4, 3, 1, INK);
      p.rect(7, 5, 2, 1, INK);
      p.px(3, 5, INK);
      p.px(12, 5, INK);
      break;
    case 'shades':
      p.rect(3, 5, 10, 2, DARK_LENS);
      p.px(5, 5, LENS_SHINE);
      p.px(10, 5, LENS_SHINE);
      break;
    case 'round-shades':
      p.rect(4, 5, 3, 2, DARK_LENS);
      p.rect(9, 5, 3, 2, DARK_LENS);
      p.rect(7, 5, 2, 1, DARK_LENS);
      p.px(4, 5, LENS_SHINE);
      p.px(9, 5, LENS_SHINE);
      break;
  }
}

function drawHeadset(p: Pix) {
  p.rect(3, 0, 10, 1, DARK_LENS);
  p.rect(2, 3, 1, 4, DARK_LENS);
  p.rect(13, 3, 1, 4, DARK_LENS);
  p.rect(3, 7, 2, 1, DARK_LENS);
  p.px(5, 7, '#38bdf8');
}

// ───────────────────────────── montagem

/** Desenha um personagem; `frame` 0 = parado, 1/2 = passos da caminhada. */
export function drawCharacter(v: CharacterLook, frame = 0): Pix {
  const p = new Pix(SPRITE_W, SPRITE_H, 1, 2);
  const head = HEADS[v.style] ?? HEADS.combed;

  drawLegs(p, v, frame);
  drawTorso(p, v);
  drawProp(p, v.prop);

  p.rect(3, 2, 10, 7, v.skin);
  p.rect(12, 3, 1, 6, shade(v.skin, -0.18));
  p.rect(4, 8, 8, 1, shade(v.skin, -0.18));

  head.draw(p, v);
  drawFace(p, v, head.face);
  head.over?.(p, v);
  if (v.headset) drawHeadset(p);
  return p.outline(INK);
}
