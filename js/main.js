import { Game } from './game.js';
import { WORLDS, worldOf, levelConfig } from './levels.js';
import { generatePuzzle } from './sudoku.js';
import { store, save, resetProgress } from './storage.js';
import { Backdrop } from './scenes.js';
import { icon, iconHTML, drawTitle, drawSprite, SLIME, PAL } from './sprites.js';
import { sfx, unlockAudio, setSound } from './audio.js';
import { Wheel } from './wheel.js';

const VERSION = '1.1.0';
const $ = (sel) => document.querySelector(sel);

const TIPS = [
  'Cada linha, coluna e bloco 2x2 tem os números de 1 a 4, sem repetir. Toque numa casa vazia e escolha o número na roda.',
  'Agora 6x6! Os blocos são de 2x3 e os números vão de 1 a 6. Truque: segure a casa e arraste até o número, sem soltar.',
  'O clássico 9x9. Procure a única casa possível para cada número em cada bloco.',
  'Se um número só cabe numa linha de um bloco, ele não pode aparecer no resto dessa linha.',
  'Pares e trios: duas casas de uma linha com os mesmos dois candidatos eliminam esses números do resto da linha.',
  'Técnicas avançadas, como X-Wing. Respire fundo: dá para resolver sem chutar!',
  'Puzzles sem fim no nível máximo. Boa sorte, mestre!',
];

// ---------- Geração de puzzles (Web Worker com fallback) ----------
const ready = new Map();
const pending = new Map();
let worker = null;
let reqId = 0;

function generateSync(level) {
  const p = generatePuzzle(levelConfig(level));
  ready.set(level, p);
  return p;
}

try {
  worker = new Worker('js/worker.js', { type: 'module' });
  worker.onmessage = ({ data }) => {
    ready.set(data.level, data.puzzle);
    const job = pending.get(data.id);
    if (job) { pending.delete(data.id); job.resolve(data.puzzle); }
  };
  worker.onerror = (e) => {
    e.preventDefault?.();
    worker = null;
    for (const [id, job] of pending) { pending.delete(id); job.resolve(generateSync(job.level)); }
  };
} catch { worker = null; }

function getPuzzle(level) {
  if (ready.has(level)) return Promise.resolve(ready.get(level));
  for (const job of pending.values()) if (job.level === level) return job.promise;
  if (!worker) return new Promise((r) => setTimeout(() => r(generateSync(level)), 20));
  const id = ++reqId;
  const job = { level };
  job.promise = new Promise((resolve) => { job.resolve = resolve; });
  pending.set(id, job);
  worker.postMessage({ id, level });
  return job.promise;
}

// ---------- Estado da interface ----------
const backdrop = new Backdrop($('#bg'));
setSound(store.settings.sound);

let screen = 'home';
let game = null;
let paused = false;
let tickTimer = null;
let lastTick = 0;
let cellEls = [];
let modalOpen = false;

function show(name) {
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
  if (name !== 'home' && !history.state?.trap) history.pushState({ trap: true }, '');
}

// ---------- Início ----------
function fitCanvas(canvas, maxW, maxH) {
  const scale = Math.max(1, Math.floor(Math.min(maxW / canvas.width, maxH / canvas.height)));
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}

const titleCanvas = $('#title');
drawTitle(titleCanvas);
const mascot = $('#mascot');
let mascotFrame = 0;
function drawMascot() {
  const ctx = mascot.getContext('2d');
  ctx.clearRect(0, 0, 16, 13);
  drawSprite(ctx, SLIME[mascotFrame % 2], 0, 0, 1);
  if (mascotFrame === 6) {
    // pisca: fecha os olhos
    ctx.fillStyle = PAL.l; ctx.fillRect(4, 6, 2, 1); ctx.fillRect(10, 6, 2, 1);
    ctx.fillStyle = PAL.k; ctx.fillRect(4, 7, 2, 1); ctx.fillRect(10, 7, 2, 1);
  }
}
drawMascot();
setInterval(() => {
  if (screen !== 'home' || document.hidden) return;
  mascotFrame = (mascotFrame + 1) % 8;
  drawMascot();
}, 300);

function layoutHome() {
  fitCanvas(titleCanvas, Math.min(innerWidth * 0.86, 720), innerHeight * 0.16);
  fitCanvas(mascot, 160, Math.min(innerHeight * 0.14, 140));
}

