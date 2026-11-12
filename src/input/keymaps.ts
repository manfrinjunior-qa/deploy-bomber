/** Mapeamento por jogador usando `KeyboardEvent.code` (independe do layout do teclado). */
export interface KeyMap {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  bomb: string[];
  special: string[];
}
export type Action = keyof KeyMap;
export const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'bomb', 'special'];
export const ACTION_LABEL: Record<Action, string> = {
  up: 'CIMA',
  down: 'BAIXO',
  left: 'ESQ.',
  right: 'DIR.',
  bomb: 'BOMBA',
  special: 'ESPECIAL',
};

export const DEFAULT_KEYMAPS: KeyMap[] = [
  { up: ['KeyW'], left: ['KeyA'], down: ['KeyS'], right: ['KeyD'], bomb: ['KeyQ'], special: ['KeyE'] },
  { up: ['KeyT'], left: ['KeyF'], down: ['KeyG'], right: ['KeyH'], bomb: ['KeyR'], special: ['KeyY'] },
  { up: ['KeyI'], left: ['KeyJ'], down: ['KeyK'], right: ['KeyL'], bomb: ['KeyU'], special: ['KeyO'] },
  // teclados ABNT2 enviam NumpadComma no "." do teclado numérico
  { up: ['ArrowUp'], left: ['ArrowLeft'], down: ['ArrowDown'], right: ['ArrowRight'], bomb: ['Numpad0'], special: ['NumpadDecimal', 'NumpadComma'] },
];

export const cloneKeymaps = (k: KeyMap[]): KeyMap[] => JSON.parse(JSON.stringify(k));

export function keyName(code: string | undefined): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowUp: 'CIMA',
    ArrowDown: 'BAIXO',
    ArrowLeft: 'ESQ',
    ArrowRight: 'DIR',
    Numpad0: 'NUM0',
    NumpadDecimal: 'NUM.',
    NumpadComma: 'NUM,',
    Space: 'ESPAÇO',
    ShiftLeft: 'SHIFT',
    ShiftRight: 'SHIFT D',
    ControlLeft: 'CTRL',
    ControlRight: 'CTRL D',
    AltLeft: 'ALT',
    Enter: 'ENTER',
    NumpadEnter: 'NUM ENT',
    Semicolon: 'Ç',
    Comma: ',',
    Period: '.',
    Slash: ';',
    Minus: '-',
    Equal: '=',
    BracketLeft: '´',
    BracketRight: '[',
    Backslash: ']',
    Quote: '~',
    Backquote: "'",
    IntlBackslash: '\\',
    IntlRo: '/',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Numpad')) return 'NUM' + code.slice(6).replace('Add', '+').replace('Subtract', '-').replace('Multiply', '*').replace('Divide', '/');
  return code.toUpperCase().slice(0, 7);
}

/** Rótulos compactos para o HUD/seleção: "W A S D" ou "SETAS". */
export function moveLabel(k: KeyMap): string[] {
  if (k.up[0] === 'ArrowUp' && k.down[0] === 'ArrowDown' && k.left[0] === 'ArrowLeft' && k.right[0] === 'ArrowRight') return ['SETAS'];
  return [k.up[0], k.left[0], k.down[0], k.right[0]].map(keyName);
}
