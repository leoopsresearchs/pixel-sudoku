// Motor do sudoku: geometria genérica (4x4, 6x6, 9x9), gerador com semente
// e um resolvedor "humano" que mede a dificuldade pela técnica mais difícil exigida.
import { mulberry32, shuffle } from './rng.js';

// Técnicas por nível de dificuldade (tier).
export const TIERS = {
  1: 'Simples',          // naked/hidden singles
  2: 'Bloqueio',         // pointing / claiming
  3: 'Pares',            // naked/hidden pairs
  4: 'Trios',            // naked/hidden triples
  5: 'Avançado',         // X-Wing, Swordfish, XY-Wing
};

const POP = new Uint8Array(1 << 9);
for (let i = 1; i < POP.length; i++) POP[i] = POP[i >> 1] + (i & 1);

const digitOf = (bit) => 32 - Math.clz32(bit);
const bitOf = (d) => 1 << (d - 1);

const geomCache = new Map();

export function geometry(br, bc) {
  const key = `${br}x${bc}`;
  if (geomCache.has(key)) return geomCache.get(key);
  const n = br * bc;
  const cells = n * n;
  const rowOf = new Uint8Array(cells);
  const colOf = new Uint8Array(cells);
  const boxOf = new Uint8Array(cells);
  const rows = [], cols = [], boxes = [];
  for (let k = 0; k < n; k++) { rows.push([]); cols.push([]); boxes.push([]); }
  for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / n), c = i % n;
    const b = Math.floor(r / br) * (n / bc) + Math.floor(c / bc);
    rowOf[i] = r; colOf[i] = c; boxOf[i] = b;
    rows[r].push(i); cols[c].push(i); boxes[b].push(i);
  }
  const units = [...rows, ...cols, ...boxes];
  const isPeer = new Uint8Array(cells * cells);
  const peers = [];
  for (let i = 0; i < cells; i++) {
    const set = new Set([...rows[rowOf[i]], ...cols[colOf[i]], ...boxes[boxOf[i]]]);
    set.delete(i);
    peers.push([...set]);
    for (const p of set) isPeer[i * cells + p] = 1;
  }
  const g = { br, bc, n, cells, rows, cols, boxes, units, rowOf, colOf, boxOf, peers, isPeer, all: (1 << n) - 1 };
  geomCache.set(key, g);
  return g;
}

// ---------- Solução completa aleatória ----------
export function randomSolution(g, rng) {
  const grid = new Array(g.cells).fill(0);
  const rowM = new Array(g.n).fill(0), colM = new Array(g.n).fill(0), boxM = new Array(g.n).fill(0);
  const digits = [];
  for (let d = 1; d <= g.n; d++) digits.push(d);

  const solve = () => {
    let best = -1, bestMask = 0, bestCount = 99;
    for (let i = 0; i < g.cells; i++) {
      if (grid[i]) continue;
      const m = g.all & ~(rowM[g.rowOf[i]] | colM[g.colOf[i]] | boxM[g.boxOf[i]]);
      const c = POP[m];
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c <= 1) break; }
    }
    if (best < 0) return true;
    if (bestCount === 0) return false;
    const order = shuffle(digits.filter((d) => bestMask & bitOf(d)), rng);
    const r = g.rowOf[best], c = g.colOf[best], b = g.boxOf[best];
    for (const d of order) {
      const bit = bitOf(d);
      grid[best] = d; rowM[r] |= bit; colM[c] |= bit; boxM[b] |= bit;
      if (solve()) return true;
      grid[best] = 0; rowM[r] &= ~bit; colM[c] &= ~bit; boxM[b] &= ~bit;
    }
    return false;
  };
  solve();
  return grid;
}