function renderHome() {
  const cur = store.current;
  const lvl = cur ? cur.level : store.progress.unlocked;
  $('#play-sub').textContent = `${cur ? 'CONTINUAR · ' : ''}NÍVEL ${lvl}`;
  backdrop.set(worldOf(lvl).scene);
  layoutHome();
}

$('#btn-play').addEventListener('click', () => {
  unlockAudio(); sfx.click();
  const cur = store.current;
  if (cur) startLevel(cur.level, { resume: true });
  else startLevel(store.progress.unlocked);
});
$('#btn-levels').addEventListener('click', () => { unlockAudio(); sfx.click(); openMap(); });
$('#btn-settings').addEventListener('click', () => { unlockAudio(); sfx.click(); openSettings(); });

// ---------- Mapa de níveis ----------
$('#map-back').append(icon('back'));
$('#map-back').addEventListener('click', () => { sfx.click(); goHome(); });

function openMap() {
  renderMap();
  show('map');
  const cur = $('.tile.current');
  if (cur) cur.scrollIntoView({ block: 'center' });
}

function renderMap() {
  const wrap = $('#worlds');
  wrap.innerHTML = '';
  const { unlocked } = store.progress;
  backdrop.set(worldOf(unlocked).scene);
  for (const w of WORLDS) {
    const locked = unlocked < w.first;
    const count = Number.isFinite(w.levels) ? w.levels : Math.max(unlocked - w.first + 1, 0) + 6;
    const sec = document.createElement('section');
    sec.className = `world px-panel${locked ? ' locked' : ''}`;
    const n = w.br * w.bc;
    sec.innerHTML = `
      <div class="world-head">
        <span class="world-num">MUNDO ${w.index + 1}</span>
        <h3>${locked ? '???' : w.name.toUpperCase()}</h3>
        <span class="tag">${w.label.toUpperCase()} · ${n}x${n}</span>
      </div>
      <div class="tiles"></div>`;
    const tiles = sec.querySelector('.tiles');
    for (let l = w.first; l < w.first + count; l++) {
      const b = document.createElement('button');
      const isLocked = l > unlocked;
      b.className = `btn tile${isLocked ? ' locked' : l < unlocked ? ' done' : ''}${l === unlocked ? ' current' : ''}`;
      b.disabled = false;
      if (isLocked) b.append(icon('lock'));
      else {
        b.innerHTML = `<span>${l}</span>`;
        b.addEventListener('click', () => { sfx.click(); chooseLevel(l); });
      }
      if (isLocked) b.addEventListener('click', () => { sfx.error(); toast('Complete o nível anterior!'); });
      tiles.append(b);
    }
    wrap.append(sec);
  }
}

function chooseLevel(level) {
  const cur = store.current;
  if (cur && cur.level === level) return startLevel(level, { resume: true });
  if (cur && hasProgress(cur)) {
    return modal({
      title: 'TROCAR DE NÍVEL?',
      text: `O nível ${cur.level} em andamento será descartado.`,
      buttons: [
        { label: 'SIM, TROCAR', cls: 'btn-red', action: () => startLevel(level) },
        { label: `VOLTAR AO ${cur.level}`, cls: 'btn-primary', action: () => startLevel(cur.level, { resume: true }) },
        { label: 'CANCELAR', action: closeModal },
      ],
    });
  }
  startLevel(level);
}

function hasProgress(data) {
  return data.values.some((v, i) => v && !data.puzzle[i]);
}

// ---------- Partida ----------
async function startLevel(level, { resume = false } = {}) {
  unlockAudio();
  let data;
  if (resume && store.current?.level === level) data = store.current;
  else {
    const loadingTimer = setTimeout(() => modal({ title: 'GERANDO...', html: '<div class="loader"><i></i><i></i><i></i></div>', buttons: [] }), 150);
    const p = await getPuzzle(level);
    clearTimeout(loadingTimer);
    data = { level, br: p.br, bc: p.bc, puzzle: p.puzzle, solution: p.solution };
  }
  closeModal();
  game = new Game(data);
  paused = false;
  persist();
  buildBoard();
  const w = worldOf(level);
  backdrop.set(w.scene);
  $('#game-world').textContent = `MUNDO ${w.index + 1} · ${w.name.toUpperCase()}`;
  $('#game-level').textContent = `NÍVEL ${level}`;
  show('game');
  layoutBoard();
  renderGame();
  getPuzzle(level + 1); // deixa o próximo pronto
  if (level === w.first && level >= store.progress.unlocked && !game.hasProgress()) {
    showWorldIntro(w);
  } else startTimer();
}

