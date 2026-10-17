// Roda de números: abre em volta da casa tocada, no lugar do teclado numérico.
// Dá para tocar na casa e depois no número, ou segurar a casa e arrastar até o
// número (soltar escolhe; soltar fora da roda cancela). A roda só mostra os números
// que cabem na casa, mas cada um fica sempre no mesmo ângulo, como num relógio,
// para a mão decorar o caminho.
import { icon } from './sprites.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Centraliza quando não cabe (lo > hi).
const fit = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : clamp(v, lo, hi));

export class Wheel {
  constructor({ onPick, onErase, onHover, onClose }) {
    this.cb = { onPick, onErase, onHover, onClose };
    this.el = document.createElement('div');
    this.el.className = 'wheel';
    this.el.hidden = true;
    this.disc = document.createElement('canvas');
    this.disc.className = 'wheel-disc pixelated';
    this.el.append(this.disc);
    document.body.append(this.el);

    this.isOpen = false;
    this.press = null;
    this.hot = null; // 'center', um número ou null
    this.items = [];
    this.eraseBtn = null;

    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.grab(e, 'wheel');
    });
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('pointermove', (e) => this.move(e));
    addEventListener('pointerup', (e) => this.up(e));
    addEventListener('pointercancel', (e) => {
      if (this.press?.id !== e.pointerId) return;
      this.press = null;
      this.setHot(null);
    });
  }

  // rect: casa na tela; px: tamanho do "pixel de arte"; digits: números que aparecem na roda.
  open(rect, { n, px, digits, current = 0, canErase = false }) {
    this.close(true);
    // gap conta a borda pixelada (1 px de arte de cada lado e 2 embaixo).
    const s = px * 15;
    const gap = px * 4;
    const inner = clamp(rect.width / 2, s * 0.55, s * 0.85);
    const R = Math.max((s + gap) / (2 * Math.sin(Math.PI / n)), inner + s / 2 + gap);
    const art = Math.ceil((R + s / 2 + gap) / px);
    const outer = art * px;
    const margin = px * 2;
    const rx = rect.left + rect.width / 2, ry = rect.top + rect.height / 2;
    const cx = fit(rx, outer + margin, innerWidth - outer - margin);
    const cy = fit(ry, outer + margin, innerHeight - outer - margin);
    // Perto da borda a roda entra na tela e sai de cima da casa: aí o furo do meio
    // mostraria a casa vizinha, então o centro vira uma miniatura da casa escolhida.
    const shifted = Math.hypot(cx - rx, cy - ry) > 1;
    Object.assign(this, { n, px, cx, cy, inner, outer, digits, canErase, isOpen: true });
    this.slop = Math.max(px * 4, R * 0.45);

    const el = this.el;
    el.style.left = `${cx - outer}px`;
    el.style.top = `${cy - outer}px`;
    el.style.width = el.style.height = `${outer * 2}px`;
    el.style.setProperty('--s', `${s}px`);
    drawDisc(this.disc, art, shifted ? 0 : inner / px);

    for (const d of digits) {
      const a = (d - 1) / n * TAU - Math.PI / 2;
      const x = Math.cos(a) * R, y = Math.sin(a) * R;
      const b = document.createElement('div');
      b.className = `btn wheel-item${d === current ? ' cur' : ''}`;
      b.innerHTML = `<span>${d}</span>`;
      b.style.left = `${outer + x - s / 2}px`;
      b.style.top = `${outer + y - s / 2}px`;
      b.style.setProperty('--fx', `${-x}px`);
      b.style.setProperty('--fy', `${-y}px`);
      b.style.setProperty('--k', this.items.length);
      b.dataset.d = d;
      el.append(b);
      this.items.push(b);
    }
    if (canErase) {
      const e = document.createElement('div');
      const es = Math.min(s * 0.85, inner * 2 - gap);
      e.className = 'btn btn-red wheel-erase';
      e.style.setProperty('--s', `${es}px`);
      e.style.left = e.style.top = `${outer - es / 2}px`;
      e.append(icon('eraser'));
      el.append(e);
      this.eraseBtn = e;
    } else if (shifted) {
      const m = document.createElement('div');
      const ms = Math.min(rect.width, inner * 2 - gap);
      m.className = 'wheel-cell';
      m.style.width = m.style.height = `${ms}px`;
      m.style.left = m.style.top = `${outer - ms / 2}px`;
      el.append(m);
    }
    el.hidden = false;
  }

  close(silent = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.press = null;
    this.el.hidden = true;
    for (const c of [...this.el.children]) if (c !== this.disc) c.remove();
    this.items = [];
    this.eraseBtn = null;
    this.setHot(null);
    if (!silent) this.cb.onClose?.();
  }

  // O que está sob o ponto: 'center', um número ou null. O alvo de cada número é a
  // fatia da roda (não só o botão) e cresce sobre as fatias vazias vizinhas.
  zoneAt(x, y) {
    const dx = x - this.cx, dy = y - this.cy;
    const r = Math.hypot(dx, dy);
    if (r < this.inner) return 'center';
    if (r > this.outer) return null;
    const step = TAU / this.n;
    const a = (Math.atan2(dy, dx) + Math.PI / 2 + TAU) % TAU;
    let best = null, bestGap = step;
    for (const d of this.digits) {
      const gap = Math.abs(a - (d - 1) * step);
      const dist = Math.min(gap, TAU - gap);
      if (dist <= bestGap) { best = d; bestGap = dist; }
    }
    return best;
  }

  // kind 'open': o toque que abriu a roda; só escolhe depois de arrastar para longe da casa.
  grab(e, kind) {
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, kind, armed: kind === 'wheel' };
    if (this.press.armed) this.track(e);
  }

  move(e) {
    if (!this.isOpen) return;
    const p = this.press;
    if (!p) {
      if (e.pointerType === 'mouse') this.track(e);
      return;
    }
    if (p.id !== e.pointerId) return;
    if (!p.armed && Math.hypot(e.clientX - p.x, e.clientY - p.y) > this.slop) p.armed = true;
    if (p.armed) this.track(e);
  }

  up(e) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    this.press = null;
    if (!this.isOpen || !p.armed) return; // só tocou na casa: a roda fica aberta esperando o número
    const z = this.zoneAt(e.clientX, e.clientY);
    if (typeof z === 'number') this.cb.onPick(z);
    else if (z === 'center') {
      // Arrastar de volta ao centro desiste; tocar no centro apaga (ou fecha, se não há o que apagar).
      if (p.kind === 'open') this.setHot(null);
      else if (this.canErase) this.cb.onErase();
      else this.close();
    } else this.close();
  }

  track(e) { this.setHot(this.zoneAt(e.clientX, e.clientY)); }

  setHot(z) {
    if (z === 'center' && !this.canErase) z = null;
    if (z === this.hot) return;
    this.hot = z;
    for (const b of this.items) b.classList.toggle('hot', +b.dataset.d === z);
    this.eraseBtn?.classList.toggle('hot', z === 'center');
    this.cb.onHover?.(typeof z === 'number' ? z : 0, !!this.press);
  }
}

// Disco pixelado (anel com furo no meio para a casa escolhida aparecer).
function drawDisc(canvas, r, hole) {
  const size = r * 2;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const put = (i, [cr, cg, cb], a) => { img.data.set([cr, cg, cb, a], i * 4); };
  const INK = [26, 28, 44], EDGE = [51, 60, 87];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      const i = y * size + x;
      if (d > r || d < hole) continue;
      if (d > r - 1 || (hole && d < hole + 1)) put(i, INK, 255);
      else if (d > r - 2) put(i, EDGE, 235);
      else put(i, INK, (x + y) % 2 ? 215 : 175);
    }
  }
  ctx.putImageData(img, 0, 0);
}
