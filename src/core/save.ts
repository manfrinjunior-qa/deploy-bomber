import { DEFAULT_KEYMAPS, cloneKeymaps, type KeyMap } from '../input/keymaps';

/** FR-012 / FR-013: teclas, fases liberadas e recordes no localStorage. */
export interface SaveData {
  version: 1;
  unlocked: number; // maior fase liberada (1..5)
  hiScore: number;
  bestStage: number;
  clientCleared: boolean;
  /** Modo Zumbi: maior noite liberada (1..5) e se as 5 noites foram vencidas */
  zombieUnlocked: number;
  zombieCleared: boolean;
  keymaps: KeyMap[];
  sound: boolean;
}

const KEY = 'deploy-bomber-save-v1';

function defaults(): SaveData {
  return {
    version: 1, unlocked: 1, hiScore: 0, bestStage: 0, clientCleared: false, zombieUnlocked: 1, zombieCleared: false,
    keymaps: cloneKeymaps(DEFAULT_KEYMAPS), sound: true,
  };
}

function load(): SaveData {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return defaults();
    const d = { ...defaults(), ...JSON.parse(raw) } as SaveData;
    if (!Array.isArray(d.keymaps) || d.keymaps.length !== 4) d.keymaps = cloneKeymaps(DEFAULT_KEYMAPS);
    return d;
  } catch {
    return defaults();
  }
}

export const save = {
  data: load(),
  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* modo privado / sem storage: segue sem salvar */
    }
  },
  unlock(stage: number) {
    if (stage > this.data.unlocked) this.data.unlocked = Math.min(5, stage);
    this.write();
  },
  unlockNight(night: number) {
    if (night > this.data.zombieUnlocked) this.data.zombieUnlocked = Math.min(5, night);
    this.write();
  },
  submitScore(score: number) {
    if (score > this.data.hiScore) {
      this.data.hiScore = score;
      this.write();
      return true;
    }
    return false;
  },
};