function showWorldIntro(w) {
  const n = w.br * w.bc;
  modal({
    kicker: `MUNDO ${w.index + 1}`,
    title: w.name.toUpperCase(),
    html: `<p><b>${w.label.toUpperCase()} · ${n}x${n}</b></p><p>${TIPS[w.index]}</p>`,
    buttons: [{ label: 'VAMOS LÁ!', cls: 'btn-primary', icon: 'play', action: () => { closeModal(); startTimer(); } }],
  });
}

function persist() {
  if (!game) return;
  store.current = game.done ? null : game.serialize();
  save();
}

function buildBoard() {
  const board = $('#board');
  const { n, br, bc, g } = game;
  board.innerHTML = '';
  board.style.setProperty('--box-cols', n / bc);
  board.style.setProperty('--box-rows', n / br);
  board.style.setProperty('--br', br);
  board.style.setProperty('--bc', bc);
  cellEls = new Array(g.cells);
  for (let b = 0; b < n; b++) {
    const box = document.createElement('div');
    box.className = 'box';
    for (const i of g.boxes[b]) {
      const c = document.createElement('div');
      c.className = 'cell';
      c.dataset.i = i;
      cellEls[i] = c;
      box.append(c);
    }
    board.append(box);
  }
  layoutBoard();
}

const artPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 4;

const boardWrap = $('#board-wrap');
function layoutBoard() {
  if (!game) return;
  const r = boardWrap.getBoundingClientRect();
  const size = Math.floor(Math.min(r.width, r.height) - artPx() * 4);
  if (size <= 0) return;
  const board = $('#board');
  board.style.width = board.style.height = `${size}px`;
  board.style.setProperty('--cell', `${size / game.n}px`);
}
new ResizeObserver(layoutBoard).observe(boardWrap);
addEventListener('resize', () => { wheel.close(); layoutBoard(); if (screen === 'home') layoutHome(); });

function renderGame() {
  if (!game) return;
  const { g, values, selected } = game;
  const { showErrors, highlightSame } = store.settings;
  // Enquanto o dedo passa por um número da roda, o tabuleiro mostra onde ele já está.
  const selVal = preview || (selected >= 0 ? values[selected] : 0);
  for (let i = 0; i < g.cells; i++) {
    const el = cellEls[i];
    const v = values[i];
    const given = game.isGiven(i);
    const peer = selected >= 0 && i !== selected && (g.rowOf[i] === g.rowOf[selected] || g.colOf[i] === g.colOf[selected] || g.boxOf[i] === g.boxOf[selected]);
    el.classList.toggle('given', given);
    el.classList.toggle('user', !given && v > 0);
    el.classList.toggle('selected', i === selected);
    el.classList.toggle('peer', peer);
    el.classList.toggle('same', highlightSame && selVal > 0 && v === selVal && i !== selected);
    el.classList.toggle('wrong', showErrors && game.isWrong(i));
    const html = v ? `<span class="v">${v}</span>` : '';
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  }
  let open = 0, filled = 0;
  for (let i = 0; i < g.cells; i++) if (!game.isGiven(i)) { open++; if (values[i]) filled++; }
  $('#game-progress').style.setProperty('--p', open ? filled / open : 1);
  $('#btn-undo').disabled = game.done || !game.history.length;
  renderTimer();
}

function renderTimer() {
  const s = Math.floor(game.elapsed / 1000);
  $('#game-timer').innerHTML = `${iconHTML('clock')} ${fmtTime(s)}`;
}

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const mm = String(m).padStart(2, '0'), sss = String(ss).padStart(2, '0');
  return h ? `${h}:${mm}:${sss}` : `${mm}:${sss}`;
}

function startTimer() {
  stopTimer();
  if (!game || game.done) return;
  paused = false;
  $('#board').classList.remove('paused');
  lastTick = performance.now();
  tickTimer = setInterval(() => {
    const now = performance.now();
    game.elapsed += now - lastTick;
    lastTick = now;
    renderTimer();
    if (Math.floor(game.elapsed / 1000) % 10 === 0) persist();
  }, 1000);
}

function stopTimer() {
  if (tickTimer && game) game.elapsed += performance.now() - lastTick;
  clearInterval(tickTimer);
  tickTimer = null;
}

function select(i) {
  if (!game || paused) return;
  if (game.selected !== i) sfx.tap();
  game.selected = i;
  renderGame();
}

