// Service worker: app-bestanden en de laatst geladen evenementen offline beschikbaar. Opslag (Supabase) gaat er nooit doorheen.
const CACHE = 'cletos-v2';
const APP = ['./', './index.html', './styles.css', './app.js', './logica.js', './opslag.js', './taal.js', './manifest.webmanifest', './icoon.svg', './icoon-180.png', './icoon-192.png', './icoon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/mock/') || url.pathname.endsWith('/config.js')) return;
  // Netwerk eerst, val terug op cache (data én app-bestanden).
  e.respondWith(fetch(e.request).then(r => { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return r; }).catch(() => caches.match(e.request)));
});
