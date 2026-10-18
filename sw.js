const V = 'money-v2.4|' + self.registration.scope;
const CORE = ['./', './index.html', './config.js', './carrier.html', './manifest.webmanifest', './carrier.webmanifest', './icon-192.png', './icon-512.png', './icon-carrier-192.png'];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|cdnjs\.cloudflare\.com\/ajax\/libs\/)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.endsWith('|' + self.registration.scope)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // 先給快取（離線可開），同時背景抓新版，下次開啟就是新版
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(req, {ignoreSearch: true});
      const net = fetch(req, {cache: 'no-cache'}).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  } else if (CDN.test(url.href)) {
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
});