// ---------- Contagem de soluções (para testes) ----------
export function countSolutions(puzzle, g, limit = 2) {
  const grid = puzzle.slice();
  const rowM = new Array(g.n).fill(0), colM = new Array(g.n).fill(0), boxM = new Array(g.n).fill(0);
  for (let i = 0; i < g.cells; i++) {
    if (!grid[i]) continue;
    const bit = bitOf(grid[i]);
    if ((rowM[g.rowOf[i]] | colM[g.colOf[i]] | boxM[g.boxOf[i]]) & bit) return 0;
    rowM[g.rowOf[i]] |= bit; colM[g.colOf[i]] |= bit; boxM[g.boxOf[i]] |= bit;
  }
  let count = 0;
  const solve = () => {
    let best = -1, bestMask = 0, bestCount = 99;
    for (let i = 0; i < g.cells; i++) {
      if (grid[i]) continue;
      const m = g.all & ~(rowM[g.rowOf[i]] | colM[g.colOf[i]] | boxM[g.boxOf[i]]);
      const c = POP[m];
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c <= 1) break; }
    }
    if (best < 0) { count++; return count >= limit; }
    if (bestCount === 0) return false;
    const r = g.rowOf[best], c = g.colOf[best], b = g.boxOf[best];
    for (let d = 1; d <= g.n; d++) {
      const bit = bitOf(d);
      if (!(bestMask & bit)) continue;
      grid[best] = d; rowM[r] |= bit; colM[c] |= bit; boxM[b] |= bit;
      if (solve()) return true;
      grid[best] = 0; rowM[r] &= ~bit; colM[c] &= ~bit; boxM[b] &= ~bit;
    }
    return false;
  };
  solve();
  return count;
}

// ---------- Resolvedor lógico ----------
function createState(puzzle, g) {
  const grid = puzzle.slice();
  const cand = new Uint16Array(g.cells);
  let empty = 0;
  for (let i = 0; i < g.cells; i++) {
    if (grid[i]) continue;
    empty++;
    let m = g.all;
    for (const p of g.peers[i]) if (grid[p]) m &= ~bitOf(grid[p]);
    cand[i] = m;
  }
  const S = {
    g, grid, cand, empty,
    place(i, d) {
      grid[i] = d; cand[i] = 0; S.empty--;
      const bit = bitOf(d);
      for (const p of g.peers[i]) cand[p] &= ~bit;
    },
  };
  return S;
}

function singles(S) {
  const { g, grid, cand } = S;
  let found = false;
  for (let i = 0; i < g.cells; i++) {
    if (!grid[i] && POP[cand[i]] === 1) { S.place(i, digitOf(cand[i])); found = true; }
  }
  if (found) return true;
  for (const u of g.units) {
    for (let d = 1; d <= g.n; d++) {
      const bit = bitOf(d);
      let pos = -1, cnt = 0;
      for (const i of u) {
        if (grid[i] === d) { cnt = -1; break; }
        if (cand[i] & bit) { cnt++; pos = i; if (cnt > 1) break; }
      }
      if (cnt === 1) { S.place(pos, d); found = true; }
    }
  }
  return found;
}

function lockedCandidates(S) {
  const { g, grid, cand } = S;
  let changed = false;
  // Pointing: candidatos de um bloco alinhados numa linha/coluna.
  for (let bx = 0; bx < g.n; bx++) {
    for (let d = 1; d <= g.n; d++) {
      const bit = bitOf(d);
      let r = -1, c = -1, cnt = 0, sameR = true, sameC = true;
      for (const i of g.boxes[bx]) {
        if (grid[i] || !(cand[i] & bit)) continue;
        if (cnt++ === 0) { r = g.rowOf[i]; c = g.colOf[i]; }
        else { if (g.rowOf[i] !== r) sameR = false; if (g.colOf[i] !== c) sameC = false; }
      }
      if (cnt < 2) continue;
      if (sameR) for (const i of g.rows[r]) if (g.boxOf[i] !== bx && cand[i] & bit) { cand[i] &= ~bit; changed = true; }
      if (sameC) for (const i of g.cols[c]) if (g.boxOf[i] !== bx && cand[i] & bit) { cand[i] &= ~bit; changed = true; }
    }
  }
  // Claiming: candidatos de uma linha/coluna presos num só bloco.
  const claim = (lines, lineOf) => {
    for (let li = 0; li < g.n; li++) {
      for (let d = 1; d <= g.n; d++) {
        const bit = bitOf(d);
        let b = -1, cnt = 0, same = true;
        for (const i of lines[li]) {
          if (grid[i] || !(cand[i] & bit)) continue;
          if (cnt++ === 0) b = g.boxOf[i];
          else if (g.boxOf[i] !== b) { same = false; break; }
        }
        if (cnt < 2 || !same) continue;
        for (const i of g.boxes[b]) if (lineOf[i] !== li && cand[i] & bit) { cand[i] &= ~bit; changed = true; }
      }
    }
  };
  claim(g.rows, g.rowOf);
  claim(g.cols, g.colOf);
  return changed;
}

