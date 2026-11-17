import { describe, expect, it } from 'vitest';
import { BOSSES, ROLES, roleById } from '../../src/core/data';
import type { CharacterLook } from '../../src/core/types';
import { HEAD_STYLES, SPRITE_H, SPRITE_W, drawCharacter, resolveLook } from '../../src/gfx/characters';

const INK = '#0b0d14';

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

  it('os quadros de caminhada mexem as pernas', () => {
    const look = resolveLook(ROLES[0], ROLES[0].variants[0]);
    const [a, b, c] = [0, 1, 2].map((f) => drawCharacter(look, f).data.join());
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
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
