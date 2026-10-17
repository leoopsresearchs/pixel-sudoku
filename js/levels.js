// Curva de dificuldade: mundos curtos de aprendizado (4x4, 6x6) e depois 9x9
// com cada vez menos pistas e técnicas mais exigentes.
export const WORLDS = [
  { name: 'Prado',      label: 'Iniciante', br: 2, bc: 2, levels: 3,  clues: [9, 6],   minTier: [1, 1], maxTier: 1, scene: 'meadow' },
  { name: 'Bosque',     label: 'Aprendiz',  br: 2, bc: 3, levels: 5,  clues: [22, 14], minTier: [1, 1], maxTier: 1, scene: 'forest' },
  { name: 'Colinas',    label: 'Fácil',     br: 3, bc: 3, levels: 12, clues: [46, 36], minTier: [1, 1], maxTier: 1, scene: 'hills' },
  { name: 'Montanhas',  label: 'Médio',     br: 3, bc: 3, levels: 15, clues: [36, 30], minTier: [1, 2], maxTier: 2, scene: 'mountains' },
  { name: 'Crepúsculo', label: 'Difícil',   br: 3, bc: 3, levels: 15, clues: [31, 26], minTier: [2, 4], maxTier: 4, scene: 'dusk' },
  { name: 'Estrelas',   label: 'Expert',    br: 3, bc: 3, levels: 20, clues: [27, 23], minTier: [3, 5], maxTier: 5, scene: 'night' },
  { name: 'Infinito',   label: 'Mestre',    br: 3, bc: 3, levels: Infinity, clues: [24, 22], minTier: [5, 5], maxTier: 5, scene: 'cosmos' },
];

let start = 1;
for (const w of WORLDS) { w.first = start; start += w.levels; w.last = start - 1; }
WORLDS.forEach((w, i) => { w.index = i; });

export function worldOf(level) {
  return WORLDS.find((w) => level >= w.first && level <= w.last) || WORLDS[WORLDS.length - 1];
}

export function levelConfig(level) {
  const w = worldOf(level);
  const span = Number.isFinite(w.levels) ? w.levels - 1 : 10;
  const k = Number.isFinite(w.levels) ? level - w.first : (level - w.first) % 11;
  const t = span > 0 ? k / span : 0;
  const lerp = ([a, b]) => Math.round(a + (b - a) * t);
  return {
    level,
    world: w.index,
    br: w.br,
    bc: w.bc,
    clues: lerp(w.clues),
    minTier: lerp(w.minTier),
    maxTier: w.maxTier,
    attempts: w.br * w.bc === 9 ? 60 : 4,
    seed: (level * 2654435761 + 97) >>> 0,
  };
}
