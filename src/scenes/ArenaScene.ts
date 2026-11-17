import Phaser from 'phaser';
import { NIGHTS, STAGES, enemyById, roleById } from '../core/data';
import { advance, worldConfig, type Session } from '../core/session';
import { sfx } from '../core/sfx';
import { themeKey } from '../gfx/textures';
import { BOX_LABELS, TILE } from '../systems/grid';
import { World } from '../systems/world';
import { input } from '../input/input';
import { BOARD_X, BOARD_Y, Hud } from '../ui/hud';
import { COLORS, hex, text } from '../ui/common';

const T = 56;
const cx = (x: number) => BOARD_X + x * T + T / 2;
const cy = (y: number) => BOARD_Y + y * T + T / 2;

class Pool {
  private items: Phaser.GameObjects.Image[] = [];
  private n = 0;
  constructor(private scene: Phaser.Scene, private depth: number) {}
  begin() {
    this.n = 0;
  }
  get(key: string, x: number, y: number) {
    let im = this.items[this.n];
    if (!im) {
      im = this.scene.add.image(0, 0, key);
      this.items.push(im);
    }
    this.n++;
    return im.setTexture(key).setPosition(Math.round(x), Math.round(y)).setVisible(true).setAlpha(1).setScale(1).setFlipX(false).clearTint().setDepth(this.depth).setOrigin(0.5);
  }
  end() {
    for (let i = this.n; i < this.items.length; i++) this.items[i].setVisible(false);
  }
}

export class ArenaScene extends Phaser.Scene {
  private session!: Session;
  private world!: World;
  private hud!: Hud;
  private blocks: Phaser.GameObjects.Image[] = [];
  private tk = '';
  private gOver!: Phaser.GameObjects.Graphics;
  private gFlames!: Phaser.GameObjects.Graphics;
  private gFx!: Phaser.GameObjects.Graphics;
  private gFog!: Phaser.GameObjects.Graphics;
  private flashT = 0; // banner rápido no meio da arena (ex.: chefão do Modo Zumbi apareceu)
  private zombie = false;
  private pItems!: Pool;
  private pBombs!: Pool;
  private pEnts!: Pool;
  private pReveal!: Pool;
  private tags: Phaser.GameObjects.Text[] = [];
  private floats: Phaser.GameObjects.Text[] = [];
  private banner!: Phaser.GameObjects.Container;
  private bannerMain!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private bannerSmall!: Phaser.GameObjects.Text;
  private startDelay = 0;
  private paused = false;
  private pauseUI!: Phaser.GameObjects.Container;
  private leaving = false;
  private shake = 0;

  constructor() {
    super('Arena');
  }

  init(data: { session: Session }) {
    this.session = data.session;
    this.blocks = [];
    this.tags = [];
    this.floats = [];
    this.startDelay = 2.4;
    this.paused = false;
    this.leaving = false;
    this.flashT = 0;
    this.zombie = data.session.mode === 'zombie';
  }

