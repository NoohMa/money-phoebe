/* Money V3.2 - Service Worker */
const V = 'money-v3.2|' + self.registration.scope;
const CORE = ['./index.html'];
const OPTIONAL = ['./config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|cdnjs\.cloudflare\.com\/ajax\/libs\/)/;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(V);
    // 主頁是必要檔案；其他檔案缺少時不得導致整個 SW 安裝失敗。
    await cache.addAll(CORE.map(path => new Request(path, {cache:'reload'})));
    await Promise.allSettled(OPTIONAL.map(async path => {
      const req = new Request(path, {cache:'reload'});
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== V && key.startsWith('money-') && key.endsWith('|' + self.registration.scope)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // 網路優先：上線後立即取得新版；斷網才回退至上次成功快取。
    event.respondWith((async () => {
      const cache = await caches.open(V);
      try {
        const res = await fetch(req, {cache:'no-cache'});
        if (res.ok) await cache.put(req, res.clone());
        return res;
      } catch (_) {
        const saved = await cache.match(req, {ignoreSearch:true});
        if (saved) return saved;
        if (req.mode === 'navigate') {
          const home = await cache.match('./index.html');
          if (home) return home;
        }
        return Response.error();
      }
    })());
  } else if (CDN.test(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(V);
      const saved = await cache.match(req);
      if (saved) return saved;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') await cache.put(req, res.clone());
      return res;
    })());
  }
});
