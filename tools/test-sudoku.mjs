// Verifica que cada nível gera um puzzle único, consistente com a solução,
// e mostra pistas/técnica/tempo para calibrar a curva de dificuldade.
import { generatePuzzle, geometry, countSolutions, logicalSolve } from '../js/sudoku.js';
import { levelConfig, WORLDS } from '../js/levels.js';

const last = Number(process.argv[2] || 80);
let fail = 0;
let worst = 0;
for (let level = 1; level <= last; level++) {
  const cfg = levelConfig(level);
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
    `${ok ? 'ok ' : 'ERR'} nv${String(level).padStart(3)} ${WORLDS[cfg.world].name.padEnd(11)} ` +
    `${g.n}x${g.n} pistas ${String(p.clues).padStart(2)} (alvo ${cfg.clues}) ` +
    `técnica ${p.tier} (min ${cfg.minTier}) ${ms.toFixed(0).padStart(5)}ms`
  );
}
console.log(`\n${fail ? fail + ' falhas' : 'tudo certo'} · pior tempo ${worst.toFixed(0)}ms`);
process.exit(fail ? 1 : 0);
