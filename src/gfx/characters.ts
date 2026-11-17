import type { CharacterLook, HeadStyle, Outfit, PropDef, PropKind, RoleDef, VariantDef } from '../core/types';
import { Pix, dim, mix } from './pixel';

/**
 * Personagens em pixel art, montados em camadas:
 * pernas → tronco/roupa → objeto na mão → cabeça → cabelo/chapéu → rosto → acessórios → contorno.
 *
 * O desenho reproduz a arte de referência (1 - Imagens do jogo/7-todas-as-variantes.png) pixel a pixel;
 * tests/unit/characters.test.ts compara cada personagem com tests/fixtures/reference-sprites.json.
 *
 * Grade de 18×20, já contando o contorno:
 *   linhas 1–4   topo do cabelo / chapéu
 *   linhas 5–11  rosto (olhos nas linhas 6–8, boca na 9, queixo na 11)
 *   linhas 12–15 tronco (braços nas colunas 3 e 14)
 *   linhas 16–18 pernas, sapato e sola
 */

export const SPRITE_W = 18;
export const SPRITE_H = 20;
/** Linhas do quadro usadas no retrato (cabeça e ombros) do HUD e das telas de seleção. */
export const FACE_ROWS: [number, number] = [0, 13];

const INK = '#07080c';
const WHITE = '#f8fafc';
const EYE = '#111111';
const MOUTH = '#8a2e22';
const BLUSH = '#f43f5e';
const HEADSET = '#1f2937';
const STEEL = '#94a3b8';

/** Aparência final de uma variante: aplica o objeto padrão do papel quando a variante não define o seu. */
export function resolveLook(role: RoleDef, v: VariantDef): CharacterLook {
  return v.prop === undefined ? { ...v, prop: role.prop ?? null } : v;
}

/** Cores derivadas da aparência (sombras e brilhos). */
interface Tones {
  skinD: string;
  hairL: string;
  blush: string;
  /** cor principal do tronco e a sombra dela */
  body: string;
  bodyD: string;
  pantsD: string;
  sole: string;
  beard: string;
}

function tonesOf(v: CharacterLook): Tones {
  const body = v.outfit === 'vest' ? (v.outer ?? v.shirt) : v.shirt;
  return {
    skinD: dim(v.skin, 0.84),
    hairL: v.hairLight ?? mix(v.hair, '#ffffff', 0.35),
    blush: mix(v.skin, BLUSH, 0.35),
    body,
    bodyD: v.shade ?? dim(body, 0.72),
    pantsD: v.pantsShade ?? dim(v.pants, 0.72),
    sole: v.sole ?? dim(v.shoes, 0.72),
    beard: v.beardColor ?? v.hair,
  };
}

/** Trecho horizontal da coluna x0 até x1 (inclusive) na linha y. */
const run = (p: Pix, y: number, x0: number, x1: number, c: string | null) => p.rect(x0, y, x1 - x0 + 1, 1, c);
/** Pixels soltos de uma mesma cor. */
const dots = (p: Pix, c: string | null, ...xy: [number, number][]) => xy.forEach(([x, y]) => p.px(x, y, c));

// ───────────────────────────── pernas