  create() {
    this.world = new World(worldConfig(this.session));
    const w = this.world;
    this.tk = themeKey(w.cfg.theme);
    this.cameras.main.setBackgroundColor('#11131c');

    // moldura do tabuleiro
    const frame = this.add.graphics().setDepth(-1);
    frame.fillStyle(0x0b0d14, 1);
    frame.fillRect(BOARD_X - 6, BOARD_Y - 6, w.grid.w * T + 12, w.grid.h * T + 12);

    for (let y = 0; y < w.grid.h; y++)
      for (let x = 0; x < w.grid.w; x++) {
        this.add.image(BOARD_X + x * T, BOARD_Y + y * T, `floor_${this.tk}_${(x + y) % 2}`).setOrigin(0).setDepth(0);
        if (w.grid.isSand(x, y)) this.add.image(BOARD_X + x * T, BOARD_Y + y * T, 'sand').setOrigin(0).setDepth(0.5);
        this.blocks.push(this.add.image(BOARD_X + x * T, BOARD_Y + y * T, `rack_${this.tk}`).setOrigin(0).setDepth(1));
      }
    this.gOver = this.add.graphics().setDepth(2);
    this.pReveal = new Pool(this, 2.5);
    this.pItems = new Pool(this, 3);
    this.pBombs = new Pool(this, 4);
    this.gFlames = this.add.graphics().setDepth(5);
    this.pEnts = new Pool(this, 6);
    this.gFog = this.add.graphics().setDepth(7.5);
    this.gFx = this.add.graphics().setDepth(9);

    for (const p of w.players) {
      const r = roleById(p.role);
      const t = text(this, 0, 0, `P${p.slot + 1}`, { size: 8, color: '#0b0d14' }).setDepth(10).setOrigin(0.5, 1);
      t.setBackgroundColor(r.color).setPadding(4, 3, 4, 2);
      this.tags.push(t);
    }

    this.hud = new Hud(this, w);
    this.buildBanner();
    this.buildPause();
    this.showIntro();
    this.render(0);
  }

  // ───────────────────────────── banners e pausa
  private buildBanner() {
    const c = this.add.container(BOARD_X + (15 * T) / 2, BOARD_Y + (11 * T) / 2).setDepth(30);
    const g = this.add.graphics();
    g.fillStyle(0x0b0d14, 0.88);
    g.fillRect(-15 * T * 0.5, -78, 15 * T, 156);
    g.fillStyle(hex(COLORS.yellow), 1);
    g.fillRect(-15 * T * 0.5, -78, 15 * T, 4);
    g.fillRect(-15 * T * 0.5, 74, 15 * T, 4);
    this.bannerMain = text(this, 0, -52, '', { size: 26, color: COLORS.yellow, align: 'center' });
    this.bannerSub = text(this, 0, -2, '', { font: 'body', size: 20, align: 'center' });
    this.bannerSmall = text(this, 0, 34, '', { size: 12, color: COLORS.dim, align: 'center' });
    c.add([g, this.bannerMain, this.bannerSub, this.bannerSmall]);
    this.banner = c;
  }

  private setBanner(main: string, sub: string, small: string, color: string = COLORS.yellow) {
    this.banner.setVisible(true);
    this.bannerMain.setText(main).setColor(color);
    this.bannerSub.setText(sub);
    this.bannerSmall.setText(small);
  }

  private showIntro() {
    const s = this.session;
    const w = this.world;
    if (s.mode === 'battle') this.setBanner('BATALHA LOCAL', `${STAGES[s.stage].name} · todos contra todos`, 'PRONTO?');
    else if (s.mode === 'zombie') {
      const n = NIGHTS[s.stage];
      this.setBanner(`NOITE ${n.id} · ${n.name.toUpperCase()}`, n.mecanica, 'PRONTO?', '#f97316');
    } else if (s.mode === 'client') this.setBanner(`CHEFÃO ${s.client + 1}/4`, `${w.boss?.def.name} · ${w.boss?.def.arena}`, 'PRONTO?', '#f43f5e');
    else {
      const st = STAGES[s.stage];
      if (s.arena === 3) this.setBanner(`CHEFÃO DA FASE ${st.id}`, w.boss?.def.name ?? '', 'PRONTO?', '#f43f5e');
      else this.setBanner(`FASE ${st.id} · ${st.name.toUpperCase()}`, s.arena === 0 ? st.mecanica : `Arena ${s.arena + 1}/3`, 'PRONTO?');
    }
  }

