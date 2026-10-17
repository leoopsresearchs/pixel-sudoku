// Estado de uma partida: valores, notas, desfazer, dicas e erros.
import { geometry } from './sudoku.js';

const NONE = { type: 'none' };

export class Game {
  constructor(data) {
    this.level = data.level;
    this.br = data.br;
    this.bc = data.bc;
    this.g = geometry(data.br, data.bc);
    this.n = this.g.n;
    this.puzzle = data.puzzle;
    this.solution = data.solution;
    this.values = data.values ? data.values.slice() : data.puzzle.slice();
    this.notes = data.notes ? data.notes.slice() : new Array(this.g.cells).fill(0);
    this.elapsed = data.elapsed || 0;
    this.mistakes = data.mistakes || 0;
    this.hints = data.hints || 0;
    this.history = [];
    this.done = false;
    this.selected = data.selected ?? this.values.findIndex((v) => !v);
  }

  isGiven(i) { return this.puzzle[i] !== 0; }
  isWrong(i) { return this.values[i] !== 0 && this.values[i] !== this.solution[i]; }
  isFull() { return this.values.every((v) => v); }
  hasProgress() { return this.values.some((v, i) => v && !this.isGiven(i)) || this.notes.some((m) => m); }

  snapshot(cells) {
    return cells.map((i) => ({ i, v: this.values[i], n: this.notes[i] }));
  }

  // Coloca o dígito e limpa a nota dele nas casas vizinhas (guardando para desfazer).
  write(i, d) {
    const bit = 1 << (d - 1);
    const touched = [i, ...this.g.peers[i].filter((p) => !this.values[p] && this.notes[p] & bit)];
    this.history.push(this.snapshot(touched));
    this.values[i] = d;
    this.notes[i] = 0;
    for (const p of touched) if (p !== i) this.notes[p] &= ~bit;
  }

  input(d, { notesMode, showErrors }) {
    const i = this.selected;
    if (this.done || i < 0 || this.isGiven(i)) return NONE;
    if (notesMode) {
      if (this.values[i]) return NONE;
      this.history.push(this.snapshot([i]));
      this.notes[i] ^= 1 << (d - 1);
      return { type: 'note', cell: i };
    }
    if (this.values[i] === d) return this.erase();
    this.write(i, d);
    if (d !== this.solution[i]) {
      if (showErrors) this.mistakes++;
      return { type: 'error', cell: i };
    }
    return { type: 'place', cell: i, units: this.completedUnits(i), won: this.checkWin() };
  }

  erase() {
    const i = this.selected;
    if (this.done || i < 0 || this.isGiven(i)) return NONE;
    if (!this.values[i] && !this.notes[i]) return NONE;
    this.history.push(this.snapshot([i]));
    this.values[i] = 0;
    this.notes[i] = 0;
    return { type: 'erase', cell: i };
  }

  undo() {
    const snap = this.history.pop();
    if (this.done || !snap) return NONE;
    for (const { i, v, n } of snap) { this.values[i] = v; this.notes[i] = n; }
    this.selected = snap[0].i;
    return { type: 'undo', cell: snap[0].i };
  }

  // Dica: revela a casa selecionada; se ela já estiver certa, escolhe a mais fácil.
  hint() {
    if (this.done) return NONE;
    let i = this.selected;
    if (i < 0 || this.isGiven(i) || this.values[i] === this.solution[i]) i = this.easiestCell();
    if (i < 0) return NONE;
    this.write(i, this.solution[i]);
    this.hints++;
    this.selected = i;
    return { type: 'hint', cell: i, units: this.completedUnits(i), won: this.checkWin() };
  }

  easiestCell() {
    let best = -1, bestScore = Infinity;
    for (let i = 0; i < this.g.cells; i++) {
      if (this.values[i] === this.solution[i]) continue;
      if (this.isWrong(i)) return i;
      const used = new Set(this.g.peers[i].map((p) => this.values[p]).filter(Boolean));
      const score = this.n - used.size;
      if (score < bestScore) { best = i; bestScore = score; }
    }
    return best;
  }

  completedUnits(i) {
    const { g } = this;
    return [g.rows[g.rowOf[i]], g.cols[g.colOf[i]], g.boxes[g.boxOf[i]]]
      .filter((u) => u.every((c) => this.values[c] === this.solution[c]));
  }

  placed(d) { return this.values.reduce((a, v) => a + (v === d), 0); }
  digitComplete(d) { return this.values.reduce((a, v, i) => a + (v === d && v === this.solution[i]), 0) === this.n; }

  checkWin() {
    this.done = this.values.every((v, i) => v === this.solution[i]);
    return this.done;
  }

  stars() {
    const penalty = this.mistakes + this.hints;
    return penalty === 0 ? 3 : penalty <= 3 ? 2 : 1;
  }

  serialize() {
    const { level, br, bc, puzzle, solution, values, notes, elapsed, mistakes, hints, selected } = this;
    return { level, br, bc, puzzle, solution, values, notes, elapsed, mistakes, hints, selected };
  }
}