/** `frame` 1 levanta a perna esquerda, 2 a direita: a perna encolhe uma linha. */
function drawLegs(p: Pix, v: CharacterLook, t: Tones, frame: number) {
  const outfit = v.outfit ?? 'shirt';
  const legs: { x0: number; x1: number; up: number; right: boolean }[] = [
    { x0: 4, x1: 8, up: frame === 1 ? 1 : 0, right: false },
    { x0: 10, x1: 14, up: frame === 2 ? 1 : 0, right: true },
  ];
  for (const { x0, x1, up, right } of legs) {
    if (outfit === 'dress') {
      // perna de fora e sapatilha, mais estreitas que a calça
      if (!up) {
        run(p, 17, right ? 10 : 5, right ? 11 : 7, v.skin);
        if (right) p.px(12, 17, t.skinD);
      }
      run(p, 18 - up, x0, x1 - 1, v.shoes);
      continue;
    }
    if (!up) {
      if (outfit === 'spacesuit') {
        run(p, 16, x0, right ? 11 : 7, v.pants);
        if (right) run(p, 16, 12, 13, t.bodyD);
      } else {
        run(p, 16, right ? x0 : x0 + 1, right ? x1 - 1 : x1, v.pants); // a perna é mais fina que o sapato
        if (right) p.px(12, 16, t.pantsD);
      }
    }
    run(p, 17 - up, x0, x1 - (right ? 1 : 0), v.shoes);
    if (right) p.px(14, 17 - up, outfit === 'spacesuit' ? '#b91c1c' : t.sole);
    run(p, 18 - up, x0, x1, outfit === 'spacesuit' ? '#7f1d1d' : t.sole);
  }
}

// ───────────────────────────── tronco

type TorsoFn = (p: Pix, v: CharacterLook, t: Tones) => void;

/** Tronco padrão: ombros, braços e a sombra do lado direito. */
function baseTorso(p: Pix, v: CharacterLook, t: Tones, narrowShade: boolean) {
  run(p, 12, 5, 12, t.body);
  p.rect(4, 13, 10, 3, t.body);
  p.rect(3, 13, 1, 2, v.skin);
  p.rect(14, 13, 1, 2, v.skin);
  if (narrowShade) {
    p.rect(13, 13, 1, 3, t.bodyD);
    p.px(12, 15, t.bodyD);
  } else p.rect(12, 13, 2, 3, t.bodyD);
}

/** Gola ou camisa aparecendo no meio do peito. */
const placket: TorsoFn = (p, v) => {
  if (v.accent) p.rect(8, 12, 2, 2, v.accent);
};

const OUTFITS: Record<Outfit, TorsoFn> = {
  shirt: (p, v, t) => {
    // com a lupa o braço fica erguido e a sombra do peito é mais estreita
    baseTorso(p, v, t, v.prop?.kind === 'magnifier');
    placket(p, v, t);
  },
  polo: (p, v, t) => {
    baseTorso(p, v, t, false);
    if (v.accent) dots(p, v.accent, [5, 12], [6, 12], [11, 12], [12, 12]);
    p.px(8, 14, '#0f172a');
  },
  tee: (p, v, t) => {
    baseTorso(p, v, t, true);
    if (v.logo) {
      run(p, 13, 8, 9, v.logo);
      run(p, 14, 7, 10, v.logo);
    }
  },
  suit: (p, v, t) => {
    baseTorso(p, v, t, false);
    if (!v.tie) return placket(p, v, t);
    if (v.accent) dots(p, v.accent, [7, 12], [10, 12], [7, 13], [10, 13]);
    p.rect(8, 12, 2, 3, v.tie);
  },
  jacket: (p, v, t) => {
    baseTorso(p, v, t, false);
    if (!v.accent) return;
    run(p, 12, 8, 9, v.accent);
    p.rect(7, 13, 4, 2, v.accent);
  },
  vest: (p, v, t) => {
    baseTorso(p, v, t, false);
    dots(p, v.shirt, [6, 13]);
    run(p, 14, 6, 9, v.shirt);
    if (v.bandana) {
      run(p, 12, 7, 10, v.bandana);
      run(p, 13, 7, 9, v.bandana);
    }
    run(p, 15, 6, 9, '#3f2a14'); // cinto
    run(p, 15, 7, 8, '#fbbf24'); // fivela
  },
  dress: (p, v, t) => {
    run(p, 12, 5, 12, t.body);
    run(p, 13, 4, 11, t.body);
    run(p, 13, 12, 13, t.bodyD);
    run(p, 14, 4, 13, v.accent ?? t.body); // faixa na cintura
    run(p, 15, 3, 12, t.body);
    run(p, 15, 13, 14, t.bodyD);
    run(p, 16, 2, 12, t.body);
    run(p, 16, 13, 15, t.bodyD);
    p.rect(3, 13, 1, 2, v.skin);
    p.rect(14, 13, 1, 2, v.skin);
    if (v.accent) run(p, 12, 8, 9, v.accent); // decote
  },
  spacesuit: (p, v, t) => {
    const joint = '#64748b';
    const stripe = v.accent ?? '#ef4444';
    run(p, 11, 3, 14, t.bodyD);
    run(p, 11, 4, 13, stripe);
    run(p, 12, 3, 15, joint);
    run(p, 12, 4, 13, t.body);
    p.px(14, 12, t.bodyD);
    for (const y of [13, 14]) {
      run(p, y, 2, 15, t.body);
      dots(p, joint, [3, y], [14, y]);
      p.px(13, y, t.bodyD);
    }
    run(p, 13, 6, 7, stripe);
    dots(p, '#22d3ee', [6, 14]);
    dots(p, '#fde047', [7, 14]);
    run(p, 15, 3, 15, joint);
    run(p, 15, 4, 12, t.body);
    run(p, 15, 13, 14, t.bodyD);
  },
  robot: (p, v, t) => {
    const joint = v.pants;
    run(p, 11, 6, 11, joint); // pescoço
    run(p, 12, 4, 13, t.body);
    p.rect(4, 13, 10, 3, t.body);
    p.rect(13, 13, 1, 3, v.hair);
    p.px(12, 15, v.hair);
    p.rect(2, 13, 2, 2, joint);
    p.px(14, 13, joint);
    run(p, 13, 7, 8, v.hat ?? v.accent ?? WHITE); // luz do peito
  },
};

