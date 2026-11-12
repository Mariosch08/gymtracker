// Sofort aus dem Cache starten (auch bei schlechtem Empfang), im Hintergrund aktualisieren.
// Findet sich eine neue Version, meldet die App «Neue Version verfügbar».
const CACHE = 'gym-tracker-v5', IMG = 'gym-tracker-img';
const FILES = ['./', './index.html', './exercises.js', './fit.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const tell = msg => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage(msg)));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Bilder: einmal geladen, immer aus dem Cache
  if (url.pathname.includes('/img/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(IMG).then(c => c.put(e.request, cp)); }
      return r;
    })));
    return;
  }
  // App-Dateien: Cache zuerst, parallel frisch holen und Cache erneuern
  const nav = e.request.mode === 'navigate';
  const key = nav ? './index.html' : e.request;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key, { ignoreSearch: true });
    const old = hit && hit.clone();
    const fresh = fetch(nav ? './index.html' : e.request.url, { cache: 'no-cache' }).then(async r => {
      if (!r.ok) return r;
      let changed = false;
      if (old && (nav || /\.(js|html)$/.test(url.pathname))) {
        const [a, b] = await Promise.all([old.text(), r.clone().text()]);
        changed = a !== b;
      }
      await cache.put(key, r.clone());
      // Kurz warten, bis die Seite bereit ist, dann das Update melden
      if (changed) { await new Promise(res => setTimeout(res, 2500)); await tell({ type: 'update' }); }
      return r;
    });
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh.catch(() => cache.match('./index.html'));
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