function combos(items, k, cb, start = 0, picked = []) {
  if (picked.length === k) { cb(picked); return; }
  for (let i = start; i <= items.length - (k - picked.length); i++) {
    picked.push(items[i]);
    combos(items, k, cb, i + 1, picked);
    picked.pop();
  }
}

function subsets(S, k) {
  const { g, grid, cand } = S;
  let changed = false;
  for (const u of g.units) {
    const empties = u.filter((i) => !grid[i]);
    if (empties.length <= k) continue;
    // Naked: k células cujos candidatos somam exatamente k dígitos.
    const small = empties.filter((i) => POP[cand[i]] >= 2 && POP[cand[i]] <= k);
    combos(small, k, (set) => {
      let union = 0;
      for (const i of set) union |= cand[i];
      if (POP[union] !== k) return;
      for (const i of empties) {
        if (set.includes(i) || !(cand[i] & union)) continue;
        cand[i] &= ~union; changed = true;
      }
    });
    // Hidden: k dígitos que só cabem em k células.
    const posOf = [];
    for (let d = 1; d <= g.n; d++) {
      const bit = bitOf(d);
      let pos = 0;
      empties.forEach((i, idx) => { if (cand[i] & bit) pos |= 1 << idx; });
      const cnt = POP[pos];
      if (cnt >= 2 && cnt <= k) posOf.push({ bit, pos });
    }
    combos(posOf, k, (set) => {
      let union = 0, digits = 0;
      for (const s of set) { union |= s.pos; digits |= s.bit; }
      if (POP[union] !== k) return;
      empties.forEach((i, idx) => {
        if (!(union & (1 << idx))) return;
        if (cand[i] & ~digits) { cand[i] &= digits; changed = true; }
      });
    });
  }
  return changed;
}

function fish(S, size) {
  const { g, grid, cand } = S;
  const n = g.n;
  let changed = false;
  for (let d = 1; d <= n; d++) {
    const bit = bitOf(d);
    for (const byRow of [true, false]) {
      const cellAt = byRow ? (base, cover) => base * n + cover : (base, cover) => cover * n + base;
      const bases = [];
      for (let b = 0; b < n; b++) {
        let mask = 0;
        for (let c = 0; c < n; c++) {
          const i = cellAt(b, c);
          if (!grid[i] && cand[i] & bit) mask |= 1 << c;
        }
        const cnt = POP[mask];
        if (cnt >= 2 && cnt <= size) bases.push({ b, mask });
      }
      if (bases.length < size) continue;
      combos(bases, size, (set) => {
        let union = 0;
        for (const s of set) union |= s.mask;
        if (POP[union] !== size) return;
        for (let c = 0; c < n; c++) {
          if (!(union & (1 << c))) continue;
          for (let b = 0; b < n; b++) {
            if (set.some((s) => s.b === b)) continue;
            const i = cellAt(b, c);
            if (cand[i] & bit) { cand[i] &= ~bit; changed = true; }
          }
        }
      });
    }
  }
  return changed;
}

