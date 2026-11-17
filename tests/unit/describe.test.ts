import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/core/data';
import { describeLook } from '../../src/core/describe';
import { resolveLook } from '../../src/gfx/characters';

const line = (lines: { label: string; value: string }[], label: string) => lines.find((l) => l.label === label)?.value;

describe('describeLook (tela de Personagens)', () => {
  it('descreve todas as variantes sem campos vazios ou "undefined"', () => {
    for (const r of ROLES)
      for (const v of r.variants) {
        const lines = describeLook(resolveLook(r, v));
        expect(lines.map((l) => l.label)).toEqual(['Cabeça', 'Roupa', 'Rosto', 'Acessórios', 'Na mão']);
        for (const l of lines) {
          expect(l.value, `${r.id}/${v.name}/${l.label}`).toBeTruthy();
          expect(l.value).not.toContain('undefined');
        }
      }
  });

  it('mostra o objeto do papel, o da variante ou mãos vazias', () => {
    const role = (id: string) => ROLES.find((r) => r.id === id)!;
    const desc = (id: string, name: string) => {
      const r = role(id);
      return describeLook(resolveLook(r, r.variants.find((v) => v.name === name)!));
    };
    expect(line(desc('QA', 'Personalizado'), 'Na mão')).toBe('Lupa');
    expect(line(desc('PO', 'Roqueiro'), 'Na mão')).toBe('Guitarra');
    expect(line(desc('COM', 'Astronauta'), 'Na mão')).toBe('Mãos vazias');
    expect(line(desc('DEV', 'Ninja'), 'Cabeça')).toBe('Máscara ninja');
    expect(line(desc('COM', 'SDR'), 'Acessórios')).toBe('Headset, gravata');
  });
});
