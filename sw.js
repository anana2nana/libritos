// Service Worker del Atlas de lecturas.
// Estrategia: "stale-while-revalidate" solo para los archivos propios de la app
// (HTML, manifest, iconos). Las peticiones a Firebase/Google nunca se interceptan:
// eso lo gestiona la propia caché offline de Firestore.
//
// Importante: cuando vuelvas a subir una versión nueva de index.html a Vercel,
// sube también este archivo cambiando CACHE_NAME (p. ej. 'atlas-lecturas-v2'),
// o el móvil seguirá viendo la versión antigua cacheada durante un tiempo.
const CACHE_NAME = 'atlas-lecturas-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        APP_SHELL.map(url =>
          cache.add(url).catch(err => console.warn('No se pudo cachear', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // no tocar Firebase, Google Fonts, etc.

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
