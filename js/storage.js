// Progresso, ajustes e partidas em andamento ficam no próprio aparelho.
import { LEVELS_VERSION, migrateLevel } from './levels.js';

const KEY = 'pxsudoku.v1';

const DEFAULTS = {
  levels: LEVELS_VERSION,
  progress: { unlocked: 1 },
  settings: {
    nightMode: true, reduceMotion: true, readableNumbers: true, subtleHighlights: true,
    sound: true, showErrors: true, highlightSame: true, showPossible: true, showCount: true, vibrate: true,
  },
  current: null, // partida dos níveis
  free: null, // partida do jogo livre
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') {
      // Progresso salvo com outra lista de níveis: converte os números.
      const level = raw.levels === LEVELS_VERSION ? (l) => l : migrateLevel;
      return {
        levels: LEVELS_VERSION,
        progress: { unlocked: level(raw.progress?.unlocked || 1) },
        settings: { ...DEFAULTS.settings, ...raw.settings },
        current: raw.current ? { ...raw.current, level: level(raw.current.level) } : null,
        free: raw.free || null,
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
  store.free = null;
  save();
}
