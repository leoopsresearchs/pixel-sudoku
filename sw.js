// Service worker: guarda o jogo todo no aparelho para funcionar offline.
// Ao publicar uma versão nova, mude CACHE para o navegador baixar os arquivos de novo.
const CACHE = 'pxsudoku-v1';
const FONT_CACHE = 'pxsudoku-fonts';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/game.js',
  'js/sudoku.js',
  'js/levels.js',
  'js/rng.js',
  'js/storage.js',
  'js/scenes.js',
  'js/sprites.js',
  'js/audio.js',
  'js/worker.js',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Fonte pixel do Google Fonts: guarda na primeira vez que carregar online.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok || res.type === 'opaque') await cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;
  // Cache primeiro; se faltar algo, busca na rede e guarda.
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
