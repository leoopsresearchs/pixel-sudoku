import { generatePuzzle } from './sudoku.js';

self.onmessage = ({ data }) => {
  const puzzle = generatePuzzle(data.cfg);
  self.postMessage({ id: data.id, key: data.key, puzzle });
};