/** Roupas com o braço fixo: o objeto é só encaixado na mão, sem mexer no tronco. */
const STIFF: Outfit[] = ['dress', 'spacesuit', 'robot'];

// ───────────────────────────── objeto na mão direita

type PropFn = (p: Pix, prop: PropDef, v: CharacterLook, t: Tones, stiff: boolean) => void;

/** Antebraço dobrado para a frente: a mão passa para dentro do tronco. */
function bendArm(p: Pix, v: CharacterLook, t: Tones) {
  p.px(12, 14, t.bodyD);
  p.px(13, 14, v.skin);
}

/** Abre espaço ao lado da cintura para o objeto. */
function tuckWaist(p: Pix, t: Tones) {
  p.px(11, 15, t.bodyD);
  p.px(13, 15, null);
}

const PROPS: Record<PropKind, PropFn> = {
  magnifier: (p, prop, v, t, stiff) => {
    if (!stiff) {
      bendArm(p, v, t);
      tuckWaist(p, t);
    }
    const frame = prop.trim ?? STEEL;
    dots(p, frame, [15, 13], [16, 13], [14, 14], [16, 14], [15, 15]);
    p.px(15, 14, prop.color);
  },
  card: (p, prop, v, t, stiff) => {
    if (!stiff) {
      bendArm(p, v, t);
      p.px(14, 14, prop.color);
    }
    p.rect(15, 13, 2, 2, prop.color);
  },
  phone: (p, prop) => {
    const body = '#111827';
    dots(p, body, [15, 13], [15, 14], [14, 15], [15, 15]);
    p.px(16, 14, prop.color);
  },
  guitar: (p, prop, _v, t) => {
    tuckWaist(p, t);
    dots(p, '#78350f', [15, 13], [16, 14]); // braço
    run(p, 14, 14, 15, prop.color);
    run(p, 15, 13, 15, prop.color);
    run(p, 16, 13, 14, prop.color);
  },
  briefcase: (p, prop) => {
    run(p, 14, 15, 16, prop.color);
    p.rect(14, 15, 3, 2, prop.color);
  },
  lasso: (p, prop) => {
    dots(p, prop.color, [15, 13], [15, 15]);
    run(p, 14, 14, 16, prop.color);
  },
};