function xyWing(S) {
  const { g, grid, cand } = S;
  let changed = false;
  for (let pv = 0; pv < g.cells; pv++) {
    if (grid[pv] || POP[cand[pv]] !== 2) continue;
    const pm = cand[pv];
    const wings = g.peers[pv].filter((p) => !grid[p] && POP[cand[p]] === 2 && cand[p] !== pm && POP[cand[p] & pm] === 1);
    for (const a of wings) {
      const shared = cand[a] & pm;
      const z = cand[a] & ~shared;
      const need = (pm & ~shared) | z;
      for (const b of wings) {
        if (b === a || cand[b] !== need) continue;
        for (let i = 0; i < g.cells; i++) {
          if (i === a || i === b || grid[i] || !(cand[i] & z)) continue;
          if (g.isPeer[i * g.cells + a] && g.isPeer[i * g.cells + b]) { cand[i] &= ~z; changed = true; }
        }
      }
    }
  }
  return changed;
}

const TECHNIQUES = [
  null,
  singles,
  lockedCandidates,
  (S) => subsets(S, 2),
  (S) => subsets(S, 3),
  (S) => fish(S, 2) || xyWing(S) || fish(S, 3),
];

// Resolve só com técnicas até maxTier. Se resolver por completo, a solução é única.
export function logicalSolve(puzzle, g, maxTier = 5) {
  const S = createState(puzzle, g);
  let tier = 0, steps = 0;
  while (S.empty > 0) {
    let progressed = false;
    for (let t = 1; t <= maxTier; t++) {
      if (TECHNIQUES[t](S)) {
        if (t > tier) tier = t;
        steps++;
        progressed = true;
        break;
      }
    }
    if (!progressed) break;
  }
  return { solved: S.empty === 0, tier, steps, grid: S.grid };
}

// ---------- Gerador de puzzle ----------
// Remove pistas (em pares simétricos) enquanto o puzzle continuar resolvível
// só com técnicas <= maxTier. Se ao chegar no alvo de pistas ainda não exigir
// minTier, continua removendo um pouco além. Repete com outras soluções até acertar.
export function generatePuzzle({ br, bc, clues, maxTier = 5, minTier = 1, attempts = 1, seed = 1, symmetric = true, slack = 4 }) {
  const g = geometry(br, bc);
  const rng = mulberry32(seed);
  const floor = Math.max(clues - slack, g.n);
  let best = null;
  for (let a = 0; a < attempts; a++) {
    const solution = randomSolution(g, rng);
    const puzzle = solution.slice();
    let count = g.cells;
    let tier = 0;
    const order = shuffle([...Array(g.cells).keys()], rng);
    const done = new Uint8Array(g.cells);
    for (const i of order) {
      if (count <= floor || (count <= clues && tier >= minTier)) break;
      if (done[i]) continue;
      const j = symmetric ? g.cells - 1 - i : i;
      done[i] = done[j] = 1;
      const take = i === j ? 1 : 2;
      // Só passa do alvo de pistas se ainda faltar dificuldade.
      if (count - take < (tier >= minTier ? clues : floor)) continue;
      const vi = puzzle[i], vj = puzzle[j];
      puzzle[i] = 0; puzzle[j] = 0;
      const res = logicalSolve(puzzle, g, maxTier);
      if (res.solved) { count -= take; tier = res.tier; }
      else { puzzle[i] = vi; puzzle[j] = vj; }
    }
    const candidate = { br, bc, puzzle, solution, clues: count, tier };
    if (!best || score(candidate, clues, minTier) > score(best, clues, minTier)) best = candidate;
    if (tier >= minTier && Math.abs(count - clues) <= 1) break;
  }
  return best;
}

function score(p, clues, minTier) {
  // Prioriza atingir a técnica mínima; depois, ficar perto do alvo de pistas.
  return Math.min(p.tier, minTier) * 1000 - Math.abs(p.clues - clues) * 10 + p.tier;
}
