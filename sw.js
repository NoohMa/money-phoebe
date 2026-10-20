/* Money money-v3.6 - PWA 更新與離線快取 */
const CACHE = 'money-v3.6|' + self.registration.scope;
const OPTIONAL = ['./config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|cdnjs\.cloudflare\.com\/ajax\/libs\/)/;
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.add(new Request('./index.html', {cache:'reload'}));
    await Promise.allSettled(OPTIONAL.map(async path => {
      const req = new Request(path, {cache:'reload'});
      const res = await fetch(req);
      if (res.ok) await c.put(req,res);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k.endsWith('|' + self.registration.scope)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req, {cache:'no-cache'});
        if (res.ok) await c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req, {ignoreSearch:true});
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const home = await c.match('./index.html');
          if (home) return home;
        }
        return Response.error();
      }
    })());
  } else if (CDN.test(url.href)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') await c.put(req,res.clone());
      return res;
    })());
  }
});