// ───────────────────────────── cabeça

interface HeadDef {
  /** a cabeça inteira é desenhada aqui (robô, capacete): sem pele, rosto ou acessórios */
  whole?: boolean;
  /** desenhado depois da pele e antes do rosto */
  draw: (p: Pix, v: CharacterLook, t: Tones) => void;
  /** desenhado depois do rosto (máscaras) */
  over?: (p: Pix, v: CharacterLook, t: Tones) => void;
  /** olhos com 2 linhas de altura (o resto fica coberto) */
  shortEyes?: boolean;
}

/** Pele do rosto, com sombra à direita e no queixo, e as orelhas. */
function drawSkin(p: Pix, v: CharacterLook, t: Tones) {
  p.rect(3, 5, 11, 6, v.skin);
  p.rect(14, 5, 1, 6, t.skinD);
  run(p, 11, 4, 13, v.skin);
  dots(p, t.skinD, [4, 11], [5, 11], [12, 11], [13, 11]);
  dots(p, v.skin, [2, 7], [2, 8], [15, 7], [15, 8]);
}

/** Topo arredondado do cabelo (linhas 1–4), comum à maioria dos cortes. */
function hairCap(p: Pix, c: string) {
  run(p, 1, 5, 12, c);
  run(p, 2, 4, 13, c);
  run(p, 3, 3, 14, c);
  run(p, 4, 2, 15, c);
}

/** Cabelo descendo ao lado do rosto, da linha y0 à y1. */
function sideburns(p: Pix, c: string, y0: number, y1: number) {
  p.rect(2, y0, 1, y1 - y0 + 1, c);
  p.rect(15, y0, 1, y1 - y0 + 1, c);
}

/** Cabelo curto: topo + costeletas. */
function shortHair(p: Pix, v: CharacterLook) {
  hairCap(p, v.hair);
  dots(p, v.hair, [3, 5], [14, 5]);
  sideburns(p, v.hair, 5, 6);
}

/** Franja repicada na testa (aparece sob o headset e o chapéu). */
function fringe(p: Pix, v: CharacterLook) {
  dots(p, v.hair, [3, 5], [6, 5], [12, 5], [14, 5]);
  sideburns(p, v.hair, 5, 6);
}

