// Gera os ícones PNG do PWA a partir de um desenho pixel art 32x32 (sem dependências).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const C = { bg: hex('#29366f'), ink: hex('#1a1c2c'), cell: hex('#f4f4f4'), shade: hex('#94b0c2'), sel: hex('#ffcd75'), selShade: hex('#ef7d57'), blue: hex('#3b5dc9'), hi: hex('#3b5dc9') };

const DIGITS = {
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  3: ['###', '..#', '.##', '..#', '###'],
  5: ['###', '#..', '###', '..#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
  2: ['###', '..#', '###', '#..', '###'],
};

function design() {
  const S = 32;
  const px = Array.from({ length: S * S }, () => C.bg);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < S && y < S) px[y * S + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  // brilho sutil no fundo
  for (let y = 0; y < 6; y++) for (let x = (y % 2); x < S; x += 2) if (y < 3 || x % 4 === 0) set(x, y, C.hi);
  // tabuleiro 3x3 com borda escura e sombra
  rect(3, 4, 28, 28, C.ink);
  rect(2, 2, 28, 28, C.ink);
  const layout = [
    [5, 0, 3],
    [0, 9, 0],
    [8, 0, 1],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 3 + c * 9, y = 3 + r * 9;
      const sel = r === 1 && c === 1;
      rect(x, y, 8, 8, sel ? C.sel : C.cell);
      rect(x, y + 7, 8, 1, sel ? C.selShade : C.shade);
      const d = layout[r][c];
      if (!d) continue;
      DIGITS[d].forEach((row, j) => {
        for (let i = 0; i < 3; i++) if (row[i] === '#') set(x + 3 + i, y + 1 + j, sel ? C.blue : C.ink);
      });
    }
  }
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

// Amplia por um fator inteiro e centraliza num quadrado com margem da cor de fundo.
function render(size, scale) {
  const { S, px } = design();
  const off = Math.floor((size - S * scale) / 2);
  return png(size, (x, y) => {
    const sx = Math.floor((x - off) / scale), sy = Math.floor((y - off) / scale);
    if (sx < 0 || sy < 0 || sx >= S || sy >= S) return C.bg;
    return px[sy * S + sx];
  });
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
