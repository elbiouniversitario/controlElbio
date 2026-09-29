// Service worker de Elbio LUD: permite instalar la app y abrirla sin conexión.
// - Páginas: primero la red (para tener siempre la última versión); sin red, la copia guardada.
// - Archivos de la app (/assets, íconos) y fuentes de Google: copia guardada, actualizada en segundo plano.
// - Supabase y cualquier otra API: nunca se guardan, siempre van a la red.
const CACHE = 'elbio-lud-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const esFuente = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mismoOrigen = url.origin === self.location.origin;

  if (req.mode === 'navigate' && mismoOrigen) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if ((mismoOrigen && !url.pathname.startsWith('/api/')) || esFuente(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const guardada = await cache.match(req);
        const red = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => guardada);
        return guardada || red;
      })
    );
  }
});
