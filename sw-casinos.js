// Service worker de casinos.html: permite instalarla como app y abrirla
// sin conexión. Solo controla casinos.html (la página vieja no se toca).
//  - la página y sus archivos: primero la red (así siempre llega la última
//    versión) y, si no hay conexión, la copia guardada;
//  - librerías y tipografías externas: la copia guardada, y se actualiza
//    por detrás;
//  - la base de datos de Firebase no pasa por acá.
const CACHE = 'casinos-v2';
const ARCHIVOS = [
  'casinos.html',
  'manifest-casinos.json',
  'icon-casinos-192.png',
  'icon-casinos-512.png',
  'apple-touch-icon-casinos.png'
];
const EXTERNOS = ['cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('casinos-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const nombre = url.pathname.split('/').pop();
    if (!ARCHIVOS.includes(nombre)) return;
    ev.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(nombre, copia));
        }
        return res;
      }).catch(() => caches.match(nombre))
    );
    return;
  }

  if (EXTERNOS.includes(url.hostname)) {
    ev.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(guardada => {
        const red = fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') c.put(req, res.clone());
          return res;
        }).catch(() => guardada);
        return guardada || red;
      }))
    );
  }
});