const HEADS: Record<HeadStyle, HeadDef> = {
  /** topete cheio, sem brilho */
  quiff: {
    draw: (p, v) => {
      run(p, 1, 4, 11, v.hair);
      run(p, 2, 3, 14, v.hair);
      p.rect(2, 3, 14, 2, v.hair);
      dots(p, v.hair, [3, 5], [14, 5]);
      sideburns(p, v.hair, 5, 6);
    },
  },
  /** topete jogado para a direita */
  pompadour: {
    draw: (p, v, t) => {
      run(p, 1, 8, 13, v.hair);
      run(p, 2, 5, 14, v.hair);
      run(p, 3, 3, 14, v.hair);
      run(p, 4, 2, 15, v.hair);
      run(p, 2, 10, 12, t.hairL);
      p.px(12, 3, t.hairL);
      dots(p, v.hair, [3, 5], [14, 5]);
      sideburns(p, v.hair, 5, 6);
    },
  },
  /** repartido de lado, com a testa aparecendo */
  side: {
    draw: (p, v, t) => {
      hairCap(p, v.hair);
      run(p, 3, 9, 11, t.hairL);
      run(p, 4, 8, 13, v.skin);
      sideburns(p, v.hair, 5, 6);
    },
  },
  short: {
    draw: (p, v, t) => {
      shortHair(p, v);
      run(p, 2, 10, 11, t.hairL);
    },
  },
  crop: {
    draw: (p, v, t) => {
      shortHair(p, v);
      run(p, 3, 9, 10, t.hairL);
    },
  },
  plain: { draw: (p, v) => shortHair(p, v) },
  fringe: {
    draw: (p, v, t) => {
      hairCap(p, v.hair);
      run(p, 3, 9, 10, t.hairL);
      fringe(p, v);
    },
  },
  /** raspado nas laterais */
  shaved: {
    draw: (p, v) => {
      run(p, 1, 5, 12, v.hair);
      run(p, 2, 4, 13, v.hair);
      p.rect(3, 3, 12, 2, v.hair);
      sideburns(p, mix(v.hair, v.skin, 0.45), 4, 5);
      dots(p, v.skin, [2, 6], [15, 6]);
    },
  },
  bald: {
    draw: (p, v, t) => {
      run(p, 1, 5, 12, v.skin);
      run(p, 2, 4, 12, v.skin);
      p.px(13, 2, t.skinD);
      run(p, 2, 6, 7, WHITE); // brilho
      run(p, 3, 3, 13, v.skin);
      p.px(14, 3, t.skinD);
      run(p, 4, 2, 13, v.skin);
      run(p, 4, 14, 15, t.skinD);
      sideburns(p, v.skin, 5, 8);
    },
  },
  long: {
    draw: (p, v, t) => {
      hairCap(p, v.hair);
      run(p, 2, 10, 11, t.hairL);
      dots(p, v.hair, [3, 5], [13, 5], [14, 5], [3, 10], [14, 10], [3, 11], [14, 11]);
      sideburns(p, v.hair, 5, 11);
      // o cabelo cobre a lateral do queixo
      p.px(13, 10, t.skinD);
      dots(p, null, [4, 11], [13, 11]);
      dots(p, t.skinD, [6, 11], [11, 11]);
    },
  },
  bun: {
    draw: (p, v, t) => {
      p.rect(7, 1, 4, 2, v.hair);
      p.px(8, 2, t.hairL);
      run(p, 3, 4, 13, v.hair);
      run(p, 4, 3, 14, v.hair);
      dots(p, v.hair, [3, 5], [13, 5], [14, 5]);
      sideburns(p, v.hair, 5, 9);
    },
  },
  cowboy: {
    draw: (p, v) => {
      const hat = v.hat ?? '#8b5a2b';
      run(p, 1, 6, 11, hat);
      run(p, 2, 5, 12, hat);
      run(p, 3, 5, 12, '#3f2a14'); // faixa
      run(p, 4, 1, 16, hat); // aba
      fringe(p, v);
    },
  },
  ninja: {
    shortEyes: true,
    draw: (p, v) => {
      const band = v.hat ?? '#8b5cf6';
      run(p, 1, 5, 12, v.hair);
      run(p, 2, 4, 13, v.hair);
      run(p, 3, 3, 14, v.hair);
      run(p, 4, 2, 16, band);
      sideburns(p, v.hair, 5, 7);
      dots(p, band, [16, 5], [15, 6], [16, 6], [16, 7]); // pontas do nó
    },
    over: (p, v) => {
      p.rect(2, 8, 14, 2, v.hair);
      run(p, 10, 3, 14, v.hair);
      run(p, 11, 4, 13, v.hair);
    },
  },
  robot: {
    whole: true,
    draw: (p, v) => {
      const metal = v.skin;
      const dark = v.hair;
      const joint = v.pants;
      const screen = '#0f172a';
      const light = v.accent ?? '#5eead4';
      run(p, 1, 8, 9, v.hat ?? light); // antena
      run(p, 2, 8, 9, joint);
      run(p, 3, 4, 13, metal);
      p.rect(3, 4, 12, 7, metal);
      p.rect(15, 4, 1, 7, dark);
      p.rect(2, 5, 1, 4, joint); // parafusos laterais
      p.rect(16, 5, 1, 4, joint);
      p.rect(4, 5, 10, 5, screen);
      p.rect(6, 6, 2, 2, light);
      p.rect(10, 6, 2, 2, light);
      run(p, 9, 7, 10, light);
    },
  },
  helmet: {
    whole: true,
    draw: (p, v, t) => {
      const shell = v.shirt;
      const visor = STEEL;
      run(p, 1, 5, 12, shell);
      run(p, 2, 3, 14, shell);
      run(p, 3, 2, 14, shell);
      p.px(15, 3, t.bodyD);
      p.rect(1, 4, 14, 6, shell);
      p.rect(15, 4, 2, 6, t.bodyD);
      run(p, 10, 2, 14, shell);
      p.px(15, 10, t.bodyD);
      // visor com o rosto dentro
      p.rect(3, 4, 12, 6, visor);
      run(p, 4, 1, 3, shell);
      p.px(14, 4, shell);
      p.rect(4, 5, 10, 4, v.skin);
      p.rect(4, 5, 1, 2, '#bae6fd'); // reflexo
      run(p, 5, 5, 12, v.hair);
      dots(p, t.skinD, [13, 7], [13, 8]);
      dots(p, EYE, [6, 6], [10, 6]);
      dots(p, shell, [7, 6], [11, 6]);
      run(p, 7, 6, 7, EYE);
      run(p, 7, 10, 11, EYE);
      dots(p, t.blush, [5, 8], [12, 8]);
      run(p, 8, 8, 9, v.mouth ?? MOUTH);
    },
  },
};

