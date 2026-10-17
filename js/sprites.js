// Sprites pixel art desenhados como texto. Cada letra é uma cor da paleta Sweetie 16.
export const PAL = {
  k: '#1a1c2c', p: '#5d275d', r: '#b13e53', o: '#ef7d57', y: '#ffcd75', l: '#a7f070',
  g: '#38b764', t: '#257179', v: '#29366f', b: '#3b5dc9', c: '#41a6f6', a: '#73eff7',
  w: '#f4f4f4', s: '#94b0c2', d: '#566c86', n: '#333c57',
};

export const SPRITES = {
  lock: [
    '..kkkkk..',
    '.kdddddk.',
    '.kd...dk.',
    '.kd...dk.',
    'kkkkkkkkk',
    'kyyyyyyyk',
    'kyyykyyyk',
    'kyyykyyyk',
    'koooooook',
    'kkkkkkkkk',
  ],
  undo: [
    '...kk.....',
    '..kwk.....',
    '.kwwkkkk..',
    'kwwwwwwwk.',
    '.kwwkkkwwk',
    '..kwk..kwk',
    '...kk..kwk',
    '......kwwk',
    '...kkkwwk.',
    '...kwwwk..',
    '...kkkk...',
  ],
  eraser: [
    '.....kkkk.',
    '....krrrrk',
    '...krrrrrk',
    '..krrrrrk.',
    '.kwkrrrk..',
    'kwwwkrk...',
    'kwwwwk....',
    '.kwwk.....',
    '..kk......',
    '..kkkkkkkk',
  ],
  pause: [
    'kkkk..kkkk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kwwk..kwwk',
    'kkkk..kkkk',
  ],
  back: [
    '....kk....',
    '...kwk....',
    '..kwwkkkkk',
    '.kwwwwwwwk',
    'kwwwwwwwwk',
    '.kwwwwwwwk',
    '..kwwkkkkk',
    '...kwk....',
    '....kk....',
  ],
  gear: [
    '....kk....',
    '.kk.kk.kk.',
    '.kwkwwkwk.',
    '..kwwwwk..',
    'kkwwkkwwkk',
    'kkwwkkwwkk',
    '..kwwwwk..',
    '.kwkwwkwk.',
    '.kk.kk.kk.',
    '....kk....',
  ],
  play: [
    'kk......',
    'kwkk....',
    'kwwwkk..',
    'kwwwwwkk',
    'kwwwwwkk',
    'kwwwkk..',
    'kwkk....',
    'kk......',
  ],
  heart: [
    '.kk...kk.',
    'krrk.kwrk',
    'krrrkrrrk',
    'krrrrrrrk',
    '.krrrrrk.',
    '..krrrk..',
    '...krk...',
    '....k....',
  ],
  clock: [
    '..kkkk..',
    '.kwwwwk.',
    'kwwkwwwk',
    'kwwkwwwk',
    'kwwkkkwk',
    'kwwwwwwk',
    '.kwwwwk.',
    '..kkkk..',
  ],
  restart: [
    '..kkkkk...',
    '.kwwwwwk..',
    'kwwkkkwwk.',
    'kwk...kwk.',
    'kwk..kkwkk',
    'kwk..kwwwk',
    'kwwk..kwk.',
    '.kwwk..k..',
    '..kkk.....',
  ],
  home: [
    '....kk....',
    '...kwwk...',
    '..kwwwwk..',
    '.kwwwwwwk.',
    'kwwwwwwwwk',
    '.kwwkkwwk.',
    '.kwwkkwwk.',
    '.kwwkkwwk.',
    '.kkkkkkkk.',
  ],
  map: [
    'kkkkkkkkkk',
    'kwwkwwkwwk',
    'kwwkwwkwwk',
    'kkkkkkkkkk',
    'kwwkyykwwk',
    'kwwkyykwwk',
    'kkkkkkkkkk',
    'kwwkwwkwwk',
    'kwwkwwkwwk',
    'kkkkkkkkkk',
  ],
  trophy: [
    'kkkkkkkkkkkk',
    'kyyywyyyyyyk',
    'kykywyyyykyk',
    'kykywyyyykyk',
    '.kkyyyyyykk.',
    '...kyyyyk...',
    '....kook....',
    '.....kk.....',
    '....kyyk....',
    '...kkkkkk...',
    '...kooook...',
    '...kkkkkk...',
  ],
};