// ---------- Roda de números ----------
let preview = 0;
const wheel = new Wheel({
  onPick: (d) => { wheel.close(); press(d); },
  onErase: () => { wheel.close(); useTool('erase'); },
  onHover: (d, pressing) => {
    preview = d;
    if (d && pressing) sfx.hover();
    renderGame();
  },
});

// Casa vazia ou preenchida por você abre a roda; casa fixa só destaca os números iguais.
function tapCell(i, e) {
  if (!game || paused || game.done) return;
  if (game.isGiven(i)) { wheel.close(); select(i); return; }
  game.selected = i;
  const v = game.values[i];
  const disabled = new Set();
  for (let d = 1; d <= game.n; d++) if (d !== v && game.digitComplete(d)) disabled.add(d);
  wheel.open(cellEls[i].getBoundingClientRect(), { n: game.n, px: artPx(), disabled, current: v, canErase: v > 0 });
  wheel.grab(e, 'open');
  sfx.wheel();
  renderGame();
}

function press(d) {
  if (!game || paused || game.done) return;
  handle(game.input(d));
}

function handle(r) {
  if (r.type === 'none') return;
  persist();
  renderGame();
  const el = cellEls[r.cell];
  if (r.type === 'erase') sfx.erase();
  else if (r.type === 'undo') sfx.undo();
  else if (r.type === 'error') {
    if (store.settings.showErrors) {
      sfx.error();
      restartAnim(el, 'shake');
      if (store.settings.vibrate) navigator.vibrate?.(60);
    } else { sfx.place(); restartAnim(el, 'pop'); }
  } else if (r.type === 'place') {
    sfx.place();
    restartAnim(el, 'pop');
    if (r.units.length && !r.won) {
      setTimeout(sfx.unit, 90);
      flashCells(new Set(r.units.flat()), r.cell);
    }
  }
  if (r.won) onWin();
  else if (game.isFull() && !store.settings.showErrors) toast('Hmm... algo não bate. Confira!');
}

// A classe e o @keyframes têm o mesmo nome; filtra pelo nome porque o
// animationend das animações filhas (ex.: pop do dígito) também sobe até a célula.
function restartAnim(el, cls, onEnd) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  const done = (e) => {
    if (e.animationName !== cls) return;
    el.classList.remove(cls);
    el.removeEventListener('animationend', done);
    onEnd?.();
  };
  el.addEventListener('animationend', done);
}

function flashCells(cells, origin) {
  const { g } = game;
  for (const i of cells) {
    const dist = Math.abs(g.rowOf[i] - g.rowOf[origin]) + Math.abs(g.colOf[i] - g.colOf[origin]);
    const el = cellEls[i];
    el.style.animationDelay = `${dist * 35}ms`;
    restartAnim(el, 'flash', () => { el.style.animationDelay = ''; });
  }
}

function useTool(tool) {
  if (!game || paused || game.done) return;
  if (tool === 'undo') handle(game.undo());
  if (tool === 'erase') handle(game.erase());
}

// Toque imediato (pointerdown) para o tabuleiro e controles responderem rápido.
const board = $('#board');
board.addEventListener('pointerdown', (e) => {
  const c = e.target.closest('.cell');
  if (!c) return;
  e.preventDefault();
  unlockAudio();
  tapCell(+c.dataset.i, e);
});
board.addEventListener('contextmenu', (e) => e.preventDefault());
// Tocar fora da roda (e fora do tabuleiro) fecha a roda; o toque segue para o botão tocado.
document.addEventListener('pointerdown', (e) => {
  if (wheel.isOpen && !wheel.el.contains(e.target) && !board.contains(e.target)) wheel.close();
}, true);

$('#btn-undo').append(icon('undo'));
$('#btn-undo').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  useTool('undo');
});

// Efeito de "afundar" dos botões também no toque do iPad.
document.addEventListener('pointerdown', (e) => e.target.closest?.('.btn')?.classList.add('is-pressed'), true);
const release = () => document.querySelectorAll('.is-pressed').forEach((b) => b.classList.remove('is-pressed'));
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(ev, release, true);

$('#btn-pause').append(icon('pause'));
$('#btn-pause').addEventListener('click', () => { sfx.click(); openPause(); });

