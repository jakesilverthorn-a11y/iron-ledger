/* ===== friends server (optional): real usernames + passwords, live leaderboard and challenges, no Claude needed =====
   Talks to the tiny Cloudflare Worker in SERVER-SETUP.txt. Only public scores and challenge progress go there. */
var SRV = { url: '', token: '', uid: '', name: '', subs: { people: [], ch: [], cp: [], tg: [] }, timer: null, busy: false, last: null };
function srvOn() { return !!(SRV.url && SRV.token && SRV.uid); }
function srvNorm(u) { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; return u.replace(/\/+$/, ''); }
function srvLoad() {
  if (window.claude) return;
  try {
    var m = (location.hash || '').match(/[#&]s=([^&]+)/);
    var cfg = srvNorm(window.IL_SERVER || '');
    var a = JSON.parse(localStorage.getItem('il-auth') || 'null') || {};
    if (m) { var u = srvNorm(decodeURIComponent(m[1])); if (u) { if (a.url !== u) a = { url: u }; history.replaceState(null, '', location.pathname + location.search); } }
    else if (cfg && !a.url) a = { url: cfg };
    SRV.url = a.url || ''; SRV.token = a.token || ''; SRV.uid = a.uid || ''; SRV.name = a.name || '';
  } catch (e) { }
}
function srvSave() { try { localStorage.setItem('il-auth', JSON.stringify({ url: SRV.url, token: SRV.token, uid: SRV.uid, name: SRV.name })); } catch (e) { } }
function srvInvite() { return location.origin + location.pathname + '#s=' + encodeURIComponent(SRV.url); }
async function srvRaw(method, path, body, auth) {
  var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 12000), h = { 'Content-Type': 'application/json' };
  if (auth !== false && SRV.token) h.Authorization = 'Bearer ' + SRV.token;
  var r;
  try { r = await fetch(SRV.url + path, { method: method, headers: h, body: body == null ? undefined : JSON.stringify(body), signal: ctl.signal }); }
  catch (e) { clearTimeout(to); var er = new Error('Could not reach the friends server. Check your connection.'); er.code = 'network'; throw er; }
  clearTimeout(to);
  var j = null; try { j = await r.json(); } catch (e) { }
  if (!r.ok) { var e2 = new Error((j && j.error) || 'Server error'); e2.code = r.status; if (r.status === 401 && SRV.token && auth !== false && path !== '/login') srvExpired(); throw e2; }
  return j || {};
}
function srvExpired() { srvStop(); SRV.token = ''; srvSave(); toast('Signed out. Sign in again.'); if (U.tab === 'friends') render(); }
function srvDb() {
  function sub(name) {
    return {
      onSnapshot: function (ok, bad) { var s = { ok: ok, bad: bad }; SRV.subs[name].push(s); if (SRV.last) srvDeliver(); return function () { SRV.subs[name] = SRV.subs[name].filter(function (x) { return x !== s; }); }; },
      get: async function () { var r = await srvRaw('GET', '/all'); return { docs: srvDocs(r[name]) }; },
      where: function (f, op, v) { return { get: async function () { var r = await srvRaw('GET', '/all'); return { docs: srvDocs(r[name]).filter(function (d) { return (d.data() || {})[f] === v; }) }; } }; },
      doc: function (id) { return docRef(name, id); }
    };
  }
  function docRef(col, id) {
    return {
      set: async function (d) { await srvRaw('PUT', '/c/' + col + '/' + id, d); srvPoll(); },
      delete: async function () { await srvRaw('DELETE', '/c/' + col + '/' + id); srvPoll(); },
      get: async function () { var r = await srvRaw('GET', '/all'); var x = (r[col] || {})[id]; return { id: id, data: function () { return x || null; } }; },
      acquire: async function () { return { acquired: true }; }
    };
  }
  return { collection: sub, doc: function (p) { var s = p.split('/'); return docRef(s[0], s[1]); } };
}
function srvDocs(map) { return Object.keys(map || {}).map(function (id) { return { id: id, data: function () { return map[id]; } }; }); }
function srvDeliver() {
  ['people', 'ch', 'cp', 'tg'].forEach(function (c) { var docs = srvDocs(SRV.last && SRV.last[c]); SRV.subs[c].slice().forEach(function (s) { try { s.ok({ docs: docs }); } catch (e) { } }); });
}
async function srvPoll() {
  if (!srvOn() || SRV.busy) return; SRV.busy = true;
  try { SRV.last = await srvRaw('GET', '/all'); srvDeliver(); }
  catch (e) { if (e.code === 'network') ['people', 'ch', 'cp', 'tg'].forEach(function (c) { SRV.subs[c].forEach(function (s) { if (s.bad) s.bad({ code: 'network' }); }); }); }
  SRV.busy = false;
}
function srvStart() {
  if (!srvOn() || SOC.db) return;
  SRV.last = null; SRV.subs = { people: [], ch: [], cp: [], tg: [] };
  socInit(srvDb(), { can: async function () { return true; } }, SRV.uid);
  clearInterval(SRV.timer); SRV.timer = setInterval(function () { if (!document.hidden) srvPoll(); }, 20000);
  srvPoll();
  if (profB()) socClaim(SRV.name).then(function () { if (U.tab === 'friends') render(); });
  if (typeof aiDetect === 'function') aiDetect();
}
function srvStop() {
  clearInterval(SRV.timer); SRV.timer = null; SRV.last = null; SRV.subs = { people: [], ch: [], cp: [], tg: [] };
  SOC.db = null; SOC.uid = null; SOC.people = {}; SOC.ch = {}; SOC.cp = {}; SOC.tg = {}; SOC.tgLoaded = false; SOC.state = 'pending'; SOC.lastPub = ''; SOC.lastProg = '';
}
async function srvAuth(kind, u, p) {
  try {
    var r = await srvRaw('POST', '/' + kind, { u: u, p: p }, false);
    SRV.token = r.token; SRV.uid = r.uid; SRV.name = r.name; srvSave();
    S.settings.handle = r.name; persist({ settings: true });
    srvStop(); srvStart(); return null;
  } catch (e) { return e.message || 'Could not reach the server.'; }
}
async function srvConnect(url) {
  url = srvNorm(url); if (!url) return 'Paste the server address.';
  try {
    var r = await fetch(url + '/ping'); var j = await r.json();
    if (!j || j.app !== 'iron-ledger') return 'That address is not an Iron Ledger friends server.';
  } catch (e) { return 'Could not reach that address.'; }
  SRV.url = url; SRV.token = ''; SRV.uid = ''; SRV.name = ''; srvSave(); return null;
}
function srvSignOut() { srvStop(); if (typeof AI !== 'undefined' && AI.kind === 'server') AI.kind = null; SRV.token = ''; SRV.uid = ''; SRV.name = ''; srvSave(); }
function srvForget() { srvSignOut(); SRV.url = ''; srvSave(); }
function srvBoot() { srvLoad(); if (srvOn()) srvStart(); document.addEventListener('visibilitychange', function () { if (!document.hidden && srvOn()) srvPoll(); }); }

function viewFriendsAuth() {
  var head = '<div class="screen-head"><div><div class="sub">Compare strength, start challenges</div><h1>Friends</h1></div></div>', host = SRV.url.replace(/^https?:\/\//, '');
  return '<div class="screen">' + head + '<div class="card section"><h2>Race your friends</h2>' +
    '<div class="note">Make a username and password to join the leaderboard and live challenges. Friends see your strength scores, which are adjusted for height, weight and sex. Your height, weight and workouts stay on your phone.</div>' +
    '<input class="input" id="su" maxlength="16" autocapitalize="none" autocomplete="username" autocorrect="off" spellcheck="false" placeholder="Username" aria-label="Username">' +
    '<input class="input" id="sp" type="password" autocomplete="current-password" placeholder="Password (6+ characters)" aria-label="Password">' +
    '<div class="note" id="s-err" style="color:var(--down);min-height:0"></div>' +
    '<div class="row"><button class="btn primary grow" data-act="srvIn">Sign in</button><button class="btn grow" data-act="srvUp">Create account</button></div>' +
    '<div class="note">New here? Choose Create account. There is no password reset, so pick one you will remember.</div></div>' +
    '<button class="btn block ghost" data-act="srvCodes">Use friend codes instead</button>' +
    '<div class="note">Server: ' + esc(host) + ' · <button class="linkbtn" data-act="srvForget">change</button></div></div>';
}
function srvConnectCard() {
  if (window.claude) return '';
  return '<div class="card section"><h2>Live friends &amp; challenges</h2><div class="note">Have a friends server address, or an invite link from a friend? Open the invite link, or paste the server address here to get usernames, a live leaderboard and challenges.</div>' +
    '<input class="input" id="surl" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="https://ironledger.yourname.workers.dev" aria-label="Server address">' +
    '<div class="note" id="surl-err" style="color:var(--down);min-height:0"></div><button class="btn block" data-act="srvSaveUrl">Connect</button></div>';
}
