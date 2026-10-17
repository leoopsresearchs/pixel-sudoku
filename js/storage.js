// Progresso, ajustes e partida em andamento ficam no próprio aparelho.
const KEY = 'pxsudoku.v1';

const DEFAULTS = {
  progress: { unlocked: 1, stars: {}, best: {} },
  settings: { sound: true, showErrors: true, highlightSame: true, vibrate: true },
  current: null,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') {
      return {
        progress: { ...DEFAULTS.progress, ...raw.progress },
        settings: { ...DEFAULTS.settings, ...raw.settings },
        current: raw.current || null,
      };
    }
  } catch { /* armazenamento indisponível: segue só em memória */ }
  return structuredClone(DEFAULTS);
}

export const store = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

export function resetProgress() {
  store.progress = structuredClone(DEFAULTS.progress);
  store.current = null;
  save();
}

export function totalStars() {
  return Object.values(store.progress.stars).reduce((a, b) => a + b, 0);
}
