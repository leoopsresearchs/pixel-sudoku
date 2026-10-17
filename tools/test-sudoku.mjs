// Verifica que cada nível gera um puzzle único, consistente com a solução,
// e mostra pistas/técnica/tempo para calibrar a curva de dificuldade.
// Também confere o jogo livre (sementes aleatórias) e a conversão do progresso antigo.
import { generatePuzzle, geometry, countSolutions, logicalSolve } from '../js/sudoku.js';
import { levelConfig, freeConfig, migrateLevel, WORLDS } from '../js/levels.js';

const last = Number(process.argv[2] || WORLDS.at(-2).last + 10);
let fail = 0;
let worst = 0;

function check(label, cfg) {
  const t0 = performance.now();
  const p = generatePuzzle(cfg);
  const ms = performance.now() - t0;
  worst = Math.max(worst, ms);
  const g = geometry(p.br, p.bc);
  const unique = countSolutions(p.puzzle, g, 2) === 1;
  const matches = p.puzzle.every((v, i) => !v || v === p.solution[i]);
  const solved = logicalSolve(p.puzzle, g, cfg.maxTier);
  const same = solved.grid.every((v, i) => v === p.solution[i]);
  const ok = unique && matches && solved.solved && same;
  if (!ok) fail++;
  console.log(
    `${ok ? 'ok ' : 'ERR'} ${label} ${WORLDS[cfg.world].name.padEnd(11)} ` +
    `${g.n}x${g.n} pistas ${String(p.clues).padStart(2)} (alvo ${cfg.clues}) ` +
    `técnica ${p.tier} (min ${cfg.minTier}) ${ms.toFixed(0).padStart(5)}ms`
  );
}

for (let level = 1; level <= last; level++) check(`nv${String(level).padStart(4)}`, levelConfig(level));

for (const w of WORLDS) {
  for (let k = 0; k < 3; k++) check('livre  ', freeConfig(w.index, (Math.random() * 2 ** 32) >>> 0));
}

// Nível da versão 1 → nível atual (mesma posição dentro do mesmo mundo).
const MIGRATIONS = [[1, 1], [8, 8], [20, 20], [21, 21], [35, 35], [36, 51], [50, 65], [51, 81], [70, 100], [71, 121], [90, 140]];
for (const [from, to] of MIGRATIONS) {
  const got = migrateLevel(from);
  if (got !== to) { fail++; console.log(`ERR conversão nv${from} → ${got} (esperado ${to})`); }
}

console.log(`\n${fail ? fail + ' falhas' : 'tudo certo'} · pior tempo ${worst.toFixed(0)}ms`);
process.exit(fail ? 1 : 0);
