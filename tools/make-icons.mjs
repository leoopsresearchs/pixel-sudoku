// Gera os ícones PNG do PWA a partir de um desenho pixel art 32x32 (sem dependências):
// o slime do jogo sentado num tabuleiro de sudoku, com o sol se pondo atrás.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { PAL, SLIME } from '../js/sprites.js';

const rgba = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const C = Object.fromEntries(Object.entries(PAL).map(([k, h]) => [k, rgba(h)]));

const DIGITS = {
  3: ['###', '..#', '.##', '..#', '###'],
  5: ['###', '#..', '###', '..#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
};

function design() {
  const S = 32;
  const px = new Array(S * S);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < S && y < S) px[y * S + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };

  // Céu do entardecer em faixas, com uma linha pontilhada entre elas (como os cenários).
  const bands = [[0, 'v'], [6, 'p'], [11, 'r'], [16, 'o'], [21, 'y']];
  for (let y = 0; y < S; y++) {
    let i = 0;
    while (i + 1 < bands.length && y >= bands[i + 1][0]) i++;
    const next = bands[i + 1];
    for (let x = 0; x < S; x++) {
      const edge = next && y === next[0] - 1 && (x + y) % 2 === 0;
      set(x, y, C[edge ? next[1] : bands[i][1]]);
    }
  }
  // Estrelas no alto.
  for (const [x, y, c] of [[4, 2, 'w'], [9, 4, 'y'], [26, 1, 'w'], [29, 4, 'y'], [21, 3, 'w'], [2, 7, 'y']]) set(x, y, C[c]);
  // Sol atrás do slime.
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (Math.hypot(x + 0.5 - 16, y + 0.5 - 14) < 9.5) set(x, y, C.y);

  // Tabuleiro saindo pela borda de baixo: 3 casas por linha, bordas escuras.
  rect(3, 19, 26, 13, C.k);
  const cols = [[4, 7], [12, 8], [21, 7]];
  const rows = [[20, 7], [28, 4]];
  const cells = [[5, 9, 3], [0, 0, 0]];
  rows.forEach(([y, h], r) => cols.forEach(([x, w], c) => {
    const sel = r === 0 && c === 1;
    rect(x, y, w, h, sel ? C.y : C.w);
    if (h === 7) rect(x, y + h - 1, w, 1, sel ? C.o : C.s);
    const d = cells[r][c];
    if (d) DIGITS[d].forEach((line, j) => {
      for (let i = 0; i < 3; i++) if (line[i] === '#') set(x + Math.floor((w - 3) / 2) + i, y + 1 + j, sel ? C.b : C.k);
    });
  }));

  // Slime sentado na borda de cima do tabuleiro.
  SLIME[0].forEach((line, j) => {
    for (let i = 0; i < line.length; i++) if (line[i] !== '.') set(8 + i, 7 + j, C[line[i]]);
  });
  return { S, px };
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, getPixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) raw.set(getPixel(x, y), y * (size * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Amplia por um fator inteiro e centraliza; a margem repete a borda do desenho
// (céu dos lados e em cima, tabuleiro embaixo), então o ícone pode ser cortado em
// qualquer formato sem aparecer uma moldura.
function render(size, scale) {
  const { S, px } = design();
  const off = Math.floor((size - S * scale) / 2);
  const clamp = (v) => Math.min(S - 1, Math.max(0, v));
  return png(size, (x, y) => px[clamp(Math.floor((y - off) / scale)) * S + clamp(Math.floor((x - off) / scale))]);
}

mkdirSync('icons', { recursive: true });
const out = {
  'icons/favicon-32.png': render(32, 1),
  'icons/apple-touch-icon.png': render(180, 5),
  'icons/icon-192.png': render(192, 6),
  'icons/icon-512.png': render(512, 16),
  'icons/icon-maskable-512.png': render(512, 12),
};
for (const [file, buf] of Object.entries(out)) { writeFileSync(file, buf); console.log(file, buf.length, 'bytes'); }
