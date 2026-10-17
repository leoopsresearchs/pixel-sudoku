// Estado de uma partida: valores, desfazer e verificação da solução.
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
    this.elapsed = data.elapsed || 0;
    this.history = [];
    this.done = false;
    this.selected = data.selected ?? -1; // começa sem casa: o primeiro toque pode ser num número
  }

  isGiven(i) { return this.puzzle[i] !== 0; }
  isWrong(i) { return this.values[i] !== 0 && this.values[i] !== this.solution[i]; }
  isFull() { return this.values.every((v) => v); }
  hasProgress() { return this.values.some((v, i) => v && !this.isGiven(i)); }

  // Troca o valor da casa selecionada, guardando o anterior para desfazer.
  set(v) {
    const i = this.selected;
    this.history.push({ i, v: this.values[i] });
    this.values[i] = v;
  }

  input(d) {
    const i = this.selected;
    if (this.done || i < 0 || this.isGiven(i)) return NONE;
    if (this.values[i] === d) return this.erase();
    this.set(d);
    if (d !== this.solution[i]) return { type: 'error', cell: i };
    return { type: 'place', cell: i, units: this.completedUnits(i), won: this.checkWin() };
  }

  erase() {
    const i = this.selected;
    if (this.done || i < 0 || this.isGiven(i) || !this.values[i]) return NONE;
    this.set(0);
    return { type: 'erase', cell: i };
  }

  undo() {
    if (this.done || !this.history.length) return NONE;
    const { i, v } = this.history.pop();
    this.values[i] = v;
    this.selected = i;
    return { type: 'undo', cell: i };
  }

  completedUnits(i) {
    const { g } = this;
    return [g.rows[g.rowOf[i]], g.cols[g.colOf[i]], g.boxes[g.boxOf[i]]]
      .filter((u) => u.every((c) => this.values[c] === this.solution[c]));
  }

  // Números que a casa ainda aceita: os que não aparecem na linha, coluna ou bloco dela.
  // O valor atual da casa sempre entra, para a tecla dele seguir acesa (tocar nela apaga a casa).
  candidates(i) {
    const used = new Set(this.g.peers[i].map((p) => this.values[p]));
    const out = [];
    for (let d = 1; d <= this.n; d++) if (!used.has(d) || d === this.values[i]) out.push(d);
    return out;
  }

  checkWin() {
    this.done = this.values.every((v, i) => v === this.solution[i]);
    return this.done;
  }

  serialize() {
    const { level, br, bc, puzzle, solution, values, elapsed, selected } = this;
    return { level, br, bc, puzzle, solution, values, elapsed, selected };
  }
}