function openPause() {
  if (!game || game.done) return;
  wheel.close();
  stopTimer();
  paused = true;
  $('#board').classList.add('paused');
  persist();
  modal({
    title: 'PAUSA',
    kicker: `NÍVEL ${game.level} · ${fmtTime(Math.floor(game.elapsed / 1000))}`,
    buttons: [
      { label: 'CONTINUAR', cls: 'btn-primary', icon: 'play', action: resume },
      { label: 'REINICIAR', icon: 'restart', action: confirmRestart },
      { label: 'AJUSTES', icon: 'gear', action: () => openSettings(openPause) },
      { label: 'INÍCIO', icon: 'home', action: () => { closeModal(); goHome(); } },
    ],
    onBack: resume,
  });
}

function resume() {
  closeModal();
  if (screen === 'game' && game && !game.done) { renderGame(); startTimer(); }
}

function confirmRestart() {
  modal({
    title: 'REINICIAR?',
    text: 'Você perde o que já preencheu neste nível.',
    buttons: [
      { label: 'REINICIAR', cls: 'btn-red', action: () => { store.current = null; save(); startLevel(game.level); } },
      { label: 'CANCELAR', action: openPause },
    ],
    onBack: openPause,
  });
}

function goHome() {
  wheel.close();
  stopTimer();
  persist();
  closeModal();
  renderHome();
  show('home');
}

// ---------- Vitória ----------
function onWin() {
  stopTimer();
  const level = game.level;
  const { progress } = store;
  const firstClear = progress.unlocked <= level;
  progress.unlocked = Math.max(progress.unlocked, level + 1);
  store.current = null;
  save();
  ready.delete(level);

  const all = new Set(game.values.map((_, i) => i));
  flashCells(all, game.selected >= 0 ? game.selected : 0);
  sfx.win();
  setTimeout(confetti, 250);

  const w = worldOf(level);
  const worldDone = Number.isFinite(w.levels) && level === w.last && firstClear;
  const next = WORLDS[w.index + 1];
  setTimeout(() => {
    modal({
      kicker: `NÍVEL ${level} · ${fmtTime(Math.floor(game.elapsed / 1000))}`,
      title: worldDone ? 'MUNDO COMPLETO!' : 'NÍVEL COMPLETO!',
      html: `
        ${worldDone ? `<div class="trophy">${iconHTML('trophy')}</div>` : ''}
        ${worldDone && next ? `<p>Desbloqueado: <b>${next.name.toUpperCase()}</b> (${next.br * next.bc}x${next.br * next.bc})</p>` : ''}`,
      buttons: [
        { label: 'PRÓXIMO', cls: 'btn-primary', icon: 'play', action: () => startLevel(level + 1) },
        { label: 'NÍVEIS', icon: 'map', action: () => { closeModal(); openMap(); } },
      ],
      onBack: () => { closeModal(); openMap(); },
    });
  }, 900);
}

// Confete pixelado.
const fx = $('#fx');
function confetti() {
  const ctx = fx.getContext('2d');
  const W = 160, H = Math.round(160 * innerHeight / innerWidth);
  fx.width = W; fx.height = H;
  const colors = [PAL.y, PAL.o, PAL.r, PAL.l, PAL.c, PAL.a, PAL.w];
  const parts = Array.from({ length: 90 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 30, y: H * 0.45,
    vx: (Math.random() - 0.5) * 3.2, vy: -1.5 - Math.random() * 3,
    c: colors[Math.floor(Math.random() * colors.length)], s: Math.random() < 0.3 ? 2 : 1,
  }));
  let frames = 0;
  const step = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.09; p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    if (++frames < 150) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, W, H);
  };
  step();
}

// ---------- Ajustes ----------
const SETTINGS = [
  { key: 'sound', label: 'SOM' },
  { key: 'showErrors', label: 'MOSTRAR ERROS' },
  { key: 'highlightSame', label: 'DESTACAR IGUAIS' },
  { key: 'vibrate', label: 'VIBRAR NO ERRO', only: () => 'vibrate' in navigator },
];

function openSettings(back) {
  const onBack = back || closeModal;
  const p = modal({
    title: 'AJUSTES',
    html: '<div class="settings-list"></div>',
    buttons: [
      { label: 'OK', cls: 'btn-primary', action: onBack },
      { label: 'APAGAR PROGRESSO', cls: 'btn-red', action: () => confirmReset(() => openSettings(back)) },
    ],
    footer: `<div class="version">PIXEL SUDOKU v${VERSION}</div>`,
    onBack,
  });
  const list = p.querySelector('.settings-list');
  for (const s of SETTINGS) {
    if (s.only && !s.only()) continue;
    const b = document.createElement('button');
    const paint = () => {
      const on = store.settings[s.key];
      b.className = `btn toggle${on ? ' on' : ''}`;
      b.innerHTML = `<span>${s.label}</span><span class="switch">${on ? 'ON' : 'OFF'}</span>`;
    };
    paint();
    b.addEventListener('click', () => {
      store.settings[s.key] = !store.settings[s.key];
      save();
      setSound(store.settings.sound);
      unlockAudio();
      sfx.click();
      paint();
      if (game) renderGame();
    });
    list.append(b);
  }
}

