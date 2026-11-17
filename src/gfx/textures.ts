import Phaser from 'phaser';
import { BOSSES, CLIENT_THEMES, ENEMIES, ITEMS, ROLES, STAGES } from '../core/data';
import type { Theme } from '../core/types';
import { BOX_LABELS, BOX_TEXT_COLOR } from '../systems/grid';
import { drawBomb, drawBoss, drawEnemy, itemIcon, tileBox, tileDeadline, tileFloor, tilePostit, tileRack } from './art';
import { FACE_ROWS, drawCharacter, resolveLook } from './characters';
import { Pix } from './pixel';

export function themeKey(t: Theme) {
  return `${t.floorA}${t.rack}`.replace(/#/g, '');
}

/** Gera todas as texturas do jogo em memória (sem arquivos de imagem). */
export function registerTextures(scene: Phaser.Scene) {
  const tx = scene.textures;
  const add = (key: string, cv: HTMLCanvasElement) => {
    if (!tx.exists(key)) tx.addCanvas(key, cv);
  };

  for (const r of ROLES) {
    r.variants.forEach((v, i) => {
      const look = resolveLook(r, v);
      for (let f = 0; f < 3; f++) add(`char_${r.id}_${i}_${f}`, drawCharacter(look, f).toCanvas());
      add(`face_${r.id}_${i}`, drawCharacter(look, 0).toCanvas(1, FACE_ROWS));
    });
    add(`bomb_${r.id}_0`, drawBomb(r.color, 0).toCanvas());
    add(`bomb_${r.id}_1`, drawBomb(r.color, 1).toCanvas());
  }
  add('bomb_none_0', drawBomb('#94a3b8', 0).toCanvas());
  add('bomb_none_1', drawBomb('#94a3b8', 1).toCanvas());
  add('bomb_coin_0', drawBomb('#fde047', 0, true).toCanvas());
  add('bomb_coin_1', drawBomb('#fde047', 1, true).toCanvas());

  for (const e of ENEMIES) for (let f = 0; f < 2; f++) add(`enemy_${e.id}_${f}`, drawEnemy(e.id, f).toCanvas());

  for (const b of BOSSES)
    for (let f = 0; f < 2; f++) {
      const pix = b.sprite === 'client' && b.variant ? drawCharacter(b.variant, f ? 1 : 2) : drawBoss(b.sprite, f);
      add(`boss_${b.id}_${f}`, pix.toCanvas());
      if (b.sprite === 'client' && b.variant) add(`bossface_${b.id}`, drawCharacter(b.variant, 0).toCanvas(1, FACE_ROWS));
    }

  const themes: Theme[] = [...STAGES.map((s) => s.theme), ...Object.values(CLIENT_THEMES)];
  for (const t of themes) {
    const k = themeKey(t);
    add(`floor_${k}_0`, tileFloor(t.floorA, t.floorB, false));
    add(`floor_${k}_1`, tileFloor(t.floorA, t.floorB, true));
    add(`rack_${k}`, tileRack(t.rack, t.rackLight));
    add(`border_${k}`, tileRack(t.border, t.rackLight));
  }
  add('rack_title', tileRack('#4a5375', '#6c789e'));
  for (const l of BOX_LABELS) {
    add(`box_${l}`, tileBox(l, false, BOX_TEXT_COLOR[l]));
    add(`box_${l}_burn`, tileBox(l, true, BOX_TEXT_COLOR[l]));
  }
  add('postit', tilePostit());
  add('deadline', tileDeadline());

  for (const it of ITEMS) {
    add(`item_${it.id}`, itemIcon(it.icon, it.color, it.text, it.border, 44));
    add(`itemS_${it.id}`, itemIcon(it.icon, it.color, it.text, it.border, 24));
  }
  add('reveal', itemIcon('?', '#fde047', '#3f2d00', undefined, 24));

  // corações do HUD
  const heart = (c: string) => {
    const p = new Pix(9, 8);
    const rows = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && p.px(x, y, c)));
    p.px(1, 1, c === '#ef4444' ? '#fca5a5' : c);
    return p.toCanvas(2);
  };
  add('heart', heart('#ef4444'));
  add('heart_empty', heart('#3a3f55'));
}
