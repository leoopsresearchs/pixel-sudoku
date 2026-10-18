// Service worker: guarda o jogo todo no aparelho para funcionar offline.
// Ao publicar uma versão nova, mude CACHE para o navegador baixar os arquivos de novo.
const CACHE = 'pxsudoku-v10';
const FONT_CACHE = 'pxsudoku-fonts';
// Mesmo endereço do <link> de fontes no index.html.
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&display=swap';
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

// Baixa as fontes já na instalação: na primeira visita a página ainda não passa
// pelo service worker, então sem isso elas só ficariam guardadas na segunda.
async function cacheFonts() {
  try {
    const cache = await caches.open(FONT_CACHE);
    const res = await fetch(FONT_CSS);
    if (!res.ok) return;
    const css = await res.clone().text();
    await cache.put(FONT_CSS, res);
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
    await Promise.all(urls.map((u) => fetch(u).then((r) => r.ok && cache.put(u, r))));
  } catch { /* sem rede: o jogo usa a fonte do sistema até a próxima visita online */ }
}

// cache: 'reload' busca cada arquivo direto do servidor, sem passar pelo cache HTTP do
// navegador: assim uma versão nova nunca é instalada com arquivos da versão anterior.
self.addEventListener('install', (e) => {
  const fresh = ASSETS.map((url) => new Request(url, { cache: 'reload' }));
  e.waitUntil(
    Promise.all([caches.open(CACHE).then((c) => c.addAll(fresh)), cacheFonts()])
      .then(() => self.skipWaiting())
  );
});

// Apaga só as versões antigas do próprio Sudoku: outros jogos publicados no mesmo
// site (leoopsresearchs.github.io) dividem o mesmo Cache Storage.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('pxsudoku-') && k !== CACHE && k !== FONT_CACHE)
        .map((k) => caches.delete(k))))
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
        const hit = await cache.match(request, { ignoreVary: true });
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
