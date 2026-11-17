import { describe, expect, it } from 'vitest';
import { BOSSES, ROLES, roleById } from '../../src/core/data';
import type { CharacterLook } from '../../src/core/types';
import reference from '../fixtures/reference-sprites.json';
import { HEAD_STYLES, SPRITE_H, SPRITE_W, drawCharacter, resolveLook } from '../../src/gfx/characters';

const INK = '#07080c';

/** Spec V2 · Variantes de visual (a primeira é a padrão). */
const SPEC_VARIANTS: Record<string, string[]> = {
  DEV: ['Personalizado', 'Personalizado 2', 'Ninja', 'Back-end', 'Mobile'],
  QA: ['Personalizado', 'Personalizado 2', 'Automação', 'Robô', 'Performance'],
  PO: ['Personalizado', 'Clássica', 'Roqueiro', 'Visionário', 'Estratégica'],
  COM: ['Executivo de contas', 'SDR', 'Cowboy', 'Gerente de vendas', 'Astronauta'],
};

const allLooks: [string, CharacterLook][] = [
  ...ROLES.flatMap((r) => r.variants.map((v) => [`${r.id}/${v.name}`, resolveLook(r, v)] as [string, CharacterLook])),
  ...BOSSES.filter((b) => b.variant).map((b) => [`boss/${b.id}`, b.variant!] as [string, CharacterLook]),
];

describe('variantes de visual (Spec V2)', () => {
  it.each(Object.entries(SPEC_VARIANTS))('%s tem as variantes da spec, na ordem', (id, names) => {
    expect(roleById(id as never).variants.map((v) => v.name)).toEqual(names);
  });

  it.each(allLooks)('%s usa um estilo de cabeça conhecido', (_, look) => {
    expect(HEAD_STYLES).toContain(look.style);
  });

  it.each(ROLES.map((r) => [r.id, r] as const))('%s: cada variante gera um sprite diferente', (_, r) => {
    const sprites = r.variants.map((v) => drawCharacter(resolveLook(r, v)).data.join());
    expect(new Set(sprites).size).toBe(sprites.length);
  });
});

/** Arte de referência (1 - Imagens do jogo/7-todas-as-variantes.png), já convertida em grade de pixels. */
const REFERENCE = reference as unknown as Record<string, { palette: Record<string, string>; rows: string[] }>;

describe('fidelidade à arte de referência', () => {
  // variantes novas, criadas depois da arte, não têm referência e ficam fora da comparação
  const withReference = allLooks.filter(([name]) => REFERENCE[name]);

  it('todos os personagens da arte existem no jogo', () => {
    const names = Object.keys(REFERENCE).filter((k) => k !== '_');
    expect(names).toHaveLength(24);
    expect(withReference.map(([name]) => name).sort()).toEqual(names.sort());
  });

  it.each(withReference)('%s é idêntico à referência, pixel a pixel', (name, look) => {
    const ref = REFERENCE[name];
    const p = drawCharacter(look, 0);
    const diffs: string[] = [];
    // mapa lado a lado para a mensagem de erro: X marca o pixel errado; à direita, a referência
    const map: string[] = [];
    for (let y = 0; y < SPRITE_H; y++) {
      let row = '';
      for (let x = 0; x < SPRITE_W; x++) {
        const ch = ref.rows[y][x];
        const want = ch === '.' ? null : ref.palette[ch];
        const got = p.get(x, y);
        row += got === want ? (got ? '#' : '.') : 'X';
        if (got !== want) diffs.push(`(${x},${y}) esperado ${want} obtido ${got}`);
      }
      map.push(`${row}  ${ref.rows[y]}`);
    }
    expect(diffs, `\n${map.join('\n')}\n`).toEqual([]);
  });
});

describe('drawCharacter', () => {
  it.each(allLooks)('%s cabe no quadro sem ser cortado', (_, look) => {
    const border: [number, number][] = [];
    for (let x = 0; x < SPRITE_W; x++) border.push([x, 0], [x, SPRITE_H - 1]);
    for (let y = 0; y < SPRITE_H; y++) border.push([0, y], [SPRITE_W - 1, y]);
    for (let f = 0; f < 3; f++) {
      const p = drawCharacter(look, f);
      for (const [x, y] of border) {
        const c = p.get(x, y);
        // na borda só pode haver contorno; cor ali significa desenho cortado
        expect(c === null || c === INK, `${look.style} frame ${f} em (${x},${y}) = ${c}`).toBe(true);
      }
    }
  });

  it.each(allLooks)('%s: os quadros de caminhada mexem uma perna de cada vez', (_, look) => {
    const [a, b, c] = [0, 1, 2].map((f) => drawCharacter(look, f).data.join());
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  it('a caminhada não mexe na cabeça nem no tronco', () => {
    for (const [, look] of allLooks) {
      const [a, b, c] = [0, 1, 2].map((f) => drawCharacter(look, f).data.slice(0, 12 * SPRITE_W).join());
      expect(b).toBe(a);
      expect(c).toBe(a);
    }
  });
});

describe('resolveLook', () => {
  const qa = roleById('QA');
  const po = roleById('PO');
  const com = roleById('COM');

  it('aplica o objeto padrão do papel quando a variante não define', () => {
    expect(resolveLook(qa, qa.variants[0]).prop).toEqual(qa.prop);
  });

  it('a variante pode trocar o objeto', () => {
    const roqueiro = po.variants.find((v) => v.name === 'Roqueiro')!;
    expect(resolveLook(po, roqueiro).prop?.kind).toBe('guitar');
  });

  it('prop: null deixa as mãos vazias', () => {
    const astro = com.variants.find((v) => v.name === 'Astronauta')!;
    expect(resolveLook(com, astro).prop).toBeNull();
  });
});
