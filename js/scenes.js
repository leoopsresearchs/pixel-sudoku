// Cenário de fundo em baixa resolução (ampliado com pixels nítidos), um por mundo.
import { mulberry32 } from './rng.js';

const SCENES = {
  meadow:    { sky: ['#41a6f6', '#73eff7'], sun: '#ffcd75', clouds: true, far: '#38b764', near: '#a7f070', deco: 'flowers' },
  forest:    { sky: ['#3b5dc9', '#41a6f6', '#73eff7'], sun: '#f4f4f4', clouds: true, far: '#257179', near: '#38b764', deco: 'pines' },
  hills:     { sky: ['#73eff7', '#f4f4f4'], sun: '#ffcd75', clouds: true, far: '#a7f070', near: '#38b764', deco: 'flowers' },
  mountains: { sky: ['#29366f', '#3b5dc9', '#41a6f6'], sun: '#f4f4f4', clouds: true, far: '#566c86', near: '#333c57', deco: 'peaks' },
  dusk:      { sky: ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'], sun: '#ffcd75', bigSun: true, far: '#5d275d', near: '#29366f', deco: 'pines' },
  night:     { sky: ['#1a1c2c', '#29366f', '#333c57'], moon: true, stars: true, far: '#333c57', near: '#1a1c2c', deco: 'pines' },
  cosmos:    { sky: ['#1a1c2c', '#5d275d', '#29366f'], moon: true, stars: true, aurora: true, far: '#29366f', near: '#1a1c2c', deco: 'peaks' },
};

const W = 160;

export class Backdrop {
  constructor(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reducedMotion = reducedMotion;
    this.scene = SCENES.meadow;
    this.t = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    this.start();
  }

  set(name) {
    if (this.scene === SCENES[name]) return;
    this.scene = SCENES[name] || SCENES.meadow;
    this.build();
    this.draw();
  }

  resize() {
    const aspect = innerHeight / innerWidth;
    this.canvas.width = W;
    this.canvas.height = Math.max(90, Math.round(W * aspect));
    this.build();
    this.draw();
  }

  build() {
    const rng = mulberry32(42);
    const H = this.canvas.height;
    this.stars = Array.from({ length: 60 }, () => ({ x: rng() * W, y: rng() * H * 0.7, p: rng() * 6 }));
    this.clouds = Array.from({ length: 5 }, (_, i) => ({ x: rng() * W, y: 6 + rng() * H * 0.35, s: 0.04 + rng() * 0.06, w: 12 + Math.floor(rng() * 14), i }));
    const ridge = (base, amp, freq, seed) => {
      const r = mulberry32(seed);
      const ph = r() * 10, ph2 = r() * 10;
      return Array.from({ length: W }, (_, x) => Math.round(base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.7 + ph2) * amp * 0.4));
    };
    const peaks = this.scene.deco === 'peaks';
    this.farRidge = peaks
      ? Array.from({ length: W }, (_, x) => Math.round(H * 0.62 - Math.abs(((x + 17) % 46) - 23) * 1.4 - (x % 92 < 46 ? 6 : 0)))
      : ridge(H * 0.7, 5, 0.06, 7);
    this.nearRidge = ridge(H * 0.84, 3, 0.09, 11);
    const r = mulberry32(5);
    this.decos = Array.from({ length: 16 }, () => ({ x: Math.floor(r() * W), h: 6 + Math.floor(r() * 8), c: r() }));
  }

  start() {
    if (this.timer || this.reducedMotion || document.hidden) return;
    this.timer = setInterval(() => { this.t++; this.draw(); }, 140);
  }

  stop() { clearInterval(this.timer); this.timer = null; }

  setReducedMotion(reduced) {
    this.reducedMotion = reduced;
    if (reduced) this.stop();
    else this.start();
  }

  draw() {
    const { ctx, scene: s } = this;
    const H = this.canvas.height;
    // Céu em faixas com transição pontilhada.
    const band = Math.ceil(H / s.sky.length);
    s.sky.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * band, W, band + 1); });
    for (let i = 1; i < s.sky.length; i++) {
      ctx.fillStyle = s.sky[i];
      const y0 = i * band - 4;
      for (let y = y0; y < y0 + 4; y++) for (let x = (y % 2); x < W; x += 2 + (y - y0 < 2 ? 2 : 0)) ctx.fillRect(x, y, 1, 1);
    }
    if (s.aurora) {
      for (let x = 0; x < W; x++) {
        const y = Math.round(H * 0.18 + Math.sin(x * 0.08 + this.t * 0.05) * 6);
        ctx.fillStyle = x % 3 ? '#38b764' : '#a7f070';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, 1, 10 + Math.round(Math.sin(x * 0.2) * 3));
        ctx.globalAlpha = 1;
      }
    }
    if (s.stars) {
      for (const st of this.stars) {
        const on = (Math.floor(this.t / 3 + st.p) % 6) !== 0;
        if (!on) continue;
        ctx.fillStyle = st.p > 4 ? '#ffcd75' : '#f4f4f4';
        ctx.fillRect(Math.floor(st.x), Math.floor(st.y), 1, 1);
      }
    }
    // Sol / lua.
    if (s.moon) this.disc(W * 0.78, H * 0.16, 7, '#f4f4f4', '#94b0c2');
    else if (s.bigSun) this.disc(W * 0.5, H * 0.66, 18, s.sun, '#ef7d57');
    else this.disc(W * 0.8, H * 0.13, 7, s.sun, s.sun === '#f4f4f4' ? '#94b0c2' : '#ef7d57');
    if (s.clouds) for (const c of this.clouds) this.cloud(((c.x + this.t * c.s) % (W + 40)) - 20, c.y, c.w);
    // Relevo distante.
    ctx.fillStyle = s.far;
    this.farRidge.forEach((y, x) => ctx.fillRect(x, y, 1, H - y));
    if (s.deco === 'peaks') {
      ctx.fillStyle = '#f4f4f4';
      this.farRidge.forEach((y, x) => { if (y < H * 0.62 - 26) ctx.fillRect(x, y, 1, 3); });
    }
    // Relevo próximo + decorações.
    ctx.fillStyle = s.near;
    this.nearRidge.forEach((y, x) => ctx.fillRect(x, y, 1, H - y));
    for (const d of this.decos) {
      const gy = this.nearRidge[d.x];
      if (s.deco === 'pines') this.pine(d.x, gy, d.h, s.near);
      else if (s.deco === 'flowers') {
        ctx.fillStyle = d.c > 0.5 ? '#ffcd75' : '#f4f4f4';
        ctx.fillRect(d.x, gy + 2, 1, 1);
        ctx.fillStyle = '#b13e53';
        if (d.c > 0.8) ctx.fillRect(d.x + 3, gy + 4, 1, 1);
      }
    }
  }

  disc(cx, cy, r, color, shade) {
    const { ctx } = this;
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      ctx.fillStyle = y > r / 3 ? shade : color;
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
  }

  cloud(x, y, w) {
    const { ctx } = this;
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x + 3, y - 2, w - 7, 2);
    ctx.fillRect(x + 6, y - 4, Math.max(4, w - 14), 2);
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(x + 1, y + 3, w - 2, 1);
  }

  pine(x, groundY, h, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    for (let j = 0; j < h; j++) {
      const half = Math.floor((j % 4) + j / 3) >> 1;
      ctx.fillRect(x - half, groundY - h + j, half * 2 + 1, 1);
    }
  }
}
