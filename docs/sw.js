// Iron Ledger offline cache: app shell network-first, pictures cached as they are used.
const V = 'il-1793712463';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png']))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// rest alerts: the friends server sends an empty push when rest is over
self.addEventListener('push', e => { e.waitUntil(self.registration.showNotification('Rest is over', { body: 'Time for your next set.', tag: 'rest', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png' })); });
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return clients.openWindow('./'); })); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  const nav = r.mode === 'navigate', shell = nav || /(index\.html|config\.js)$/.test(u.pathname);
  e.respondWith(shell
    ? fetch(r).then(x => { const cp = x.clone(); caches.open(V).then(c => c.put(nav ? 'index.html' : r, cp)); return x; }).catch(() => caches.match(nav ? 'index.html' : r))
    : caches.match(r).then(m => m || fetch(r).then(x => { if (x.ok) { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); } return x; })));
});