// Mascote: um slime verde que pula e pisca.
export const SLIME = [
  [
    '......kkkk......',
    '....kkllllkk....',
    '...klllllllgk...',
    '..klwwllllllgk..',
    '..klwlllllllgk..',
    '.kllllllllllllk.',
    '.kllkkllllkkllk.',
    '.kllkwllllkwllk.',
    '.kllllllllllllk.',
    '.kloollkklloogk.',
    '.klllllllllllgk.',
    '..kggggggggggk..',
    '...kkkkkkkkkk...',
  ],
  [
    '................',
    '......kkkk......',
    '....kkllllkk....',
    '..kklllllllgkk..',
    '.klwwlllllllllk.',
    '.klwllllllllllk.',
    'klllllllllllllgk',
    'klllkkllllkklllk',
    'kllllllllllllllk',
    'klloollkkllooglk',
    'kllllllllllllgk.',
    '.kggggggggggggk.',
    '..kkkkkkkkkkkk..',
  ],
];

const cache = new Map();

export function drawSprite(ctx, rows, x = 0, y = 0, scale = 1, recolor) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      ctx.fillStyle = (recolor && recolor[ch]) || PAL[ch] || ch;
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  });
}

export function spriteURL(rows, recolor) {
  const key = rows.join('|') + JSON.stringify(recolor || {});
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map((r) => r.length));
  c.height = rows.length;
  drawSprite(c.getContext('2d'), rows, 0, 0, 1, recolor);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

// <img> pixelada com tamanho em "pixels de arte" (cada um = --px na tela).
export function icon(name, { recolor, cls = '' } = {}) {
  const rows = SPRITES[name];
  const img = document.createElement('img');
  img.src = spriteURL(rows, recolor);
  img.alt = '';
  img.draggable = false;
  img.className = `sprite ${cls}`;
  img.style.setProperty('--w', Math.max(...rows.map((r) => r.length)));
  img.style.setProperty('--h', rows.length);
  return img;
}

export function iconHTML(name, cls = '', recolor) {
  return icon(name, { cls, recolor }).outerHTML;
}

// Fonte bitmap 5x5 para o título.
const TITLE_FONT = {
  S: ['#####', '#....', '#####', '....#', '#####'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
};

export function drawTitle(canvas, text = 'SUDOKU') {
  const colors = ['#ef7d57', '#ffcd75', '#a7f070', '#73eff7', '#41a6f6', '#b13e53'];
  const glyphW = 5, gap = 1, block = 4;
  const w = text.length * (glyphW + gap) * block + block * 2;
  const h = 5 * block + block * 3;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  [...text].forEach((ch, li) => {
    const glyph = TITLE_FONT[ch];
    const ox = li * (glyphW + gap) * block + block;
    glyph.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        const x = ox + i * block, y = j * block + block;
        // sombra
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(x - 1, y - 1, block + 2, block + 3);
        ctx.fillRect(x, y + 2, block, block);
      }
    });
    glyph.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        const x = ox + i * block, y = j * block + block;
        ctx.fillStyle = colors[li % colors.length];
        ctx.fillRect(x, y, block, block);
        if (j === 0 || glyph[j - 1][i] !== '#') {
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.fillRect(x, y, block, 1);
        }
        if (j === glyph.length - 1 || glyph[j + 1][i] !== '#') {
          ctx.fillStyle = 'rgba(26,28,44,.25)';
          ctx.fillRect(x, y + block - 1, block, 1);
        }
      }
    });
  });
}
