import { generatePuzzle } from './sudoku.js';
import { levelConfig } from './levels.js';

self.onmessage = ({ data }) => {
  const puzzle = generatePuzzle(levelConfig(data.level));
  self.postMessage({ id: data.id, level: data.level, puzzle });
};