  private buildPause() {
    const c = this.add.container(640, 400).setDepth(40).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x0b0d14, 0.82);
    g.fillRect(-640, -400, 1280, 800);
    c.add([
      g,
      text(this, 0, -60, 'PAUSADO', { size: 40, color: COLORS.yellow, align: 'center' }),
      text(this, 0, 20, 'ENTER continuar   ·   ESC sair para o menu', { size: 12, align: 'center' }),
    ]);
    this.pauseUI = c;
  }

  // ───────────────────────────── loop
  update(time: number, delta: number) {
    input.beginFrame();
    const dt = delta / 1000;
    if (this.paused) {
      if (input.confirm()) {
        this.paused = false;
        this.pauseUI.setVisible(false);
      } else if (input.pressed('Escape')) this.scene.start('Title');
      return;
    }
    if (input.pause() && !this.world.outcome) {
      this.paused = true;
      this.pauseUI.setVisible(true);
      return;
    }

    if (this.startDelay > 0) {
      this.startDelay -= dt;
      this.bannerSmall.setText(this.startDelay > 0.7 ? 'PRONTO?' : 'VAI!');
      if (this.startDelay <= 0) this.banner.setVisible(false);
    } else {
      const inputs = [0, 1, 2, 3].map((i) => input.player(i));
      this.world.update(dt, inputs);
    }

    for (const e of this.world.events) {
      sfx(e);
      if (e === 'boom') this.shake = Math.max(this.shake, 0.12);
      if (e === 'bossHit') this.shake = 0.25;
      if (e === 'stomp') this.shake = 0.45;
      if (e === 'bossAppear' && this.world.boss) {
        const b = this.world.boss.def;
        this.setBanner(`${b.name.toUpperCase()} APARECEU`, 'todos os ajudantes caíram', 'o chefão da noite chegou', '#f43f5e');
        this.flashT = 1.8;
      }
    }
    this.world.events.length = 0;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0 && !this.world.outcome) this.banner.setVisible(false);
    }

    if (this.shake > 0) {
      this.shake -= dt;
      this.cameras.main.setScroll(Math.round((Math.random() - 0.5) * 6 * (this.shake > 0 ? 1 : 0)), Math.round((Math.random() - 0.5) * 6 * (this.shake > 0 ? 1 : 0)));
    } else this.cameras.main.setScroll(0, 0);

    this.render(time);
    this.hud.update();
    this.handleOutcome();
  }

  private handleOutcome() {
    const w = this.world;
    if (!w.outcome) return;
    if (!this.banner.visible || this.flashT > 0) {
      this.flashT = 0;
      const s = this.session;
      if (w.outcome === 'cleared' && s.mode === 'zombie') {
        const last = s.stage >= NIGHTS.length - 1;
        this.setBanner('NOITE SOBREVIVIDA!', `${w.boss?.def.name ?? ''} derrotado`, last ? 'o sol está nascendo…' : 'próxima noite…', COLORS.green);
      } else if (w.outcome === 'cleared') {
        const boss = w.boss;
        const last = (s.mode === 'story' && s.arena === 3) || s.mode === 'client';
        this.setBanner(boss ? 'CHEFÃO DERROTADO!' : 'ARENA LIMPA!', boss ? boss.def.name : 'todos os inimigos caíram', last ? '' : 'próxima arena…', COLORS.green);
      } else if (w.outcome === 'gameover') this.setBanner(s.mode === 'zombie' ? 'NOITE PERDIDA' : 'SPRINT FALHOU', 'o time inteiro caiu', '', COLORS.red);
      else if (w.outcome === 'win') {
        const p = w.playerBySlot(w.winner)!;
        this.setBanner(`P${p.slot + 1} VENCEU!`, `${roleById(p.role).name} é o último de pé`, '', roleById(p.role).color);
      } else this.setBanner('EMPATE', 'todos caíram no mesmo frame', '', COLORS.text);
    }
    if (w.outcomeT > 2.6 && !this.leaving) {
      this.leaving = true;
      const r = advance(this.session, w);
      if ('next' in r) this.scene.restart({ session: r.next });
      else this.scene.start('Results', r.results);
    }
  }

  // ───────────────────────────── render
  private render(time: number) {
    const w = this.world;
    const g = w.grid;
    const blink = Math.floor(time / 120) % 2 === 0;

    // blocos
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const i = g.idx(x, y);
        const im = this.blocks[i];
        const t = g.tiles[i];
        if (t === TILE.Floor) {
          im.setVisible(false);
          continue;
        }
        im.setVisible(true).setAlpha(1);
        if (t === TILE.Wall) im.setTexture(x === 0 || y === 0 || x === g.w - 1 || y === g.h - 1 ? `border_${this.tk}` : `rack_${this.tk}`);
        else if (t === TILE.Box && this.zombie) im.setTexture(g.timer[i] > 0 && blink ? (w.cfg.night === 2 ? 'pumpkin_zap' : 'pumpkin_burn') : 'pumpkin');
        else if (t === TILE.Box) im.setTexture(`box_${BOX_LABELS[g.label[i]]}${g.timer[i] > 0 && blink ? '_burn' : ''}`);
        else if (t === TILE.Postit) im.setTexture('postit').setAlpha(g.timer[i] < 1.5 && blink ? 0.5 : 1);
        else im.setTexture('deadline');
      }

    // overlays: revelação, copiloto, avisos
    const go = this.gOver;
    go.clear();
    this.pReveal.begin();
    const revealAll = w.revealT > 0;
    const reviewers = w.players.filter((p) => p.alive && p.codeReview > 0);
    if (revealAll || reviewers.length) {
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++) {
          const i = g.idx(x, y);
          if (g.tiles[i] !== TILE.Box || !g.hasDrop[i]) continue;
          if (!revealAll && !reviewers.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= 4)) continue;
          this.pReveal.get('reveal', cx(x), cy(y) - 2).setDepth(2.5).setAlpha(0.75 + 0.25 * Math.sin(time / 150));
        }
    }
    this.pReveal.end();

    const copilots = w.players.filter((p) => p.alive && p.copilot > 0);
    if (copilots.length) {
      const danger = w.dangerTiles();
      go.fillStyle(0xef4444, 0.22);
      for (const k of danger) go.fillRect(BOARD_X + (k % g.w) * T + 2, BOARD_Y + Math.floor(k / g.w) * T + 2, T - 4, T - 4);
      for (const p of copilots) {
        const route = w.copilotRoute(p, danger);
        go.fillStyle(0x22c55e, 0.5);
        route.forEach((s, i) => {
          const sz = i === route.length - 1 ? 22 : 12;
          go.fillRect(cx(s.x) - sz / 2, cy(s.y) - sz / 2, sz, sz);
        });
      }
    }

    for (const m of w.markers) {
      const k = 1 - m.t / m.total;
      if (m.kind === 'coin') {
        go.fillStyle(0x0b0d14, 0.5);
        go.fillEllipse(cx(m.x), cy(m.y) + 14, 20 + 24 * k, 8 + 8 * k);
        go.lineStyle(3, 0xfacc15, blink ? 1 : 0.5);
        go.strokeRect(BOARD_X + m.x * T + 4, BOARD_Y + m.y * T + 4, T - 8, T - 8);
      } else if (m.kind === 'blast') {
        go.fillStyle(0xef4444, (blink ? 0.45 : 0.2) + 0.3 * k);
        go.fillRect(BOARD_X + m.x * T + 6, BOARD_Y + m.y * T + 6, T - 12, T - 12);
        go.lineStyle(3, 0xfca5a5, 1);
        go.lineBetween(cx(m.x) - 10, cy(m.y) - 10, cx(m.x) + 10, cy(m.y) + 10);
        go.lineBetween(cx(m.x) + 10, cy(m.y) - 10, cx(m.x) - 10, cy(m.y) + 10);
      } else {
        go.lineStyle(3, 0xa3e635, blink ? 1 : 0.4);
        go.strokeCircle(cx(m.x), cy(m.y), 22);
      }
    }

    // itens
    this.pItems.begin();
    for (const it of w.items) {
      const bob = Math.round(Math.sin(time / 220 + it.id) * 2);
      const im = this.pItems.get(`item_${it.itemId}`, cx(it.x), cy(it.y) + bob - 2);
      if (it.age < 0.25) im.setScale(0.4 + it.age * 2.4);
    }
    this.pItems.end();

    // bombas
    this.pBombs.begin();
    for (const b of w.bombs) {
      const owner = b.owner >= 0 ? w.playerBySlot(b.owner) : undefined;
      const key = b.coin ? 'bomb_coin' : owner ? `bomb_${owner.role}` : 'bomb_none';
      const ox = b.slide ? b.slide.x * b.slideProg : 0;
      const oy = b.slide ? b.slide.y * b.slideProg : 0;
      const pulse = b.remote ? 3 : 3 + 0.25 * Math.sin((3 - b.timer) * (6 + (3 - b.timer) * 4));
      this.pBombs.get(`${key}_${blink ? 1 : 0}`, cx(b.x + ox), cy(b.y + oy)).setScale(pulse);
      if (b.remote) {
        go.lineStyle(2, 0x7dd3fc, blink ? 1 : 0.4);
        go.strokeCircle(cx(b.x + ox), cy(b.y + oy), 26);
      }
    }
    this.pBombs.end();

    // chamas
    const gf = this.gFlames;
    gf.clear();
    for (const f of w.flames) {
      const a = Math.min(1, f.t / 0.15);
      const x = BOARD_X + f.x * T;
      const y = BOARD_Y + f.y * T;
      const draw = (dir: 'h' | 'v') => {
        if (dir === 'h') {
          gf.fillStyle(0xf97316, a);
          gf.fillRect(x, y + 12, T, T - 24);
          gf.fillStyle(0xfde047, a);
          gf.fillRect(x, y + 21, T, T - 42);
        } else {
          gf.fillStyle(0xf97316, a);
          gf.fillRect(x + 12, y, T - 24, T);
          gf.fillStyle(0xfde047, a);
          gf.fillRect(x + 21, y, T - 42, T);
        }
      };
      if (f.dir === 'c') {
        draw('h');
        draw('v');
        gf.fillStyle(0xfffbeb, a);
        gf.fillRect(x + 20, y + 20, T - 40, T - 40);
      } else draw(f.dir);
    }

    // entidades (ordenadas por y)
    this.pEnts.begin();
    const fx = this.gFx;
    fx.clear();
    const dark = w.darkness();
    for (const e of w.enemies) {
      const def = enemyById(e.type);
      const frame = Math.floor(e.anim * (def.fly ? 6 : 4)) % 2;
      const im = this.pEnts.get(`enemy_${e.type}_${frame}`, cx(e.x), cy(e.y) - 4).setScale(3).setDepth((def.fly ? 7 : 6) + e.y / 100);
      if (e.frozen > 0 || w.enemyFreeze > 0) im.setTint(0x93c5fd);
      else if (e.hitCd > 0 && blink) im.setTint(0xff6b6b);
      if (e.stunned > 0) this.stars(fx, cx(e.x), cy(e.y) - 30, time);
      if (e.type === 'leak' && e.age > 7) im.setAlpha(blink ? 1 : 0.6);
      // fantasmas só aparecem perto de luz
      if (def.hidden) im.setAlpha(0.85 * (dark > 0 ? w.visibility(e.x, e.y) : 1));
    }
    const b = w.boss;
    if (b && !b.dead) {
      const big = b.def.sprite === 'client' || b.def.sprite === 'pixel';
      const im = this.pEnts.get(`boss_${b.def.id}_${Math.floor(b.anim * 3) % 2}`, cx(b.x), cy(b.y) - (big ? 18 : 12))
        .setScale(b.def.sprite === 'client' ? 4.5 : big ? 4 : 3)
        .setDepth(6 + b.y / 100);
      if (b.hitCd > 0 && blink) im.setTint(0xff6b6b);
      if (b.frozen > 0 || w.enemyFreeze > 0) im.setTint(0x93c5fd);
      if (b.dash > 0) im.setTint(blink ? 0xfda4af : 0xffffff);
      if (b.pending) im.setAlpha(blink ? 1 : 0.5);
    }
    w.players.forEach((p, i) => {
      const tag = this.tags[i];
      if (!p.alive) {
        tag.setVisible(false);
        return;
      }
      const seq = [0, 1, 0, 2];
      const frame = p.moving ? seq[Math.floor(p.anim * 8) % 4] : 0;
      const px = cx(p.x);
      const py = cy(p.y) - 6;
      const im = this.pEnts.get(`char_${p.role}_${p.variant}_${frame}`, px, py).setScale(3).setDepth(6 + p.y / 100 + 0.001);
      im.setFlipX(p.facing.x < 0);
      if (p.invuln > 0 && p.coffee <= 0) im.setAlpha(blink ? 1 : 0.35);
      if (p.frozen > 0) im.setTint(0x93c5fd);
      else if (p.zombie > 0) im.setTint(0x86efac);
      if (p.coffee > 0) {
        fx.lineStyle(3, 0xfbbf24, blink ? 1 : 0.5);
        fx.strokeCircle(px, py + 4, 30);
      }
      if (p.shield > 0) {
        fx.lineStyle(2, 0xe2e8f0, 0.7);
        fx.strokeCircle(px, py + 4, 27);
      }
      if (p.stunned > 0) this.stars(fx, px, py - 34, time);
      const flags = p.zombie > 0 ? ' ZUMBI' : p.invert > 0 ? ' ?!' : p.frozen > 0 ? ' ...' : '';
      tag.setVisible(true).setText(`P${p.slot + 1}${flags}`).setPosition(Math.round(px), Math.round(py - 30));
    });
    this.pEnts.end();

    // escuridão (Castelo, noite 5) e tempestade de areia: névoa por tile, aberta em volta da luz
    const fog = this.gFog;
    fog.clear();
    if (dark > 0) {
      const color = w.sandT > 0 ? 0x8a6d3b : 0x04050a;
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++) {
          const a = dark * (1 - w.visibility(x, y));
          if (a <= 0.01) continue;
          fog.fillStyle(color, a);
          fog.fillRect(BOARD_X + x * T, BOARD_Y + y * T, T, T);
        }
    }

    // efeitos
    let fi = 0;
    for (const e of w.effects) {
      const k = 1 - e.t / e.total;
      const col = hex(e.color);
      if (e.kind === 'puff') {
        fx.fillStyle(col, 0.6 * (1 - k));
        fx.fillCircle(cx(e.x), cy(e.y), 10 + 26 * k);
      } else if (e.kind === 'ring') {
        fx.lineStyle(4, col, 1 - k);
        fx.strokeCircle(cx(e.x), cy(e.y), 12 + 40 * k);
      } else if (e.kind === 'beam' && e.tiles) {
        fx.fillStyle(col, 0.7 * (1 - k));
        for (const t of e.tiles) fx.fillRect(BOARD_X + t.x * T + 18, BOARD_Y + t.y * T + 18, T - 36, T - 36);
      } else if (e.kind === 'text') {
        let ft = this.floats[fi];
        if (!ft) {
          ft = text(this, 0, 0, '', { size: 10, stroke: '#0b0d14' }).setDepth(11).setOrigin(0.5);
          this.floats.push(ft);
        }
        ft.setVisible(true).setText(e.text ?? '').setColor(e.color).setPosition(cx(e.x), cy(e.y) - 20 - 26 * k).setAlpha(1 - k * 0.7);
        fi++;
      }
    }
    for (let i = fi; i < this.floats.length; i++) this.floats[i].setVisible(false);
  }

  private stars(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number) {
    g.fillStyle(0xfde047, 1);
    for (let k = 0; k < 3; k++) {
      const a = time / 200 + (k * Math.PI * 2) / 3;
      g.fillRect(Math.round(x + Math.cos(a) * 14) - 3, Math.round(y + Math.sin(a) * 5) - 3, 6, 6);
    }
  }
}