export const HEAD_STYLES = Object.keys(HEADS) as HeadStyle[];

// ───────────────────────────── rosto

function drawBeard(p: Pix, v: CharacterLook, t: Tones) {
  switch (v.beard) {
    case 'full':
      dots(p, t.beard, [3, 9], [14, 9]);
      run(p, 10, 3, 14, t.beard);
      run(p, 11, 4, 13, t.beard);
      break;
    case 'short':
      // contorna o rosto e fecha em bigode
      dots(p, t.beard, [2, 9], [15, 9], [2, 10], [3, 10], [14, 10], [15, 10]);
      run(p, 9, 5, 12, t.beard);
      run(p, 11, 3, 14, t.beard);
      p.px(13, 10, t.skinD);
      break;
    case 'goatee':
      run(p, 9, 6, 11, t.beard);
      run(p, 11, 7, 10, t.beard);
      break;
  }
}

function drawMouth(p: Pix, v: CharacterLook, t: Tones) {
  const c = v.mouth ?? MOUTH;
  if (v.beard === 'short') {
    if (v.smile) {
      dots(p, t.beard, [4, 10], [13, 10]);
      dots(p, c, [5, 10], [12, 10]);
      run(p, 10, 6, 11, WHITE);
    } else run(p, 10, 7, 10, c);
  } else if (v.eyewear === 'thick' && v.smile) {
    // os óculos grandes empurram o sorriso para baixo
    dots(p, c, [6, 10], [11, 10]);
    run(p, 10, 7, 10, WHITE);
  } else if (v.beard === 'goatee') run(p, 10, 8, 9, c);
  else run(p, 9, 8, 9, c);
}

function drawFace(p: Pix, v: CharacterLook, t: Tones, shortEyes: boolean) {
  const hidden = v.eyewear === 'round-shades'; // lentes cobrem os olhos
  if (!hidden) {
    const top = v.brows === 'thick' ? 7 : 6;
    const bottom = shortEyes ? 7 : 8;
    for (const x of [5, 11]) {
      p.rect(x, top, 2, bottom - top + 1, EYE);
      p.px(x + 1, top, WHITE);
    }
    if (v.blush !== false) dots(p, t.blush, [4, 8], [13, 8]);
  }
  if (v.brows === 'thick') {
    run(p, 6, 4, 6, v.hair);
    run(p, 6, 11, 13, v.hair);
  } else if (v.brows === 'raised') {
    run(p, 5, 4, 5, v.hair);
    run(p, 5, 10, 11, v.hair);
  }
  drawBeard(p, v, t);
  drawMouth(p, v, t);
}

