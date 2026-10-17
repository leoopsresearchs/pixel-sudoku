// Efeitos sonoros chiptune gerados na hora com WebAudio (nada para baixar).
let ctx = null;
let enabled = true;

export function setSound(on) { enabled = on; }

// iOS só libera áudio depois de um toque do usuário.
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, dur, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const seq = (notes, step, opts) => notes.forEach((f, i) => tone(f, step * 1.4, { ...opts, delay: i * step }));

export const sfx = {
  tap: () => tone(740, 0.03, { vol: 0.025 }),
  arm: () => tone(440, 0.05, { vol: 0.03, slide: 440 }),
  click: () => tone(520, 0.04, { vol: 0.04 }),
  place: () => { tone(587, 0.05, { vol: 0.05 }); tone(880, 0.07, { vol: 0.05, delay: 0.045 }); },
  erase: () => tone(392, 0.08, { vol: 0.04, slide: -160 }),
  error: () => { tone(196, 0.12, { type: 'sawtooth', vol: 0.05 }); tone(147, 0.16, { type: 'sawtooth', vol: 0.05, delay: 0.09 }); },
  unit: () => seq([659, 784, 988, 1319], 0.05, { vol: 0.045 }),
  undo: () => tone(660, 0.06, { vol: 0.04, slide: -220 }),
  win: () => {
    seq([523, 659, 784, 1046, 784, 1046, 1319], 0.09, { vol: 0.05 });
    seq([262, 330, 392, 523], 0.18, { type: 'triangle', vol: 0.07 });
  },
};
