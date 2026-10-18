"""Build the app into docs/ (served by GitHub Pages).  Run:  python3 tools/build.py"""
import os, shutil, json, time
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open(os.path.join(R, 'src', f)).read()
data = src('data.json').replace('</', '<\\/')
logic = src('logic.js').replace('__DATA__', data)
js = '\n'.join([src('figure.js'), src('social.js'), src('server.js'), src('ui.js')])
css = src('style.css') + '\n' + src('figure.css')
head = src('shell_head.html').replace('<meta name="claude:viewport-fit-sides" content="cover">', '''<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0f1113">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Iron Ledger">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<script src="config.js"></script>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">''')
assert 'manifest.webmanifest' in head
html = head + '<style>\n' + css + '\n</style>\n' + src('shell_body.html') + '<script>\n' + logic + '\n' + js + '\n</script>\n'
D = os.path.join(R, 'docs'); os.makedirs(D, exist_ok=True)
open(os.path.join(D, 'index.html'), 'w').write(html)
open(os.path.join(D, '.nojekyll'), 'w').write('')
for f in os.listdir(os.path.join(R, 'assets')):
    if f.endswith('.jpg'): shutil.copy(os.path.join(R, 'assets', f), os.path.join(D, f))
cfg = os.path.join(D, 'config.js')
if not os.path.exists(cfg):
    open(cfg, 'w').write('// Optional: paste your friends server address between the quotes, then commit.\nwindow.IL_SERVER = "";\n')
def icon(n):
    k = n * 4; im = Image.new('RGB', (k, k), '#0f1113'); d = ImageDraw.Draw(im); y = '#f2c230'; c = k // 2
    d.rounded_rectangle([k*.18, c-k*.03, k*.82, c+k*.03], radius=k*.03, fill=y)
    for x0, x1, h in [(.22, .30, .30), (.31, .37, .22), (.70, .78, .30), (.63, .69, .22)]:
        d.rounded_rectangle([k*x0, c-k*h, k*x1, c+k*h], radius=k*.03, fill=y)
    d.rounded_rectangle([k*.08, c-k*.02, k*.18, c+k*.02], radius=k*.02, fill='#b6bdc6'); d.rounded_rectangle([k*.82, c-k*.02, k*.92, c+k*.02], radius=k*.02, fill='#b6bdc6')
    return im.resize((n, n), Image.LANCZOS)
for n in (180, 192, 512): icon(n).save(os.path.join(D, 'icon-%d.png' % n))
json.dump({"name": "Iron Ledger", "short_name": "Iron Ledger", "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#0f1113", "theme_color": "#0f1113",
           "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]},
          open(os.path.join(D, 'manifest.webmanifest'), 'w'), indent=1)
open(os.path.join(D, 'sw.js'), 'w').write('''// Iron Ledger offline cache: app shell network-first, pictures cached as they are used.
const V = 'il-%d';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png']))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  const nav = r.mode === 'navigate', shell = nav || /(index\\.html|config\\.js)$/.test(u.pathname);
  e.respondWith(shell
    ? fetch(r).then(x => { const cp = x.clone(); caches.open(V).then(c => c.put(nav ? 'index.html' : r, cp)); return x; }).catch(() => caches.match(nav ? 'index.html' : r))
    : caches.match(r).then(m => m || fetch(r).then(x => { if (x.ok) { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); } return x; })));
});
''' % int(time.time()))
print('built docs/', round(len(html) / 1024), 'KB')