/** Armação retangular fina; `topBar` fecha a parte de cima. */
function frames(p: Pix, c: string, topBar: boolean) {
  for (const x of [4, 10]) {
    if (topBar) run(p, 5, x, x + 3, c);
    p.rect(x, 6, 1, 2, c);
    p.rect(x + 3, 6, 1, 2, c);
    run(p, 8, x, x + 3, c);
  }
  run(p, 6, 8, 9, c); // ponte
}

function drawEyewear(p: Pix, v: CharacterLook, t: Tones) {
  switch (v.eyewear) {
    case 'clear':
      frames(p, '#e5e7eb', true);
      break;
    case 'dark':
      frames(p, '#2a2a2e', false);
      break;
    case 'thick': {
      const frame = '#16161a';
      const lens = '#e9e0d5';
      for (const x of [3, 10]) {
        run(p, 6, x, x + 4, frame);
        run(p, 9, x, x + 4, frame);
        p.rect(x, 7, 1, 2, frame);
        p.rect(x + 4, 7, 1, 2, frame);
        dots(p, WHITE, [x + 1, 7]);
        dots(p, EYE, [x + 2, 7], [x + 2, 8]);
        dots(p, lens, [x + 3, 7], [x + 1, 8], [x + 3, 8]);
      }
      run(p, 7, 8, 9, frame); // ponte
      // as hastes passam por cima das orelhas
      p.px(2, 9, v.skin);
      p.rect(15, 7, 1, 3, t.skinD);
      break;
    }
    case 'shades':
      run(p, 6, 4, 7, '#0a0a0a');
      run(p, 6, 10, 13, '#0a0a0a');
      run(p, 7, 4, 13, '#0a0a0a');
      run(p, 8, 5, 6, '#0a0a0a');
      run(p, 8, 11, 12, '#0a0a0a');
      break;
    case 'round-shades': {
      const frame = '#111114';
      const lens = '#1c1c22';
      run(p, 5, 4, 13, frame);
      run(p, 6, 3, 14, frame);
      for (const x of [4, 10]) {
        p.px(x, 6, '#4b5563'); // reflexo
        run(p, 6, x + 1, x + 3, lens);
        dots(p, frame, [x, 7], [x + 3, 7]);
        run(p, 7, x + 1, x + 2, lens);
      }
      break;
    }
  }
}

function drawHeadset(p: Pix) {
  run(p, 1, 5, 12, HEADSET);
  for (const [outer, inner] of [[1, 2], [16, 15]]) {
    p.rect(outer, 5, 1, 5, HEADSET);
    p.rect(inner, 6, 1, 3, HEADSET);
    p.px(inner, 9, null); // a concha esconde a ponta da orelha
  }
}

// ───────────────────────────── montagem

/** Desenha um personagem; `frame` 0 = parado, 1/2 = passos da caminhada. */
export function drawCharacter(v: CharacterLook, frame = 0): Pix {
  const p = new Pix(SPRITE_W, SPRITE_H);
  const t = tonesOf(v);
  const outfit = v.outfit ?? 'shirt';
  const head = HEADS[v.style] ?? HEADS.short;

  drawLegs(p, v, t, frame);
  OUTFITS[outfit](p, v, t);
  if (v.prop) PROPS[v.prop.kind](p, v.prop, v, t, STIFF.includes(outfit));

  if (head.whole) head.draw(p, v, t);
  else {
    drawSkin(p, v, t);
    head.draw(p, v, t);
    drawFace(p, v, t, head.shortEyes === true);
    drawEyewear(p, v, t);
    head.over?.(p, v, t);
    if (v.headset) drawHeadset(p);
  }
  return p.outline(INK);
}
