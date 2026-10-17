// Progresso, ajustes e partida em andamento ficam no próprio aparelho.
const KEY = 'pxsudoku.v1';

const DEFAULTS = {
  progress: { unlocked: 1 },
  settings: { sound: true, showErrors: true, highlightSame: true, vibrate: true },
  current: null,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') {
      return {
        progress: { unlocked: raw.progress?.unlocked || 1 },
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
