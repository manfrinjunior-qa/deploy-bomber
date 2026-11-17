import { save } from './save';

/** Efeitos sonoros sintetizados (WebAudio) — sem arquivos de áudio no MVP. */
let ctx: AudioContext | null = null;
let lastPlay: Record<string, number> = {};

function ac(): AudioContext | null {
  if (!save.data.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slide = 0, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.12) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

const SOUNDS: Record<string, () => void> = {
  bomb: () => tone(220, 0.08, 'square', 0.05, -60),
  boom: () => { noise(0.35, 0.16); tone(90, 0.3, 'triangle', 0.08, -50); },
  pickup: () => { tone(660, 0.07, 'square', 0.05); tone(990, 0.09, 'square', 0.05, 0, 0.06); },
  hurt: () => tone(300, 0.3, 'sawtooth', 0.06, -220),
  kill: () => tone(520, 0.12, 'square', 0.04, -300),
  special: () => { tone(440, 0.06, 'triangle', 0.06); tone(880, 0.1, 'triangle', 0.06, 0, 0.05); },
  deny: () => tone(120, 0.08, 'square', 0.03),
  freeze: () => tone(1200, 0.25, 'sine', 0.05, -700),
  swap: () => tone(300, 0.2, 'sine', 0.05, 500),
  kick: () => tone(160, 0.06, 'square', 0.05, 80),
  bossHit: () => { noise(0.15, 0.1); tone(180, 0.2, 'sawtooth', 0.07, -100); },
  bossAttack: () => tone(110, 0.25, 'sawtooth', 0.05, 60),
  deadline: () => { tone(880, 0.15, 'square', 0.05); tone(660, 0.15, 'square', 0.05, 0, 0.18); tone(880, 0.15, 'square', 0.05, 0, 0.36); },
  end: () => { tone(523, 0.12, 'square', 0.05); tone(659, 0.12, 'square', 0.05, 0, 0.12); tone(784, 0.25, 'square', 0.05, 0, 0.24); },
  // Modo Zumbi
  bite: () => { tone(200, 0.12, 'sawtooth', 0.06, -80); tone(140, 0.2, 'sawtooth', 0.05, -60, 0.1); },
  cure: () => { tone(660, 0.08, 'triangle', 0.05); tone(990, 0.12, 'triangle', 0.05, 0, 0.08); },
  howl: () => tone(330, 0.6, 'sine', 0.06, 420),
  zap: () => { noise(0.12, 0.08); tone(1600, 0.1, 'square', 0.03, -1200); },
  stomp: () => { noise(0.4, 0.2); tone(60, 0.35, 'triangle', 0.1, -20); },
  bossAppear: () => { tone(110, 0.3, 'sawtooth', 0.06); tone(98, 0.3, 'sawtooth', 0.06, 0, 0.3); tone(82, 0.5, 'sawtooth', 0.06, 0, 0.6); },
  move: () => tone(440, 0.04, 'square', 0.03),
  confirm: () => { tone(587, 0.06, 'square', 0.04); tone(880, 0.08, 'square', 0.04, 0, 0.06); },
};

export function sfx(name: string) {
  const now = performance.now();
  if (now - (lastPlay[name] ?? 0) < 45) return; // evita empilhar o mesmo som no mesmo frame
  lastPlay[name] = now;
  SOUNDS[name]?.();
}