function confirmReset(back) {
  modal({
    title: 'APAGAR TUDO?',
    text: 'Os níveis desbloqueados serão apagados.',
    buttons: [
      { label: 'APAGAR', cls: 'btn-red', action: () => { resetProgress(); game = null; ready.clear(); closeModal(); renderHome(); show('home'); toast('Progresso apagado.'); } },
      { label: 'CANCELAR', action: back },
    ],
    onBack: back,
  });
}

// ---------- Modal e aviso ----------
let modalBack = null;
function modal({ title, kicker, text, html, buttons = [], footer = '', onBack }) {
  wheel.close();
  const panel = $('#panel');
  panel.innerHTML = `
    ${kicker ? `<div class="kicker">${kicker}</div>` : ''}
    ${title ? `<h2>${title}</h2>` : ''}
    ${text ? `<p>${text}</p>` : ''}
    ${html || ''}
    <div class="panel-buttons"></div>
    ${footer}`;
  const row = panel.querySelector('.panel-buttons');
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = `btn ${b.cls || ''}`;
    // ícones brancos somem em botões claros: pinta o miolo de cinza-azulado
    if (b.icon) el.append(icon(b.icon, { recolor: { w: PAL.d } }));
    el.append(document.createTextNode(b.label));
    el.addEventListener('click', () => { sfx.click(); b.action(); });
    row.append(el);
  }
  modalBack = onBack || null;
  modalOpen = true;
  $('#overlay').hidden = false;
  panel.style.animation = 'none';
  void panel.offsetWidth;
  panel.style.animation = '';
  return panel;
}

function closeModal() {
  $('#overlay').hidden = true;
  modalOpen = false;
  modalBack = null;
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------- Teclado (para testar no computador) ----------
addEventListener('keydown', (e) => {
  if (modalOpen) {
    if (e.key === 'Escape' && modalBack) modalBack();
    return;
  }
  if (screen !== 'game' || !game) return;
  const { n } = game;
  const k = e.key.toLowerCase();
  if (k === 'escape' && wheel.isOpen) { wheel.close(); e.preventDefault(); return; }
  if (/^[1-9]$/.test(k) && +k <= n) press(+k);
  else if (k === 'backspace' || k === 'delete' || k === '0') useTool('erase');
  else if (k === 'z') useTool('undo');
  else if (k === 'escape' || k === 'p') openPause();
  else if (k.startsWith('arrow')) {
    const i = Math.max(0, game.selected);
    let r = Math.floor(i / n), c = i % n;
    if (k === 'arrowup') r = (r + n - 1) % n;
    if (k === 'arrowdown') r = (r + 1) % n;
    if (k === 'arrowleft') c = (c + n - 1) % n;
    if (k === 'arrowright') c = (c + 1) % n;
    select(r * n + c);
  } else return;
  wheel.close();
  e.preventDefault();
});

// ---------- Ciclo de vida do app ----------
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (tickTimer) { stopTimer(); persist(); game._autoPaused = true; }
  } else if (game?._autoPaused) {
    game._autoPaused = false;
    if (screen === 'game' && !paused && !modalOpen) startTimer();
  }
});
addEventListener('pagehide', () => { stopTimer(); persist(); });

// Botão "voltar" do Android: fecha modal / pausa / volta ao início.
history.replaceState({ base: true }, '');
addEventListener('popstate', () => {
  if (screen === 'home' && !modalOpen) return;
  history.pushState({ trap: true }, '');
  if (modalOpen) { if (modalBack) modalBack(); return; }
  if (wheel.isOpen) { wheel.close(); return; }
  if (screen === 'game') openPause();
  else goHome();
});

// Evita zoom por pinça no iOS.
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Em localhost o service worker fica desligado (para ver edições na hora); use ?sw para testar.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw');
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isLocal) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

renderHome();
document.fonts?.ready.then(layoutHome);
getPuzzle(store.current ? store.current.level + 1 : store.progress.unlocked);
