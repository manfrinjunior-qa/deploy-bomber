import type { PlayerInput } from '../core/types';
import { save } from '../core/save';
import { readPads, type PadState } from './gamepad';
import type { Action, KeyMap } from './keymaps';

const BLOCK_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab',
  'Numpad0', 'NumpadDecimal', 'NumpadComma', 'Slash', 'Quote', 'Backquote',
]);

/**
 * Estado do teclado lido uma vez por frame (latência máxima de 1 frame).
 * `pressed` = teclas que desceram desde o último frame.
 */
class InputManager {
  private down = new Set<string>();
  private downAt = new Map<string, number>(); // ordem em que as teclas foram apertadas
  private seq = 0;
  private pressedNow = new Set<string>();
  private pressedFrame = new Set<string>();
  pads: (PadState | null)[] = [null, null, null, null];
  capture: ((code: string) => void) | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (this.capture) {
        e.preventDefault();
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
        return;
      }
      if (e.repeat && this.down.has(e.code)) return;
      if (!this.down.has(e.code)) this.downAt.set(e.code, ++this.seq);
      this.down.add(e.code);
      this.pressedNow.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  /** Chamar no começo do update de cada cena. */
  beginFrame() {
    this.pressedFrame = this.pressedNow;
    this.pressedNow = new Set();
    this.pads = readPads();
  }

  isDown(code: string) {
    return this.down.has(code);
  }
  pressed(...codes: string[]) {
    return codes.some((c) => this.pressedFrame.has(c));
  }
  anyDown(codes: string[]) {
    return codes.some((c) => this.down.has(c));
  }

  keymap(slot: number): KeyMap {
    return save.data.keymaps[slot];
  }

  /** Ação pressionada neste frame por um jogador (teclado ou gamepad). */
  actionPressed(slot: number, a: Action): boolean {
    if (this.pressed(...this.keymap(slot)[a])) return true;
    const p = this.pads[slot];
    if (!p) return false;
    switch (a) {
      case 'bomb': return p.bombPressed;
      case 'special': return p.specialPressed;
      case 'up': return p.upPressed;
      case 'down': return p.downPressed;
      case 'left': return p.leftPressed;
      case 'right': return p.rightPressed;
    }
  }

  player(slot: number): PlayerInput {
    const k = this.keymap(slot);
    let dx = (this.anyDown(k.right) ? 1 : 0) - (this.anyDown(k.left) ? 1 : 0);
    let dy = (this.anyDown(k.down) ? 1 : 0) - (this.anyDown(k.up) ? 1 : 0);
    const p = this.pads[slot];
    if (p) {
      if (!dx) dx = p.dx;
      if (!dy) dy = p.dy;
    }
    let prefer: 'h' | 'v' | undefined;
    if (dx && dy) {
      const last = (codes: string[]) => Math.max(0, ...codes.filter((c) => this.down.has(c)).map((c) => this.downAt.get(c) ?? 0));
      prefer = last([...k.up, ...k.down]) > last([...k.left, ...k.right]) ? 'v' : 'h';
    }
    return { dx, dy, prefer, bomb: this.actionPressed(slot, 'bomb'), special: this.actionPressed(slot, 'special') };
  }

  // navegação de menus: setas, WASD, Enter/Espaço, Esc, ou qualquer gamepad
  private anyPad(f: (p: PadState) => boolean) {
    return this.pads.some((p) => p && f(p));
  }
  menuUp() { return this.pressed('ArrowUp', 'KeyW') || this.anyPad((p) => p.upPressed); }
  menuDown() { return this.pressed('ArrowDown', 'KeyS') || this.anyPad((p) => p.downPressed); }
  menuLeft() { return this.pressed('ArrowLeft', 'KeyA') || this.anyPad((p) => p.leftPressed); }
  menuRight() { return this.pressed('ArrowRight', 'KeyD') || this.anyPad((p) => p.rightPressed); }
  confirm() { return this.pressed('Enter', 'NumpadEnter', 'Space') || this.anyPad((p) => p.bombPressed || p.startPressed); }
  back() { return this.pressed('Escape', 'Backspace') || this.anyPad((p) => p.specialPressed); }
  pause() { return this.pressed('Escape', 'KeyP') || this.anyPad((p) => p.startPressed); }
}

export const input = new InputManager();
