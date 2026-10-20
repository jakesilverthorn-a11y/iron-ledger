/* ===== App state & persistence ===== */
var LS_KEY = 'ironledger.v1';
function defaults() { return { unit: 'lb', profile: 'gym', gear: { gym: GYM_GEAR.slice(), home: HOME_GEAR.slice() }, body: { sex: null, h: null, w: null, log: [] }, level: 'intermediate', goal: 'strength', minutes: 45, groups: ['Chest', 'Shoulders', 'Triceps'], deleted: [], friends: [], cfriends: [], handle: '', injuries: [], saved: [], notes: {}, weekGoal: 3, bar: null, lift: !!window.claude, lastBackup: 0 }; }
var S = { settings: defaults(), workouts: [], draft: null, at: { settings: 0, draft: 0 } };
injuryList = function () { return (S.settings && S.settings.injuries) || []; };
metricBW = function () { var B = S.settings && profB(); return B ? curWeightLb(B) : 0; };
var U = { tab: 'train', seg: 'muscles', libQ: '', libGroups: [], libGear: 'all', libCat: 'all', libItem: 'all', bsex: null, libShown: 40, plan: null, seed: 1, hist: null, pickQ: '', pickGroups: [], pickMode: null, rest: null, openHist: null, confirm: null };
var dbCol = null, dbState = 'pending', dirtySettings = false, dirtyDraft = false, dirtyMonths = {}, pushing = false, again = false, syncTimer = null;

function normSettings(st) {
  var d = defaults();
  if (!st.gear || !st.gear.gym || !st.gear.home) st.gear = d.gear;
  if (st.profile !== 'home' && st.profile !== 'gym') st.profile = 'gym';
  if (!st.body || !Array.isArray(st.body.log)) st.body = d.body;
  if (!Array.isArray(st.friends)) st.friends = [];
  if (!Array.isArray(st.cfriends)) st.cfriends = [];
  if (typeof st.handle !== 'string') st.handle = '';
  if (!st.notes || typeof st.notes !== 'object') st.notes = {};
  if (!Array.isArray(st.injuries)) st.injuries = [];
  if (!Array.isArray(st.saved)) st.saved = [];
  if (!(st.weekGoal >= 1 && st.weekGoal <= 7)) st.weekGoal = 3;
  if (typeof st.lift !== 'boolean') st.lift = !!window.claude;
  delete st.equip;
  return st;
}
function loadLocal() {
  try {
    var j = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (j) { S.settings = normSettings(Object.assign(defaults(), j.settings || {})); S.workouts = j.workouts || []; S.draft = j.draft || null; S.at = j.at || S.at; }
  } catch (e) { }
}
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify({ settings: S.settings, workouts: S.workouts, draft: S.draft, at: S.at })); } catch (e) { } }
function persist(o) {
  o = o || {};
  if (o.settings) { S.at.settings = Date.now(); dirtySettings = true; }
  if (o.draft) { S.at.draft = Date.now(); dirtyDraft = true; }
  if (o.month != null) dirtyMonths[monthKey(o.month)] = 1;
  saveLocal(); clearTimeout(syncTimer); syncTimer = setTimeout(pushDb, 900);
  if (typeof socPublishSoon === 'function' && SOC.db) { socPublishSoon(); socProgressSoon(); }
}
async function pushDb() {
  if (!dbCol) return;
  if (pushing) { again = true; return; }
  pushing = true;
  var keys = Object.keys(dirtyMonths), ds = dirtySettings, dd = dirtyDraft;
  dirtyMonths = {}; dirtySettings = false; dirtyDraft = false;
  try {
    if (ds) await dbCol.doc('settings').set({ v: 1, at: S.at.settings, settings: S.settings });
    if (dd) await dbCol.doc('draft').set({ v: 1, at: S.at.draft, draft: S.draft || null });
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], ws = S.workouts.filter(function (w) { return monthKey(w.t) === k; });
      if (ws.length) await dbCol.doc(k).set({ v: 1, w: ws }); else await dbCol.doc(k).delete();
    }
    dbState = 'synced';
  } catch (e) {
    dbState = 'error'; dirtySettings = dirtySettings || ds; dirtyDraft = dirtyDraft || dd; keys.forEach(function (k) { dirtyMonths[k] = 1; });
    clearTimeout(syncTimer); syncTimer = setTimeout(pushDb, 20000);
  }
  pushing = false;
  if (again) { again = false; pushDb(); }
}
async function initDb() {
  try {
    var cl = window.claude;
    if (!cl || !cl.use) { dbState = 'local'; srvBoot(); if (U.tab === 'friends') render(); return; }
    var user = await cl.use('user'), db = await cl.use('db');
    var id = user ? await user.id() : null;
    if (!db || !id) { dbState = 'local'; if (U.tab === 'settings') render(); return; }
    dbCol = db.collection('data/users/' + id);
    socInit(db, user, id);
    var snap = await dbCol.get(), remoteW = [], rs = null, rd = null;
    snap.docs.forEach(function (d) {
      var x = d.data(); if (!x) return;
      if (d.id === 'settings') rs = x; else if (d.id === 'draft') rd = x; else if (d.id.indexOf('m_') === 0) remoteW = remoteW.concat(x.w || []);
    });
    var del = {}; (S.settings.deleted || []).forEach(function (i) { del[i] = 1; });
    ((rs && rs.settings && rs.settings.deleted) || []).forEach(function (i) { del[i] = 1; });
    var byId = {}, push = false;
    remoteW.forEach(function (w) { byId[w.id] = w; });
    S.workouts.forEach(function (w) { if (!byId[w.id]) { byId[w.id] = w; dirtyMonths[monthKey(w.t)] = 1; push = true; } });
    S.workouts = Object.keys(byId).map(function (k) { return byId[k]; }).filter(function (w) { return !del[w.id]; }).sort(function (a, b) { return a.t - b.t; });
    if (rs && (rs.at || 0) > (S.at.settings || 0)) { S.settings = normSettings(Object.assign(defaults(), rs.settings)); S.at.settings = rs.at; }
    else if ((S.at.settings || 0) > ((rs && rs.at) || 0)) { dirtySettings = true; push = true; }
    S.settings.deleted = Object.keys(del).slice(-200);
    if (rd && (rd.at || 0) > (S.at.draft || 0)) { S.draft = rd.draft || null; S.at.draft = rd.at; }
    else if ((S.at.draft || 0) > ((rd && rd.at) || 0)) { dirtyDraft = true; push = true; }
    dbState = 'synced'; saveLocal();
    if (push) pushDb();
    var a = document.activeElement;
    if (!(a && a.tagName === 'INPUT')) render();
  } catch (e) { dbState = 'local'; }
}

/* ===== helpers ===== */
var $ = function (s, r) { return (r || document).querySelector(s); };
var unit = function () { return S.settings.unit; };
var uLabel = function () { return S.settings.unit === 'kg' ? 'kg' : 'lb'; };
function realWorkouts() { return S.workouts; }
function statWorkouts() { return S.workouts.length ? S.workouts : sampleWorkouts(Date.now()); }
function isSample() { return !S.workouts.length; }
function volDisp(lb) { var v = unit() === 'kg' ? lb / LB : lb; return v >= 10000 ? (Math.round(v / 100) / 10) + 'k' : Math.round(v).toLocaleString('en-US'); }
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
function ico(name) {
  var P = {
    train: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    lib: '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><rect x="3.5" y="14" width="7" height="6" rx="1.5"/><rect x="13.5" y="14" width="7" height="6" rx="1.5"/>',
    prog: '<path d="M3.5 19.5h17M6 16l4-5 3.5 3L19 7"/>',
    set: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M12 5l-6 7h12z"/>',
    shuffle: '<path d="M3.5 7H7c3 0 4.5 2 5.5 5s2.5 5 5.5 5H20M3.5 17H7c1.6 0 2.8-.7 3.7-1.8M13.3 8.8C14.2 7.7 15.4 7 17 7h3"/><path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>',
    body: '<circle cx="12" cy="4.8" r="2.3"/><path d="M6 8.5h12M12 8.5v6.5M12 15l-3 5.5M12 15l3 5.5"/>',
    eat: '<path d="M7 3v7.5M4.5 3v5a2.5 2.5 0 005 0V3M7 10.5V21"/><path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7 0 2 1 3.2 3.5 3.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.6 0 4 1.5 4 4"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';
}
function photoHTML(ex, anim, extra) {
  var a = anim ? DATA.atlas2[ex.a2] : DATA.atlas[ex.a], r = anim ? ex.r2 : ex.r, rows = a[1], y = rows > 1 ? (r / (rows - 1) * 100) : 0;
  return '<div class="demo' + (anim ? ' anim' : '') + (extra ? ' ' + extra : '') + '" role="img" aria-label="' + esc(ex.n) + ' demonstration" style="background-image:url(' + a[0] + ');background-size:' + (anim ? 200 : 100) + '% ' + (rows * 100) + '%;background-position-x:0%;background-position-y:' + y + '%"></div>';
}
/* small picture used in lists: the cartoon figure when we have one, otherwise the photo */
function demoHTML(ex, anim, extra) {
  var T = !anim && FIG.forEx(ex);
  if (T) return '<div class="demo cg' + (extra ? ' ' + extra : '') + '" role="img" aria-label="' + esc(ex.n) + ' demonstration">' + FIG.thumb(T) + '</div>';
  return photoHTML(ex, anim, extra);
}
function demoInner(ex) {
  var T = FIG.forEx(ex), mode = T && U.demoMode !== 'photo' ? 'cartoon' : 'photo';
  var tog = T ? '<div class="seg" role="group" aria-label="Demo style"><button aria-pressed="' + (mode === 'cartoon') + '" data-act="demoMode" data-m="cartoon" data-n="' + esc(ex.n) + '">Cartoon</button><button aria-pressed="' + (mode === 'photo') + '" data-act="demoMode" data-m="photo" data-n="' + esc(ex.n) + '">Photos</button></div>' : '';
  var pic = mode === 'cartoon' ? '<div class="demo cg big" role="img" aria-label="' + esc(ex.n) + ' animated demonstration"><svg class="fig" id="figlive" viewBox="0 0 300 200" aria-hidden="true"></svg></div><div class="note">Red marks the muscles doing the work.</div>' : photoHTML(ex, true, 'big') + '<div class="note">' + (T ? 'Photos flip between the start and end of the move.' : 'Photos flip between the start and end of the move. No cartoon for this one yet.') + '</div>';
  return pic + tog;
}
function startDemo(ex) {
  var T = FIG.forEx(ex), s = $('#figlive');
  if (T && s && U.demoMode !== 'photo') FIG.live(s, T);
}
function tagsHTML(ex) {
  return ex.p.map(function (g) { return '<span class="tag p">' + esc(g) + '</span>'; }).join('') + ex.s.map(function (g) { return '<span class="tag">' + esc(g) + '</span>'; }).join('');
}
function gearList() { return S.settings.gear[S.settings.profile] || GYM_GEAR; }
function profName() { return S.settings.profile === 'home' ? 'Home' : 'Gym'; }
function exMeta(ex) { var gn = gearNames(ex).filter(function (n) { return n !== 'Bodyweight'; }); return (ex.p.join(', ') || titleCase(ex.pm[0] || '')) + ' · ' + (gn.length ? gn.slice(0, 2).join(' + ') + (gn.length > 2 ? ' +' + (gn.length - 2) : '') : 'Bodyweight'); }
function gearTile(it, on, stat) {
  var ph = photoHTML(EX[it.ph], false);
  if (stat) return '<div class="gtile static">' + ph + '<span class="gl">' + esc(it.n) + '</span></div>';
  return '<button class="gtile" aria-pressed="' + on + '" data-act="gear" data-k="' + it.id + '">' + ph + '<span class="gl">' + esc(it.n) + '</span><span class="gck">' + ico('check') + '</span></button>';
}
function gearGrid() {
  var cur = gearMap(gearList());
  return ITEM_GROUPS.map(function (g) {
    var its = ITEMS.filter(function (i) { return i.g === g; }), n = its.filter(function (i) { return cur[i.id]; }).length;
    return '<div class="section" style="gap:8px"><div class="row" style="gap:6px"><span class="field-label grow" style="margin:0">' + esc(g) + ' · ' + n + '/' + its.length + '</span><button class="btn small ghost" style="min-height:32px;padding:0 10px" data-act="gearAll" data-g="' + esc(g) + '">All</button><button class="btn small ghost" style="min-height:32px;padding:0 10px" data-act="gearNone" data-g="' + esc(g) + '">None</button></div><div class="gear-grid">' + its.map(function (i) { return gearTile(i, !!cur[i.id]); }).join('') + '</div></div>';
  }).join('');
}
/* ---- body stats ---- */
function profB() { return bodyReady(S.settings.body) ? S.settings.body : null; }
function fmtHeight(cm) { if (unit() === 'kg') return Math.round(cm) + ' cm'; var f = cm2ftin(cm); return f.ft + "'" + f.inch + '"'; }
function bodyText(B) { return fmtHeight(B.h) + ' · ' + toDisp(curWeightLb(B), unit()) + ' ' + uLabel() + ' · ' + (B.sex === 'M' ? 'Male' : 'Female'); }

/* ===== charts ===== */
function niceTicks(lo, hi, n) {
  var span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  var step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag, a = Math.floor(lo / step) * step, out = [];
  for (var v = a; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
  return out;
}
function lineChart(pts, o) {
  o = o || {};
  var W = 360, H = o.h || 170, pl = 40, pr = 14, pt = 12, pb = 24, fmt = o.fmt || function (v) { return Math.round(v); };
  if (!pts.length) return '';
  var t0 = pts[0].t, t1 = pts[pts.length - 1].t, lo = Infinity, hi = -Infinity;
  pts.forEach(function (p) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); });
  if (o.base != null) { lo = Math.min(lo, o.base); hi = Math.max(hi, o.base); }
  var padv = (hi - lo) * 0.12 || Math.max(1, hi * 0.05); lo -= padv; hi += padv;
  var ticks = niceTicks(lo, hi, 4); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
  var X = function (t) { return t1 === t0 ? (pl + (W - pl - pr) / 2) : pl + (t - t0) / (t1 - t0) * (W - pl - pr); };
  var Y = function (v) { return pt + (hi - v) / (hi - lo) * (H - pt - pb); };
  var g = '', i;
  ticks.forEach(function (tv) { var y = Y(tv); g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" style="stroke:var(--grid)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(fmt(tv)) + '</text>'; });
  if (o.base != null) { var yb = Y(o.base); g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yb + '" y2="' + yb + '" style="stroke:var(--faint)" stroke-width="1" stroke-dasharray="4 4"/>'; }
  var d = pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
  if (pts.length > 1) {
    g += '<path d="' + d + ' L' + X(t1).toFixed(1) + ' ' + (H - pb) + ' L' + X(t0).toFixed(1) + ' ' + (H - pb) + ' Z" style="fill:var(--accent)" fill-opacity=".13"/>';
    g += '<path d="' + d + '" fill="none" style="stroke:var(--accent-ink)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  }
  if (pts.length <= 14) pts.forEach(function (p) { g += '<circle cx="' + X(p.t).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3" style="fill:var(--bg);stroke:var(--accent-ink)" stroke-width="2"/>'; });
  var last = pts[pts.length - 1];
  g += '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="5" style="fill:var(--accent-ink);stroke:var(--bg)" stroke-width="2"/>';
  g += '<text x="' + pl + '" y="' + (H - 6) + '" text-anchor="start">' + esc(fmtDate(t0)) + '</text>';
  if (t1 !== t0) g += '<text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(fmtDate(t1)) + '</text>';
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Trend chart') + '">' + g + '</svg>';
}
function spark(pts, base) {
  if (pts.length < 2) return '<svg class="spark" viewBox="0 0 300 34" aria-hidden="true"></svg>';
  var lo = Infinity, hi = -Infinity; pts.forEach(function (p) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); });
  if (base != null) { lo = Math.min(lo, base); hi = Math.max(hi, base); }
  var span = hi - lo || 1, t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  var X = function (t) { return 6 + (t - t0) / ((t1 - t0) || 1) * 288; }, Y = function (v) { return 4 + (hi - v) / span * 24; };
  var d = pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
  var l = pts[pts.length - 1], up = l.v >= pts[0].v, col = up ? 'var(--up)' : 'var(--down)';
  var bl = base != null ? '<line x1="6" x2="294" y1="' + Y(base) + '" y2="' + Y(base) + '" style="stroke:var(--line2)" stroke-dasharray="3 4"/>' : '';
  return '<svg class="spark" viewBox="0 0 300 34" aria-hidden="true">' + bl + '<path d="' + d + '" fill="none" style="stroke:' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + X(l.t).toFixed(1) + '" cy="' + Y(l.v).toFixed(1) + '" r="3.4" style="fill:' + col + '"/></svg>';
}
function deltaHTML(d, suffix) {
  if (d == null) return '<span class="delta flat">new</span>';
  var r = Math.round(d * 10) / 10;
  if (Math.abs(r) < 0.5) return '<span class="delta flat">±0' + (suffix || '') + '</span>';
  return '<span class="delta ' + (r > 0 ? 'up' : 'down') + '">' + (r > 0 ? '▲ +' : '▼ ') + Math.round(r) + (suffix || '') + '</span>';
}

/* ===== sheets ===== */
function openSheet(title, body, opts) {
  opts = opts || {};
  var root = $('#sheet-root');
  root.innerHTML = '<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="panel"><div class="grab"></div><div class="head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="close" aria-label="Close">' + ico('x') + '</button></div><div class="body" id="sheet-body">' + body + '</div></div></div>';
  document.body.style.overflow = 'hidden';
  var b = $('#sheet-body'); if (opts.focus) { var f = $(opts.focus, b); if (f) f.focus(); }
}
function closeSheet() { $('#sheet-root').innerHTML = ''; document.body.style.overflow = ''; U.pickMode = null; U.socSheet = null; U.eatSheet = null; }
function sheetOpen() { return !!$('#sheet-root').firstChild; }

/* ===== exercise detail ===== */
function exerciseSheet(name, ctx) {
  var ex = BYNAME[name]; if (!ex) return;
  var h = exHistory(realWorkouts(), name), extra = '';
  if (h.length) {
    var best = Math.max.apply(null, h.map(function (x) { return x.best; })), bw = isBW(ex);
    extra = '<div class="section"><h3 style="font-size:20px">Your progress</h3>' + lineChart(h.map(function (x) { return { t: x.t, v: bw ? x.best : (unit() === 'kg' ? x.best / LB : x.best) }; }), { label: 'Progress for ' + name, fmt: function (v) { return Math.round(v); } }) +
      '<div class="note">' + (bw ? 'Best set: ' + Math.round(best) + ' reps' : 'Best estimated 1-rep max: ' + toDisp(best, unit()) + ' ' + uLabel()) + ' · ' + h.length + ' session' + (h.length > 1 ? 's' : '') + '</div></div>';
  }
  var add = '';
  if (S.draft) add = S.draft.ex.some(function (x) { return x.n === name; }) ? '' : '<button class="btn primary block" data-act="addToDraft" data-n="' + esc(name) + '">Add to workout</button>';
  else if (U.plan) add = '<button class="btn primary block" data-act="addToPlan" data-n="' + esc(name) + '">Add to today\'s plan</button>';
  var lv = loadInfo(ex), logBox = lv.l ? '<div class="card section loadbox"><div class="xname">⚖️ How to log the weight' + (lv.s ? ': ' + esc(lv.s.toLowerCase()) : '') + '</div><div class="note" style="font-size:14.5px">' + esc(lv.l) + '</div></div>' : '';
  var body = injSheetNote(ex) + '<div class="demo-wrap" id="demowrap">' + demoInner(ex) + '</div>' + (S.draft ? logBox : '') +
    '<div>' + tagsHTML(ex) + '<span class="tag">' + esc(titleCase(ex.l)) + '</span>' + (ex.m ? '<span class="tag">' + esc(titleCase(ex.m)) + '</span>' : '') + '</div>' + add +
    liftRankCard(name, allHistories(realWorkouts())[name]) + '<div class="section"><h3 style="font-size:20px">Equipment</h3><div class="gear-grid">' + ex.gear.map(function (g) { return ITEM_BY[g] ? gearTile(ITEM_BY[g], true, true) : ''; }).join('') + '</div></div>' +
    '<div class="section"><h3 style="font-size:20px">Your notes</h3><textarea class="input" id="exnote" data-n="' + esc(name) + '" rows="2" maxlength="200" style="padding:10px 14px;min-height:64px" placeholder="Seat height, grip, cues… shows up during workouts">' + esc(S.settings.notes[name] || '') + '</textarea></div>' + '<div class="section"><h3 style="font-size:20px">How to do it</h3><ol class="steps">' + ex.i.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' + (S.draft ? '' : logBox) + extra;
  openSheet(ex.n, body); startDemo(ex);
}

/* ===== library list & filtering ===== */
function filterEx(q, groups, gear, cat, item) {
  var toks = q.toLowerCase().split(/\s+/).filter(Boolean), mg = gearMap(gearList());
  return EX.filter(function (e) {
    if (gear === 'mine' && !available(e, mg)) return false;
    if (item && item !== 'all' && e.gear.indexOf(item) < 0) return false;
    if (cat !== 'all' && e.c !== cat) return false;
    if (groups.length && !groups.some(function (g) { return e.p.indexOf(g) >= 0; })) return false;
    if (toks.length) { var hay = (e.n + ' ' + e.pm.join(' ') + ' ' + gearNames(e).join(' ')).toLowerCase(); for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return false; }
    return true;
  });
}
function groupChips(sel, act) {
  return '<div class="chips">' + GROUPS.map(function (g) { return '<button class="chip" aria-pressed="' + (sel.indexOf(g) >= 0) + '" data-act="' + act + '" data-g="' + g + '">' + g + '</button>'; }).join('') + '</div>';
}
function xrow(e, act) {
  return '<button class="xrow" data-act="' + act + '" data-n="' + esc(e.n) + '"><div class="thumb">' + demoHTML(e, false) + '</div><div class="grow"><div class="xname">' + esc(e.n) + '</div><div class="xmeta">' + esc(exMeta(e)) + '</div>' + injBadge(e) + '</div></button>';
}
function libList(list, shown, act) {
  if (!list.length) return '<div class="empty"><h3>No matches</h3>Try fewer filters, or switch gear to All.</div>';
  var h = list.slice(0, shown).map(function (e) { return xrow(e, act); }).join('');
  if (list.length > shown) h += '<button class="btn block" style="margin-top:12px" data-act="libMore">Show more (' + (list.length - shown) + ' left)</button>';
  return h;
}


/* ===== recovery body picture ===== */
function bodyFigure(rec, any) {
  var cls = function (g) { return 'rg r-' + (any ? rec[g].level : 'n'); };
  var R = function (g, shape) { return shape.replace('<', '<' ).replace(/^<(\w+)/, '<$1 class="' + cls(g) + '" data-act="recTap" data-g="' + g + '"'); };
  var mir = function (g, f) { return R(g, f(0)) + R(g, f(1)); };
  var fx = function (cx, cy, rx, ry, o) { return function (m) { var x = m ? 2 * o - cx : cx; return '<ellipse cx="' + x + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>'; }; };
  var fr = function (x, y, w, h, r, o) { return function (m) { var xx = m ? 2 * o - x - w : x; return '<rect x="' + xx + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '"/>'; }; };
  var fp = function (d, o) { return function (m) { return m ? '<path transform="translate(' + (2 * o) + ' 0) scale(-1 1)" d="' + d + '"/>' : '<path d="' + d + '"/>'; }; };
  var out = '';
  function view(o, back) {
    var base = '<g class="bfbase"><ellipse cx="' + o + '" cy="17" rx="11" ry="13"/><rect x="' + (o - 6) + '" y="27" width="12" height="12" rx="4"/><rect x="' + (o - 28) + '" y="38" width="56" height="86" rx="16"/><rect x="' + (o - 45) + '" y="42" width="18" height="84" rx="9"/><rect x="' + (o + 27) + '" y="42" width="18" height="84" rx="9"/><rect x="' + (o - 23) + '" y="116" width="22" height="116" rx="11"/><rect x="' + (o + 1) + '" y="116" width="22" height="116" rx="11"/></g>';
    var g = '';
    g += mir('Shoulders', fx(o - 30, 49, 9, 10, o));
    g += mir('Forearms', fr(o - 43, 88, 13, 34, 6, o));
    if (!back) {
      g += mir('Chest', fp('M' + (o - 25) + ' 45 Q' + (o - 12) + ' 41 ' + (o - 1) + ' 47 L' + (o - 1) + ' 67 Q' + (o - 14) + ' 71 ' + (o - 25) + ' 63 Z', o));
      g += mir('Biceps', fr(o - 38, 57, 12, 29, 6, o));
      g += R('Core', '<path d="M' + (o - 14) + ' 71 L' + (o + 14) + ' 71 L' + (o + 12) + ' 112 Q' + o + ' 118 ' + (o - 12) + ' 112 Z"/>');
      g += mir('Quads', fr(o - 22, 119, 20, 54, 9, o));
      g += mir('Calves', fr(o - 20, 178, 16, 50, 7, o));
    } else {
      g += R('Back', '<path d="M' + (o - 26) + ' 44 Q' + o + ' 38 ' + (o + 26) + ' 44 L' + (o + 22) + ' 72 Q' + (o + 17) + ' 100 ' + (o + 8) + ' 106 L' + (o - 8) + ' 106 Q' + (o - 17) + ' 100 ' + (o - 22) + ' 72 Z"/>');
      g += mir('Triceps', fr(o - 38, 57, 12, 29, 6, o));
      g += mir('Glutes', fx(o - 11, 124, 11, 12, o));
      g += mir('Hamstrings', fr(o - 22, 139, 20, 36, 9, o));
      g += mir('Calves', fr(o - 20, 179, 16, 49, 7, o));
    }
    return base + g;
  }
  out = '<svg class="bodyfig" viewBox="0 0 250 248" role="img" aria-label="Muscle recovery map, front and back">' + view(62, false) + view(188, true) +
    '<text x="62" y="244" text-anchor="middle">FRONT</text><text x="188" y="244" text-anchor="middle">BACK</text></svg>';
  return out;
}
function recoveryHTML(compact) {
  var W = realWorkouts(), any = W.length > 0, rec = recoveryState(W, Date.now());
  var order = GROUPS.slice().sort(function (a, b) { return rec[b].fatigue - rec[a].fatigue || GROUPS.indexOf(a) - GROUPS.indexOf(b); });
  var rows = order.map(function (g) {
    var r = rec[g], txt = !any ? '–' : r.level === 0 ? 'Fresh' : LEVEL_TXT[r.level] + ' · ' + readyText(r.readyH);
    return '<button class="rrow" data-act="recTap" data-g="' + g + '"><span class="dot r-' + (any ? r.level : 'n') + '"></span><span class="rn">' + g + '</span><span class="rt">' + esc(txt) + '</span></button>';
  }).join('');
  return bodyFigure(rec, any) +
    '<div class="rleg"><span><i class="dot r-0"></i>Fresh</span><span><i class="dot r-1"></i>Recovering</span><span><i class="dot r-2"></i>Tired</span></div>' +
    (any ? '<div class="rlist">' + rows + '</div>' : '<div class="note" style="text-align:center">Finish a workout and this map shows which muscles need rest.</div>') +
    (compact ? '' : '<div class="note">Estimated from the sets you logged: bigger muscles and harder sessions take longer to recover. The time shown is roughly when the muscle is ready to train hard again.</div>');
}

/* ===== views ===== */
function render() {
  var y = window.scrollY, v = $('#view');
  var map = { train: viewTrain, lib: viewLib, prog: viewProg, body: viewBody, eat: viewEat, friends: viewFriends, settings: viewSettings };
  var html = map[U.tab]();
  if (S.draft && U.tab !== 'train') html = '<div class="screen" style="padding-bottom:0"><button class="banner" style="width:100%;text-align:left" data-act="tab" data-t="train"><span><b>Workout in progress</b> · tap to continue</span><span class="num" style="font-size:20px" id="clock2"></span></button></div>' + html;
  v.innerHTML = html;
  document.querySelectorAll('#tabs button').forEach(function (b) { if (b.dataset.t === U.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  window.scrollTo(0, y);
  tick();
}

function viewTrain() {
  if (S.draft) return viewWorkout();
  var st = S.settings, sel = st.groups, gl = gearList();
  var d = new Date(), head = '<div class="screen-head"><div><div class="sub">' + DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div><h1>Train</h1></div></div>';
  var builder = '<div class="card section" style="gap:16px">' +
    '<div><span class="field-label">Time you have</span><div class="timebox"><span class="big" id="timebig">' + st.minutes + '</span><span class="unit">min</span></div>' +
    '<input type="range" id="time" min="15" max="120" step="5" value="' + st.minutes + '" aria-label="Minutes available"><div class="ticks"><span>15</span><span>45</span><span>75</span><span>120</span></div></div>' +
    '<div><span class="field-label">Quick picks</span><div class="chips">' + PRESETS.map(function (p) { return '<button class="chip" data-act="preset" data-i="' + PRESETS.indexOf(p) + '">' + p.n + '</button>'; }).join('') + '</div></div>' +
    '<div><span class="field-label">Muscle groups</span>' + groupChips(sel, 'toggleGroup') + '</div>' +
    '<div><span class="field-label">Goal</span><div class="seg" role="group" aria-label="Goal">' + Object.keys(GOALS).map(function (k) { return '<button aria-pressed="' + (st.goal === k) + '" data-act="goal" data-k="' + k + '">' + GOALS[k].n + '</button>'; }).join('') + '</div></div>' +
    '<div><span class="field-label">Where are you training?</span><div class="seg" role="group" aria-label="Where you train"><button aria-pressed="' + (st.profile === 'gym') + '" data-act="profile" data-k="gym">Gym</button><button aria-pressed="' + (st.profile === 'home') + '" data-act="profile" data-k="home">Home</button></div><div class="note" style="margin-top:8px">' + gl.length + ' of ' + ITEMS.length + ' equipment types ticked · <button style="color:var(--accent-ink);font-weight:600" data-act="tab" data-t="settings">Edit gear</button></div></div>' +
    (st.injuries.length ? '<div class="note">🩹 Working around: ' + st.injuries.map(function (j) { return injName(j.a).toLowerCase() + (j.s === 'avoid' ? ' (avoid)' : ' (careful)'); }).join(', ') + '. <button class="linkbtn accent" data-act="tab" data-t="settings">Edit</button></div>' : '') +
    '<button class="btn primary block" data-act="generate"' + (sel.length ? '' : ' disabled') + '>' + (U.plan ? 'Rebuild workout' : 'Build my workout') + '</button></div>';
  var recCard = '<div class="card section" style="gap:12px"><div class="row"><h2 class="grow" style="font-size:24px">Recovery</h2>' + (realWorkouts().length ? '<button class="btn small" data-act="trainFresh">Train fresh muscles</button>' : '') + '</div>' + recoveryHTML(false) + '</div>';
  var plan = U.plan ? planHTML() : '';
  var recent = '';
  var rw = realWorkouts().slice(-3).reverse();
  if (rw.length) recent = '<div class="section"><h2>Recent</h2><div class="card" style="padding:0 14px">' + rw.map(histRow).join('') + '</div></div>';
  var nudge = (dbState === 'local' && realWorkouts().length >= 3 && Date.now() - (st.lastBackup || 0) > 14 * DAY) ? '<button class="banner" style="width:100%;text-align:left" data-act="tab" data-t="settings"><span><b>Back up your workouts</b> · they live only on this phone. Tap to save a backup file.</span></button>' : '';
  return '<div class="screen">' + head + nudge + weekCard() + savedWorkoutsHTML() + recCard + builder + plan + '<button class="btn block" data-act="startEmpty">Start an empty workout</button>' + recent + '</div>';
}
function planHTML() {
  var p = U.plan, items = p.items;
  var rows = items.map(function (it, i) {
    var ex = BYNAME[it.n], ls = lastSession(realWorkouts(), it.n), last = '';
    if (ls) { var top = ls.e.sets.slice().sort(function (a, b) { return (b.w - a.w) || (b.r - a.r); })[0]; last = ' · last ' + (isBW(ex) && !top.w ? top.r + ' reps' : fmtW(top.w, unit()) + '×' + top.r); }
    return '<div class="plan-item"><button class="thumb" data-act="openEx" data-n="' + esc(it.n) + '" aria-label="View ' + esc(it.n) + '">' + demoHTML(ex, false) + '</button><div class="grow"><div class="xname">' + esc(it.n) + '</div><div class="xmeta">' + it.sets + ' × ' + it.lo + '–' + it.hi + ' · rest ' + fmtDur(it.rest) + last + '</div></div><div class="plan-actions"><button class="icon-btn" data-act="swap" data-i="' + i + '" aria-label="Swap exercise">' + ico('swap') + '</button><button class="icon-btn" data-act="rmPlan" data-i="' + i + '" aria-label="Remove exercise">' + ico('x') + '</button></div></div>';
  }).join('');
  var short = p.short ? '<div class="banner"><span>Not enough matching exercises to fill ' + S.settings.minutes + ' min with your gear. Add equipment in Settings for more.</span></div>' : '';
  return '<div class="section"><div class="row"><h2 class="grow">Today\'s workout</h2><span class="num" style="font-size:22px">~' + p.estMin + ' min</span></div>' + short +
    '<div class="card" style="padding:0 14px">' + (rows || '<div class="empty">Nothing left in the plan.</div>') + '</div>' +
    '<div class="row"><button class="btn grow" data-act="pickPlan">' + ico('plus').replace('<svg', '<svg width="18" height="18"') + ' Add exercise</button><button class="btn grow" data-act="generate">Shuffle</button></div>' +
    '<button class="btn primary block" data-act="startPlan"' + (items.length ? '' : ' disabled') + '>Start workout</button>' + (items.length ? '<div class="row" style="gap:8px"><button class="btn grow" data-act="wkSendPlan">👥 Send to a friend</button><button class="btn grow" data-act="wkSavePlan">☆ Save</button></div>' : '') + '</div>';
}

/* --- active workout --- */
function viewWorkout() {
  var d = S.draft, unitL = uLabel(), totalDone = 0, vol = 0;
  d.ex.forEach(function (e) { e.sets.forEach(function (s) { if (s.done && !s.wu) { totalDone++; vol += (+s.w || 0) * (+s.r || 0); } }); });
  var cards = d.ex.map(function (e, xi) {
    var ex = BYNAME[e.n], ls = lastSession(realWorkouts(), e.n), bw = isBW(ex);
    var li = loadInfo(ex), rows = '<div class="hd">SET</div><div class="hd">PREVIOUS</div><div class="hd">' + esc(li.h) + '</div><div class="hd">REPS</div><div class="hd"></div>';
    var wi = -1;
    e.sets.forEach(function (s, si) {
      if (!s.wu) wi++;
      var pv = !s.wu && ls && ls.e.sets[wi] ? ls.e.sets[wi] : null, pt = pv ? ((bw && !pv.w) ? pv.r + ' reps' : fmtW(pv.w, unit()) + ' × ' + pv.r) : '–';
      rows += '<div class="sn' + (s.wu ? ' wu' : '') + '">' + (s.wu ? 'W' : wi + 1) + '</div><div class="prev">' + pt + '</div>' +
        '<div class="' + (s.done ? 'done' : '') + '"><input inputmode="decimal" data-k="w" data-x="' + xi + '" data-s="' + si + '" class="' + (s.sug && !s.done ? 'sug' : '') + '" value="' + (s.w == null ? '' : toDisp(s.w, unit())) + '" placeholder="' + (bw ? '0' : '–') + '" aria-label="Set ' + (si + 1) + ' weight"></div>' +
        '<div class="' + (s.done ? 'done' : '') + '"><input inputmode="numeric" data-k="r" data-x="' + xi + '" data-s="' + si + '" class="' + (s.sug && !s.done ? 'sug' : '') + '" value="' + (s.r == null ? '' : s.r) + '" placeholder="0" aria-label="Set ' + (si + 1) + ' reps"></div>' +
        '<button class="ck' + (s.done ? ' on' : '') + '" data-act="toggleSet" data-x="' + xi + '" data-s="' + si + '" aria-pressed="' + !!s.done + '" aria-label="Mark set ' + (si + 1) + ' done">' + ico('check') + '</button>';
    });
    return '<div class="xcard"><div class="xcard-head"><button class="thumb" data-act="openEx" data-n="' + esc(e.n) + '" aria-label="View ' + esc(e.n) + '">' + demoHTML(ex, false) + '</button><div class="grow"><button class="xname xlink" data-act="openEx" data-n="' + esc(e.n) + '">' + esc(e.n) + ' <span class="info-i" aria-hidden="true">i</span></button><div class="target">Target ' + e.sets.filter(function (q) { return !q.wu; }).length + ' × ' + e.lo + '–' + e.hi + ' · <button class="linkbtn" data-act="restCycle" data-x="' + xi + '" aria-label="Change rest time">rest ' + fmtDur(e.rest) + '</button>' + (isBarbell(ex) ? ' · <button class="linkbtn accent" data-act="plates" data-x="' + xi + '">Plates</button>' : '') + '</div>' + injBadge(ex) + (li.s ? '<button class="loadhint" data-act="loadInfo" data-n="' + esc(e.n) + '">⚖️ ' + esc(li.s) + '</button>' : '') + (S.settings.notes[e.n] ? '<div class="xnote">' + esc(S.settings.notes[e.n]) + '</div>' : '') + '</div><button class="icon-btn" data-act="swapEx" data-x="' + xi + '" aria-label="Swap ' + esc(e.n) + ' for a similar exercise">' + ico('shuffle') + '</button><button class="icon-btn" data-act="rmEx" data-x="' + xi + '" aria-label="Remove ' + esc(e.n) + '">' + ico('x') + '</button></div>' +
      '<div class="sets">' + rows + '</div><div class="row"><button class="btn small ghost grow" data-act="addSet" data-x="' + xi + '" aria-label="Add a set">+ Set</button>' + (!bw && !e.sets.some(function (q) { return q.wu; }) && !e.sets.some(function (q) { return q.done; }) ? '<button class="btn small ghost grow" data-act="warmup" data-x="' + xi + '">+ Warm-up</button>' : '') + (e.sets.length > 1 ? '<button class="btn small ghost grow" data-act="rmSet" data-x="' + xi + '" aria-label="Remove a set">– Set</button>' : '') + '</div></div>';
  }).join('');
  return '<div class="screen" style="gap:14px;padding-top:0"><div class="wk-top"><div><div class="clock" id="clock">0:00</div></div><div class="grow note" id="wk-stats">' + totalDone + (totalDone === 1 ? ' set' : ' sets') + ' · ' + volDisp(vol) + ' ' + unitL + '</div><button class="btn primary small" data-act="finish">Finish</button></div>' +
    (cards || '<div class="empty"><h3>Empty workout</h3>Add your first exercise.</div>') +
    (d.ex.length ? '<button class="btn block ghost" data-act="wkSendDraft">👥 Invite a friend to this workout</button>' : '') +
    '<button class="btn block" data-act="pickDraft">' + ico('plus').replace('<svg', '<svg width="18" height="18"') + ' Add exercise</button>' +
    (U.confirm === 'discard' ? '<div class="banner"><span>Discard this workout? Nothing will be saved.</span><span class="row"><button class="btn small danger" data-act="discard2">Discard</button><button class="btn small" data-act="noconfirm">Keep</button></span></div>' : '<button class="btn block ghost danger" data-act="discard">Discard workout</button>') + '</div>';
}

/* --- library --- */
function viewLib() {
  var list = filterEx(U.libQ, U.libGroups, U.libGear, U.libCat, U.libItem);
  var cats = '<option value="all">All types</option>' + Object.keys(CATS).map(function (k) { return '<option value="' + k + '"' + (U.libCat === k ? ' selected' : '') + '>' + CATS[k] + '</option>'; }).join('');
  var itemOpts = '<option value="all">Any equipment</option>' + ITEM_GROUPS.map(function (g) { return '<optgroup label="' + esc(g) + '">' + ITEMS.filter(function (i) { return i.g === g; }).map(function (i) { return '<option value="' + i.id + '"' + (U.libItem === i.id ? ' selected' : '') + '>' + esc(i.n) + '</option>'; }).join('') + '</optgroup>'; }).join('');
  return '<div class="screen"><div class="screen-head"><div><div class="sub">' + EX.length + ' exercises with demos</div><h1>Library</h1></div></div>' +
    '<input class="input" id="libq" type="search" placeholder="Search exercises" value="' + esc(U.libQ) + '" aria-label="Search exercises">' +
    groupChips(U.libGroups, 'libGroup') +
    '<div class="seg" role="group" aria-label="Gear"><button aria-pressed="' + (U.libGear === 'mine') + '" data-act="libGear" data-k="mine">My ' + profName().toLowerCase() + ' gear</button><button aria-pressed="' + (U.libGear === 'all') + '" data-act="libGear" data-k="all">All gear</button></div>' +
    '<div class="row"><select class="input grow" id="libitem" aria-label="Equipment">' + itemOpts + '</select><select class="input grow" id="libcat" aria-label="Exercise type">' + cats + '</select></div>' +
    '<div class="note" id="libcount">' + list.length + ' match' + (list.length === 1 ? '' : 'es') + '</div><div id="liblist">' + libList(list, U.libShown, 'openEx') + '</div></div>';
}
function refreshLibList() {
  var list = filterEx(U.libQ, U.libGroups, U.libGear, U.libCat, U.libItem);
  var c = $('#libcount'), l = $('#liblist'); if (c) c.textContent = list.length + ' match' + (list.length === 1 ? '' : 'es'); if (l) l.innerHTML = libList(list, U.libShown, 'openEx');
}

/* --- progress --- */
function histRow(w) {
  var g = groupsHit(w).slice(0, 3).join(' · ') || 'Workout';
  return '<button class="hrow" data-act="openHist" data-id="' + esc(w.id) + '"><div class="d">' + fmtDate(w.t).split(' ')[1] + '<small>' + fmtDate(w.t).split(' ')[0] + '</small></div><div class="grow"><div class="xname">' + esc(g) + '</div><div class="xmeta">' + workoutSets(w) + ' sets · ' + volDisp(workoutVolume(w)) + ' ' + uLabel() + ' · ' + Math.round(w.dur / 60) + ' min</div></div></button>';
}
function viewProg() {
  var seg = U.seg, W = statWorkouts(), sample = isSample();
  var head = '<div class="screen-head"><div><div class="sub">Strength over time</div><h1>Progress</h1></div></div>' +
    '<div class="seg" role="tablist"><button role="tab" aria-selected="' + (seg === 'muscles') + '" data-act="seg" data-k="muscles">Muscles</button><button role="tab" aria-selected="' + (seg === 'lifts') + '" data-act="seg" data-k="lifts">Lifts</button><button role="tab" aria-selected="' + (seg === 'history') + '" data-act="seg" data-k="history">History</button></div>' +
    (sample ? '<div class="banner"><span><b>Example data.</b> Finish your first workout and this is replaced by your own.</span></div>' : '');
  var body;
  if (seg === 'muscles') body = progMuscles(W);
  else if (seg === 'lifts') body = progLifts(W);
  else body = progHistory(W);
  return '<div class="screen">' + head + body + '</div>';
}
function bodyPrompt() {
  return '<div class="card section" style="gap:12px"><h3 style="font-size:22px">See how you rank</h3><div class="note">Add your height, weight and sex to get a 1–100 rank for every muscle group, where 100 is the strongest of people your size.</div><button class="btn primary block" data-act="bodyEdit">Add height &amp; weight</button></div>';
}
function progMuscles(W) {
  var B = profB();
  if (!B) return bodyPrompt() + progMusclesIndex(W);
  var H = allHistories(W), now = Date.now(), ov = overallRankAt(H, B, now), ov30 = overallRankAt(H, B, now - 30 * DAY);
  var chip = '<button class="chip" style="min-height:32px;font-size:13px" data-act="bodyEdit">' + esc(bodyText(B)) + ' · edit</button>';
  if (!ov) return '<div class="empty"><h3>No rank yet</h3>Log sets with weight and reps. Each lift is compared with people who are ' + esc(bodyText(B)) + '.</div>' + chip;
  var series = []; for (var k = 12; k >= 0; k--) { var t = now - k * 7 * DAY, o = overallRankAt(H, B, t); if (o) series.push({ t: t, v: o.pct }); }
  var idx = overallScore(H, now), idx30 = overallScore(H, now - 30 * DAY);
  var hero = '<div class="card section"><div class="field-label" style="margin:0">Overall strength rank</div><div class="score-hero"><div class="big">' + ov.score + '</div><div style="padding-bottom:4px"><div class="tier">' + tierOf(ov.score) + '</div><div>' + deltaHTML(ov30 ? ov.score - ov30.score : null, ' pts') + '</div></div></div>' +
    '<div class="note">Stronger than about ' + Math.round(ov.pct) + '% of lifters your size. 100 is the strongest of people with your height, weight and sex. Based on ' + ov.groups + ' of ' + GROUPS.length + ' muscle groups.</div>' + lineChart(series, { base: 50, label: 'Overall rank over time', fmt: function (v) { return Math.round(v); } }) + '<div>' + chip + '</div></div>';
  var rows = GROUPS.map(function (g) {
    var cur = groupRankAt(H, g, B, now), old = groupRankAt(H, g, B, now - 30 * DAY);
    return { g: g, cur: cur, d: cur && old ? cur.score - old.score : null, ser: groupRankSeries(H, g, B, now, 12) };
  }).sort(function (a, b) { return (b.cur ? b.cur.score : -1) - (a.cur ? a.cur.score : -1); });
  var cards = rows.map(function (r) {
    if (!r.cur) return '<div class="gcard empty"><div class="gn">' + r.g + '</div><div class="gs">–</div><div class="note" style="grid-column:1/-1">No ranked lifts logged yet</div></div>';
    return '<button class="gcard" data-act="openGroup" data-g="' + r.g + '"><div><div class="gn">' + r.g + ' <span class="faint" style="font-weight:500;font-size:13px">· ' + tierOf(r.cur.score) + '</span></div>' + deltaHTML(r.d, ' pts') + '</div><div class="gs">' + r.cur.score + '</div>' + spark(r.ser, 50) + '</button>';
  }).join('');
  var idxLine = idx == null ? '' : '<div class="card row" style="gap:12px"><div class="grow"><div class="xname">Progress vs. your own start</div><div class="xmeta">100 is where you began on each lift</div></div><div class="num" style="font-size:30px">' + Math.round(idx) + '</div>' + deltaHTML(idx30 == null ? null : idx - idx30, '') + '</div>';
  return hero + '<div class="section"><h2>Muscle groups</h2>' + cards + '</div>' + idxLine + '<div class="note">Rank compares your best set of the last 4 weeks with strength standards for lifters of your sex and size, then averages the lifts for each muscle. Dumbbell lifts: enter the weight of one dumbbell. It is an estimate against people who train, not the general public.</div>';
}
function progMusclesIndex(W) {
  var H = allHistories(W), now = Date.now(), ov = overallScore(H, now), ov30 = overallScore(H, now - 30 * DAY);
  if (ov == null) return '<div class="empty"><h3>No scores yet</h3>Log sets with weight and reps, and each muscle group gets a score.</div>';
  var series = []; for (var k = 12; k >= 0; k--) { var t = now - k * 7 * DAY, s = overallScore(H, t); if (s != null) series.push({ t: t, v: s }); }
  var hero = '<div class="card section"><div class="score-hero"><div class="big">' + Math.round(ov) + '</div><div style="padding-bottom:4px"><div>' + deltaHTML(ov30 == null ? null : ov - ov30, ' pts') + '</div><div class="note">last 30 days</div></div></div><div class="note">Strength index. 100 is where you started on each lift; 120 means 20% stronger.</div>' + lineChart(series, { base: 100, label: 'Overall strength index' }) + '</div>';
  var rows = GROUPS.map(function (g) {
    var cur = groupScoreAt(H, g, now), old = groupScoreAt(H, g, now - 30 * DAY);
    return { g: g, cur: cur, d: cur && old ? cur.score - old.score : null, ser: groupSeries(H, g, now, 12) };
  }).sort(function (a, b) { return (b.cur ? b.cur.score : -1) - (a.cur ? a.cur.score : -1); });
  var cards = rows.map(function (r) {
    if (!r.cur) return '<div class="gcard empty"><div class="gn">' + r.g + '</div><div class="gs">–</div><div class="note" style="grid-column:1/-1">No lifts logged yet</div></div>';
    return '<button class="gcard" data-act="openGroup" data-g="' + r.g + '"><div><div class="gn">' + r.g + '</div>' + deltaHTML(r.d, '') + '</div><div class="gs">' + Math.round(r.cur.score) + '</div>' + spark(r.ser, 100) + '</button>';
  }).join('');
  return hero + '<div class="section"><h2>Muscle groups</h2>' + cards + '</div>';
}
function progLifts(W) {
  var H = allHistories(W), names = Object.keys(H).sort(function (a, b) { return H[b][H[b].length - 1].t - H[a][H[a].length - 1].t; });
  if (!names.length) return '<div class="empty"><h3>No lifts yet</h3>Your exercises show up here after your first workout.</div>';
  return '<div class="card" style="padding:0 14px">' + names.map(function (n) {
    var h = H[n], ex = BYNAME[n], bw = isBW(ex), first = h[0].best, cur = h[h.length - 1].best, best = Math.max.apply(null, h.map(function (x) { return x.best; }));
    var pct = first ? (cur / first - 1) * 100 : 0;
    var pts = h.map(function (x) { return { t: x.t, v: x.best }; });
    return '<button class="xrow" style="flex-wrap:wrap" data-act="openLift" data-n="' + esc(n) + '"><div class="grow"><div class="xname">' + esc(n) + '</div><div class="xmeta">' + (bw ? 'Best ' + Math.round(best) + ' reps' : 'Est. 1RM ' + toDisp(cur, unit()) + ' ' + uLabel()) + ' · ' + h.length + ' session' + (h.length > 1 ? 's' : '') + '</div></div>' + deltaHTML(h.length > 1 ? pct : null, '%') + '<div style="flex-basis:100%">' + spark(pts, first) + '</div></button>';
  }).join('') + '</div>';
}
function progHistory(W) {
  if (!W.length) return '';
  var list = W.slice().reverse();
  return calendarHTML(W) + '<div class="card" style="padding:0 14px">' + list.map(histRow).join('') + '</div>';
}
function liftSheet(name, metric) {
  metric = metric || 'e1rm';
  var ex = BYNAME[name], H = allHistories(statWorkouts())[name]; if (!H) return;
  var bw = isBW(ex), u = unit(), conv = function (lb) { return u === 'kg' ? lb / LB : lb; };
  var pts = H.map(function (x) { return { t: x.t, v: metric === 'vol' ? conv(x.vol) : metric === 'top' ? (bw ? x.topR : conv(x.topW)) : (bw ? x.best : conv(x.best)) }; });
  var first = H[0].best, cur = H[H.length - 1].best, best = Math.max.apply(null, H.map(function (x) { return x.best; }));
  var wtd = bw && H.some(function (x) { return x.topW > 0; });
  var fmtv = function (lb) { return bw ? (wtd ? '≈' : '') + Math.round(lb) + ' reps' : toDisp(lb, u) + ' ' + uLabel(); };
  var segs = bw ? '' : '<div class="seg" role="group"><button aria-pressed="' + (metric === 'e1rm') + '" data-act="liftMetric" data-n="' + esc(name) + '" data-k="e1rm">Est. 1RM</button><button aria-pressed="' + (metric === 'top') + '" data-act="liftMetric" data-n="' + esc(name) + '" data-k="top">Top weight</button><button aria-pressed="' + (metric === 'vol') + '" data-act="liftMetric" data-n="' + esc(name) + '" data-k="vol">Volume</button></div>';
  var body = segs + lineChart(pts, { label: name + ' trend', fmt: function (v) { return metric === 'vol' ? (v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)) : Math.round(v * 10) / 10; } }) +
    '<div class="grid2"><div class="stat"><div class="v">' + fmtv(best) + '</div><div class="k">Best' + (bw ? '' : ' (est. 1RM)') + '</div></div><div class="stat"><div class="v">' + (H.length > 1 ? (cur >= first ? '+' : '') + Math.round((cur / first - 1) * 100) + '%' : '–') + '</div><div class="k">Since first session</div></div><div class="stat"><div class="v">' + fmtv(first) + '</div><div class="k">First session</div></div><div class="stat"><div class="v">' + H.length + '</div><div class="k">Sessions</div></div></div>' +
    '<div class="section"><h3 style="font-size:20px">Recent sessions</h3><div>' + H.slice(-6).reverse().map(function (x) { return '<div class="lrow"><span>' + fmtDateLong(x.t) + '</span><span class="num" style="font-size:18px">' + (bw && !x.topW ? x.topR + ' reps' : toDisp(x.topW, u) + ' ' + uLabel() + loadSuffix(ex) + ' × ' + x.topR) + (x.best >= best - 1e-6 && H.length > 1 ? '<span class="pr">BEST</span>' : '') + '</span></div>'; }).join('') + '</div></div>' +
    (bw ? '' : pctTable(cur)) + liftRankCard(name, H) +
    '<button class="btn block" data-act="openEx" data-n="' + esc(name) + '">How to do this exercise</button>';
  openSheet(name, body);
}
function liftRankCard(name, H) {
  var ex = BYNAME[name], k = parseK(ex.k); if (!k || !DATA.std[k.cls]) return '<div class="note">This exercise has no strength standard for your size, so it does not affect your rank.</div>';
  var B = profB();
  if (!B) return '<div class="card section" style="gap:10px"><div class="xname">Targets for your size</div><div class="note">Add your height, weight and sex to see what novice to elite looks like for someone your size on this lift.</div><button class="btn small" data-act="bodyEdit">Add height &amp; weight</button></div>';
  var now = Date.now(), r = H && H.length ? exerciseRank(name, H, B, now) : null;
  var a = r ? r.anchors : stdAt(k.cls, B.sex, effBW(B.sex, B.h, curWeightLb(B))); if (!a) return '';
  var rep = DATA.std[k.cls].u === 'reps', lbls = ['Novice', 'Intermediate', 'Advanced', 'Elite'], pd = DATA.std[k.cls].pd;
  var each = pd && ex.eq !== 'barbell' ? ' each' : '', u = uLabel();
  // weight used last time, for "reps at your weight" on weighted bodyweight moves
  var lastW = 0; if (rep && H && H.length) lastW = H[H.length - 1].topW || 0;
  var tbl = lbls.map(function (l, i) {
    var v = a[i + 1] * k.m, right;
    if (rep) {
      var rr = Math.max(1, Math.round(v));
      right = rr + ' reps' + (lastW > 0 ? '<span class="faint" style="font-size:13px;display:block;text-align:right">or ' + Math.max(1, Math.round(repsAtLoad(ex, v, lastW))) + ' reps with +' + toDisp(lastW, unit()) + ' ' + u + '</span>' : '');
    } else {
      var rw = function (lb) { var st = unit() === 'kg' ? 2.5 : 5, d = unit() === 'kg' ? lb / LB : lb; return Math.round(d / st) * st; };
      right = rw(v) + ' ' + u + each + '<span class="faint" style="font-size:13px;display:block;text-align:right">≈ ' + rw(v / (1 + 8 / 30)) + ' ' + u + each + ' × 8</span>';
    }
    var hit = r && r.eq * k.m >= v;
    return '<div class="lrow"><span>' + (hit ? '✓ ' : '') + l + '</span><span class="num" style="font-size:18px">' + right + '</span></div>';
  }).join('');
  var head = r ? '<div class="row" style="gap:14px"><div class="num" style="font-size:52px;line-height:.9">' + (r.est ? '≈' : '') + r.score + '</div><div class="grow"><div class="xname">' + tierOf(r.score) + ' for your size</div><div class="note">Stronger than about ' + Math.round(r.pct) + '% of ' + esc(bodyText(B)) + (r.est ? '. Estimated from the ' + CLASS_NAME[r.cls].toLowerCase() + ' standard.' : '.') + '</div></div></div>'
    : '<div class="xname">Targets for your size</div><div class="note">For ' + esc(bodyText(B)) + '. Log this lift once to get your own rank.</div>';
  var bwNote = rep && isBW(ex) ? '<div class="note">Added weight counts. A vest, belt or plate turns into extra bodyweight reps, e.g. ' + (function () { var w = unit() === 'kg' ? 10 * LB : 25, r0 = 10, eq = Math.round(bwEqReps(ex, w, r0)); return '+' + toDisp(w, unit()) + ' ' + u + ' × ' + r0 + ' counts as about ' + eq + ' reps'; })() + ' for you.</div>' : '';
  return '<div class="card section" style="gap:10px">' + head +
    '<div><span class="field-label" style="margin-bottom:2px">' + (r ? 'Targets for your size' : 'Levels') + (rep ? ' (reps in one set)' : ' (est. 1-rep max, and what that means for 8 reps)') + '</span>' + tbl + '</div>' + bwNote + '</div>';
}
function groupSheet(g) {
  var B = profB();
  if (B) return groupRankSheet(g, B);
  var W = statWorkouts(), H = allHistories(W), now = Date.now(), cur = groupScoreAt(H, g, now);
  var ser = groupSeries(H, g, now, 24), rows = [];
  Object.keys(H).forEach(function (n) {
    var ex = BYNAME[n], w = ex.p.indexOf(g) >= 0 ? 'Primary' : (ex.s.indexOf(g) >= 0 ? 'Secondary' : null); if (!w) return;
    var r = exIndexAt(H[n], now); if (r) rows.push({ n: n, idx: r.idx, role: w });
  });
  rows.sort(function (a, b) { return (a.role === 'Primary' ? 0 : 1) - (b.role === 'Primary' ? 0 : 1) || b.idx - a.idx; });
  var body = '<div class="score-hero"><div class="big">' + Math.round(cur.score) + '</div><div class="note" style="padding-bottom:6px">strength index</div></div>' + lineChart(ser, { base: 100, label: g + ' strength index' }) +
    '<div class="section"><h3 style="font-size:20px">What counts toward it</h3><div>' + rows.map(function (r) { return '<button class="lrow" style="width:100%;text-align:left" data-act="openLift" data-n="' + esc(r.n) + '"><span>' + esc(r.n) + ' <span class="faint">· ' + r.role + '</span></span><span class="num" style="font-size:18px">' + Math.round(r.idx) + '</span></button>'; }).join('') + '</div></div><div class="note">Each lift is compared with your first session on it, using estimated 1-rep max (reps for bodyweight moves). Secondary muscles count for less.</div>';
  openSheet(g, body);
}
function groupRankSheet(g, B) {
  var W = statWorkouts(), H = allHistories(W), now = Date.now(), cur = groupRankAt(H, g, B, now); if (!cur) return;
  var old = groupRankAt(H, g, B, now - 30 * DAY), ser = groupRankSeries(H, g, B, now, 24), idx = groupScoreAt(H, g, now), rows = [];
  Object.keys(H).forEach(function (n) {
    var ex = BYNAME[n], role = ex.p.indexOf(g) >= 0 ? 'Primary' : (ex.s.indexOf(g) >= 0 ? 'Secondary' : null); if (!role) return;
    var r = exerciseRank(n, H[n], B, now), ix = exIndexAt(H[n], now); rows.push({ n: n, role: role, r: r, idx: ix ? ix.idx : null });
  });
  rows.sort(function (a, b) { return (a.role === 'Primary' ? 0 : 1) - (b.role === 'Primary' ? 0 : 1) || (b.r ? b.r.score : -1) - (a.r ? a.r.score : -1); });
  var body = '<div class="score-hero"><div class="big">' + cur.score + '</div><div style="padding-bottom:4px"><div class="tier">' + tierOf(cur.score) + '</div>' + deltaHTML(old ? cur.score - old.score : null, ' pts') + '</div></div>' +
    '<div class="note">Stronger than about ' + Math.round(cur.pct) + '% of lifters who are ' + esc(bodyText(B)) + '.</div>' + lineChart(ser, { base: 50, label: g + ' rank over time', fmt: function (v) { return Math.round(v); } }) +
    (idx ? '<div class="grid2"><div class="stat"><div class="v">' + Math.round(idx.score) + '</div><div class="k">Progress vs. your start</div></div><div class="stat"><div class="v">' + cur.n + '</div><div class="k">Ranked lifts</div></div></div>' : '') +
    '<div class="section"><h3 style="font-size:20px">What counts toward it</h3><div>' + rows.map(function (r) { return '<button class="lrow" style="width:100%;text-align:left" data-act="openLift" data-n="' + esc(r.n) + '"><span>' + esc(r.n) + ' <span class="faint">· ' + r.role + '</span></span><span class="num" style="font-size:18px">' + (r.r ? (r.r.est ? '≈' : '') + r.r.score : '<span class="faint">no rank</span>') + '</span></button>'; }).join('') + '</div></div>' +
    '<div class="note">Each lift is ranked against standards for your sex and body size. A lift marked ≈ has no exact standard, so it is estimated from a similar lift and counts for less. Secondary muscles count for less too.</div>';
  openSheet(g, body);
}
function histSheet(id) {
  var w = statWorkouts().filter(function (x) { return x.id === id; })[0]; if (!w) return;
  var prior = S.workouts.filter(function (x) { return x.t < w.t; }), prs = findPRs(prior, w).map(function (p) { return p.n; });
  var body = '<div class="grid2"><div class="stat"><div class="v">' + Math.round(w.dur / 60) + ' min</div><div class="k">Duration</div></div><div class="stat"><div class="v">' + volDisp(workoutVolume(w)) + ' ' + uLabel() + '</div><div class="k">Volume</div></div></div>' +
    w.ex.map(function (e) { var ex = BYNAME[e.n]; return '<div class="section"><div class="row"><div class="thumb" style="width:64px">' + demoHTML(ex, false) + '</div><div class="xname grow">' + esc(e.n) + (prs.indexOf(e.n) >= 0 ? '<span class="pr">PR</span>' : '') + '</div></div><div>' + e.sets.map(function (s, i) { return '<div class="lrow"><span class="muted">Set ' + (i + 1) + '</span><span class="num" style="font-size:18px">' + (isBW(ex) && !s.w ? s.r + ' reps' : toDisp(s.w, unit()) + ' ' + uLabel() + loadSuffix(ex) + ' × ' + s.r) + '</span></div>'; }).join('') + '</div></div>'; }).join('') +
    (w.sample ? '' : (U.confirm === 'delhist' ? '<div class="banner"><span>Delete this workout?</span><span class="row"><button class="btn small danger" data-act="delhist2" data-id="' + esc(w.id) + '">Delete</button><button class="btn small" data-act="histCancel" data-id="' + esc(w.id) + '">Keep</button></span></div>' : '<button class="btn block ghost danger" data-act="delhist" data-id="' + esc(w.id) + '">Delete workout</button>'));
  if (!S.draft) body = '<button class="btn primary block" data-act="repeatW" data-id="' + esc(w.id) + '">Do this workout again</button>' + body;
  if (!w.sample) body = body + '<div class="row" style="gap:8px"><button class="btn grow" data-act="wkSendHist" data-id="' + esc(w.id) + '">👥 Send</button><button class="btn grow" data-act="wkSaveHist" data-id="' + esc(w.id) + '">☆ Save</button></div>';
  if (!w.sample) body = body + '<div class="row"><button class="btn grow" data-act="editW" data-id="' + esc(w.id) + '">Edit</button><button class="btn grow" data-act="shareW" data-id="' + esc(w.id) + '">Share</button></div>';
  openSheet(fmtDateLong(w.t), body);
}

/* --- settings --- */
function bodyCard() {
  var B = S.settings.body, ok = bodyReady(B);
  return '<div class="card" style="display:flex;flex-direction:column;gap:10px">' + (ok ? '<div class="row"><div class="grow"><div class="xname">' + esc(bodyText(B)) + '</div><div class="xmeta">Used for your 1–100 strength rank</div></div><button class="btn small" data-act="bodyEdit">Edit</button></div>' : '<div class="note">Enter your height, weight and sex. Your strength rank compares you with people your size.</div><button class="btn primary block" data-act="bodyEdit">Add height &amp; weight</button>') + '</div>';
}
function bodySheet() {
  var b = S.settings.body, u = unit(), cw = curWeightLb(b), hf = b.h ? cm2ftin(b.h) : { ft: '', inch: '' };
  U.bsex = b.sex;
  var hfield = u === 'lb' ? '<div class="row"><input class="input" id="b-ft" inputmode="numeric" placeholder="ft" value="' + hf.ft + '" aria-label="Height feet"><input class="input" id="b-in" inputmode="numeric" placeholder="in" value="' + hf.inch + '" aria-label="Height inches"></div>' : '<input class="input" id="b-cm" inputmode="numeric" placeholder="cm" value="' + (b.h ? Math.round(b.h) : '') + '" aria-label="Height in centimetres">';
  var log = (b.log || []).slice(-6).reverse().map(function (x) { return '<div class="lrow"><span>' + fmtDateLong(x.t) + '</span><span class="row" style="gap:8px"><span class="num" style="font-size:18px">' + toDisp(x.w, u) + ' ' + uLabel() + '</span><button class="icon-btn" style="width:30px;height:30px" data-act="bodyDel" data-t="' + x.t + '" aria-label="Delete weigh-in">' + ico('x') + '</button></span></div>'; }).join('');
  openSheet('Your body', '<div><span class="field-label">Sex</span><div class="seg" role="group" aria-label="Sex"><button id="bs-M" aria-pressed="' + (b.sex === 'M') + '" data-act="bodySex" data-k="M">Male</button><button id="bs-F" aria-pressed="' + (b.sex === 'F') + '" data-act="bodySex" data-k="F">Female</button></div></div>' +
    '<div><span class="field-label">Height</span>' + hfield + '</div>' +
    '<div><span class="field-label">Body weight (' + uLabel() + ')</span><input class="input" id="b-w" inputmode="decimal" placeholder="' + uLabel() + '" value="' + (cw ? toDisp(cw, u) : '') + '" aria-label="Body weight"></div>' +
    '<div class="note" id="b-err" style="color:var(--down);min-height:0"></div><button class="btn primary block" data-act="bodySave">Save</button>' +
    '<div class="note">Rank is an estimate: it compares your lifts with strength standards for people of your sex and body size who train. Log a new weight any time and your rank updates.</div>' +
    (log ? '<div class="section"><h3 style="font-size:20px">Weigh-ins</h3><div>' + log + '</div></div>' : ''));
}
function bodySave() {
  var u = unit(), err = function (m) { var e = $('#b-err'); if (e) e.textContent = m; }, b = S.settings.body;
  var h = u === 'lb' ? ft2cm($('#b-ft').value, $('#b-in').value) : parseFloat($('#b-cm').value), w = fromDisp($('#b-w').value, u);
  if (U.bsex !== 'M' && U.bsex !== 'F') return err('Pick male or female.');
  if (!(h >= 120 && h <= 230)) return err(u === 'lb' ? 'Enter a height between 4 ft and 7 ft 6 in.' : 'Enter a height between 120 and 230 cm.');
  if (!(w >= 70 && w <= 600)) return err('Enter your body weight.');
  b.sex = U.bsex; b.h = Math.round(h * 10) / 10;
  var cur = curWeightLb(b);
  if (!cur || Math.abs(cur - w) > 0.05) {
    var d = new Date(), t0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    b.log = (b.log || []).filter(function (x) { return x.t < t0; }); b.log.push({ t: Date.now(), w: Math.round(w * 10) / 10 });
    b.log = b.log.slice(-300);
  }
  b.w = curWeightLb(b);
  persist({ settings: true }); closeSheet(); render(); toast('Saved');
}

function viewSettings() {
  var st = S.settings;
  var status = dbState === 'synced' ? 'Saved to your Claude account and this device.' : dbState === 'error' ? 'Could not reach your account just now. Saved on this device and retrying.' : dbState === 'pending' ? 'Connecting…' : 'Saved on this device only. Back up regularly.';
  return '<div class="screen"><div class="screen-head"><h1>Settings</h1></div>' +
    '<div class="section"><span class="field-label">Weight units</span><div class="seg" role="group"><button aria-pressed="' + (st.unit === 'lb') + '" data-act="unit" data-k="lb">Pounds</button><button aria-pressed="' + (st.unit === 'kg') + '" data-act="unit" data-k="kg">Kilograms</button></div></div>' +
    injurySettingsHTML() +
    '<div class="section"><span class="field-label">Rest timer chime</span><div class="seg" role="group" aria-label="Rest timer chime"><button aria-pressed="' + (st.chime !== false) + '" data-act="chimeOpt" data-k="on">On</button><button aria-pressed="' + (st.chime === false) + '" data-act="chimeOpt" data-k="off">Off</button></div><div class="note">A short chime when rest is over, through your headphones or speaker. Keep the app open on screen (it stays awake during workouts); iPhones pause web apps that are in the background.</div></div>' +
    '<div class="section"><span class="field-label">Bottom corner</span><div class="seg" role="group" aria-label="Bottom corner space"><button aria-pressed="' + (st.lift !== false) + '" data-act="liftOpt" data-k="on">Keep clear</button><button aria-pressed="' + (st.lift === false) + '" data-act="liftOpt" data-k="off">Off</button></div><div class="note">Leaves room under the tab bar so a hosting badge (like "Powered by Netlify") cannot cover buttons.</div></div>' +
    '<div class="section"><h2>Your body</h2>' + bodyCard() + '</div>' +
    '<div class="section"><h2>Equipment</h2><div class="seg" role="group" aria-label="Which place to edit"><button aria-pressed="' + (st.profile === 'gym') + '" data-act="profile" data-k="gym">Gym</button><button aria-pressed="' + (st.profile === 'home') + '" data-act="profile" data-k="home">Home</button></div><div class="note">Tick what is available at your ' + profName().toLowerCase() + '. Built workouts only use ticked equipment; the Train tab switches between Gym and Home.</div>' + gearGrid() + '</div>' +
    '<div class="section"><span class="field-label">Exercise difficulty</span><div class="seg" role="group"><button aria-pressed="' + (st.level === 'beginner') + '" data-act="level" data-k="beginner">Beginner</button><button aria-pressed="' + (st.level === 'intermediate') + '" data-act="level" data-k="intermediate">Intermediate</button><button aria-pressed="' + (st.level === 'expert') + '" data-act="level" data-k="expert">Advanced</button></div></div>' +
    '<div class="section"><h2>Your data</h2><div class="note">' + status + '</div>' +
    '<div class="card section" style="gap:10px"><div class="xname">Backup file</div><div class="note">' + (st.lastBackup ? 'Last file saved ' + fmtDateLong(st.lastBackup) + '. ' : 'No backup file saved yet. ') + 'One file with everything: workouts, equipment, body stats. On iPhone it opens the share sheet. Choose <b>Save to Files</b> (iCloud Drive, or Google Drive if you have the app), or send it to yourself.</div><button class="btn primary block" data-act="exportFile">Save backup file</button><label class="btn block" for="restorefile" style="cursor:pointer">Restore from a backup file…</label><input type="file" id="restorefile" accept=".json,application/json,text/plain" hidden></div>' +
    '<div class="card section" style="gap:10px"><div class="xname">Spreadsheet</div><div class="note">Every set you have logged, ready for Excel, Numbers or Google Sheets.</div><button class="btn block" data-act="exportCsv">Export to spreadsheet (CSV)</button></div>' +
    '<details class="card"><summary style="cursor:pointer;font-weight:600">Copy as text instead</summary><div class="section" style="gap:10px;margin-top:10px"><button class="btn block" data-act="exportCopy">Copy backup text</button><textarea class="input" id="restore" rows="3" style="padding:10px 14px;min-height:80px" placeholder="Paste backup text here to restore"></textarea><button class="btn block" data-act="restore">Restore from pasted text</button></div></details>' +
    (U.confirm === 'wipe' ? '<div class="banner"><span>Delete every workout and setting?</span><span class="row"><button class="btn small danger" data-act="wipe2">Delete all</button><button class="btn small" data-act="noconfirm">Keep</button></span></div>' : '<button class="btn block ghost danger" data-act="wipe">Delete all data</button>') + '</div>' +
    '<div class="note">Strength is estimated with the Epley formula: weight × (1 + reps ÷ 30). Ranks compare that with strength standards from strengthlevel.com. Exercise demos come from the open Free Exercise DB (public domain).</div></div>';
}

/* ===== timers ===== */
var tickT = null;
function tick() {
  var c = $('#clock'), c2 = $('#clock2');
  if (S.draft) { var s = fmtDur((Date.now() - S.draft.t) / 1000); if (c) c.textContent = s; if (c2) c2.textContent = s; }
  var rb = $('#restbar');
  if (!rb) return;
  document.body.classList.toggle('resting', !!U.rest);
  if (!U.rest) { if (!rb.hidden || rb.innerHTML) { rb.hidden = true; rb.dataset.k = ''; rb.innerHTML = ''; } return; }
  var left = Math.ceil((U.rest.end - Date.now()) / 1000);
  if (left <= 0 && !U.rest.done) { U.rest.done = true; U.rest.doneAt = Date.now(); beep(); try { if (navigator.vibrate) navigator.vibrate([220, 120, 220]); } catch (e) { } }
  if (U.rest.done && Date.now() - U.rest.doneAt > 9000) { U.rest = null; rb.hidden = true; rb.dataset.k = ''; rb.innerHTML = ''; document.body.classList.remove('resting'); return; }
  var key = (U.rest.done ? 'd' : 'r') + U.rest.end0;
  if (rb.dataset.k !== key || rb.hidden) {
    rb.hidden = false; rb.dataset.k = key;
    rb.innerHTML = '<div class="in"><div class="t" id="rt"></div><div class="l"><span id="rl"></span><div class="bar"><div id="rbar" style="height:100%;background:var(--on-accent);opacity:.7"></div></div></div>' +
      (U.rest.done ? '' : '<button data-act="restAdd" data-v="-15" aria-label="15 seconds less">-15</button><button data-act="restAdd" data-v="15" aria-label="15 seconds more">+15</button>') + '<button data-act="restSkip">' + (U.rest.done ? 'Dismiss' : 'Skip') + '</button></div>';
  }
  var pct = U.rest.done ? 100 : Math.max(0, Math.min(100, (1 - left / U.rest.total) * 100));
  $('#rt').textContent = U.rest.done ? 'GO' : fmtDur(left); $('#rl').textContent = U.rest.done ? 'Rest is over' : 'Rest'; $('#rbar').style.width = pct + '%';
}
/* rest-over chime: a short three-note bell rendered to a WAV once, played through an <audio> element
   (that plays through headphones and, unlike Web Audio, is not silenced by the iPhone ring/silent switch) */
var CHIME = { el: null, url: null, unlocked: false };
function chimeURL() {
  if (CHIME.url) return CHIME.url;
  var sr = 22050, dur = 1.1, n = Math.floor(sr * dur), data = new Int16Array(n);
  var notes = [[0, 1318.5], [0.14, 1760], [0.28, 2093]];
  for (var i = 0; i < n; i++) {
    var t = i / sr, v = 0;
    notes.forEach(function (nt) { var dt = t - nt[0]; if (dt < 0) return; var env = Math.min(1, dt / 0.006) * Math.exp(-dt * 5.5); v += env * (Math.sin(2 * Math.PI * nt[1] * dt) * 0.7 + Math.sin(4 * Math.PI * nt[1] * dt) * 0.18); });
    data[i] = Math.max(-1, Math.min(1, v * 0.42)) * 32767;
  }
  var buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  function str(o, s2) { for (var k = 0; k < s2.length; k++) dv.setUint8(o + k, s2.charCodeAt(k)); }
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 2, true);
  for (var m = 0; m < n; m++) dv.setInt16(44 + m * 2, data[m], true);
  CHIME.url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  return CHIME.url;
}
function chimeEl() { if (!CHIME.el) { try { CHIME.el = new Audio(chimeURL()); CHIME.el.preload = 'auto'; CHIME.el.setAttribute('playsinline', ''); } catch (e) { CHIME.el = null; } } return CHIME.el; }
function unlockAudio() {
  // called from a tap: lets the chime play later without a tap (iOS rule)
  if (S.settings.chime === false) return;
  var el = chimeEl(); if (!el || CHIME.unlocked) return;
  try { el.muted = true; var pr = el.play(); if (pr && pr.then) pr.then(function () { el.pause(); el.currentTime = 0; el.muted = false; CHIME.unlocked = true; }, function () { el.muted = false; }); } catch (e) { }
}
function beep() {
  if (S.settings.chime === false) return;
  try { if (navigator.audioSession) navigator.audioSession.type = 'transient'; } catch (e) { }
  var el = chimeEl();
  if (el) { try { el.muted = false; el.currentTime = 0; var pr = el.play(); if (pr && pr.catch) pr.catch(beepWA); return; } catch (e) { } }
  beepWA();
}
function beepWA() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    beep.ctx = beep.ctx || new AC(); var c = beep.ctx;
    [[0, 1318.5], [0.14, 1760], [0.28, 2093]].forEach(function (nt) { var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + nt[0]; o.frequency.value = nt[1]; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.75); });
  } catch (e) { }
}
var wakeLock = null;
async function keepAwake() { try { if (S.draft && navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', function () { wakeLock = null; }); } } catch (e) { wakeLock = null; } }

/* ===== workout actions ===== */
function newDraft(items) {
  var now = Date.now();
  S.draft = { id: 'w' + now, t: now, ex: items.map(function (it) { return makeWorkoutEx(realWorkouts(), it, unit()); }) };
  U.rest = null; U.confirm = null; persist({ draft: true }); keepAwake();
}
function finishWorkout() {
  var w = finishDraft(S.draft, Date.now());
  if (!w.ex.length) { toast('Check off at least one set first.'); return; }
  var prs = findPRs(realWorkouts(), w);
  S.workouts.push(w); S.workouts.sort(function (a, b) { return a.t - b.t; });
  S.draft = null; U.rest = null; U.plan = null; U.confirm = null; tick();
  persist({ draft: true, month: w.t });
  try { if (wakeLock) wakeLock.release(); } catch (e) { } wakeLock = null;
  var body = '<div class="grid2"><div class="stat"><div class="v">' + Math.round(w.dur / 60) + ' min</div><div class="k">Time</div></div><div class="stat"><div class="v">' + workoutSets(w) + '</div><div class="k">Sets</div></div><div class="stat"><div class="v">' + volDisp(workoutVolume(w)) + '</div><div class="k">Volume (' + uLabel() + ')</div></div><div class="stat"><div class="v">' + prs.length + '</div><div class="k">New bests</div></div></div>' +
    (prs.length ? '<div class="section"><h3 style="font-size:20px">New bests</h3>' + prs.map(function (p) { var ex = BYNAME[p.n]; return '<div class="lrow"><span>' + esc(p.n) + '</span><span class="num up" style="color:var(--up);font-size:18px">' + (isBW(ex) ? Math.round(p.best) + ' reps' : toDisp(p.best, unit()) + ' ' + uLabel()) + '</span></div>'; }).join('') + '</div>' : '') +
    '<div class="section"><h3 style="font-size:20px">Muscles now</h3>' + recoveryHTML(true) + '</div><div class="row"><button class="btn grow" data-act="shareW" data-id="' + esc(w.id) + '">Share</button><button class="btn primary grow" data-act="doneSummary">Done</button></div>';
  render(); openSheet('Workout saved', body);
}

/* ===== events ===== */
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]'); if (!el) return;
  var a = el.dataset.act, d = el.dataset, st = S.settings;
  if (a.indexOf('eat') === 0 && eatClick(a, d, el)) return;
  if (a.indexOf('body') === 0 && a !== 'bodyEdit' && a !== 'bodySave' && a !== 'bodySex' && bodyClick(a, d)) return;
  if (a === 'close') { closeSheet(); U.confirm = null; return; }
  if (a === 'doneSummary') { closeSheet(); U.tab = 'prog'; U.seg = 'muscles'; render(); window.scrollTo(0, 0); return; }
  if (a === 'tab') { U.tab = d.t; U.confirm = null; closeSheet(); render(); window.scrollTo(0, 0); return; }
  if (a === 'seg') { U.seg = d.k; render(); return; }
  if (a === 'preset') { st.groups = PRESETS[+d.i].g.slice(); persist({ settings: true }); render(); return; }
  if (a === 'toggleGroup') { var i = st.groups.indexOf(d.g); if (i >= 0) st.groups.splice(i, 1); else st.groups.push(d.g); persist({ settings: true }); render(); return; }
  if (a === 'goal') { st.goal = d.k; persist({ settings: true }); render(); return; }
  if (a === 'generate') {
    var r = generateWorkout({ minutes: st.minutes, groups: st.groups, gear: gearList(), level: st.level, goal: st.goal }, realWorkouts(), (U.seed = (Date.now() % 1000003) + 1));
    if (!r.items.length) { U.plan = null; render(); toast('No exercises match your gear for those muscles. Add equipment in Settings.'); return; }
    U.plan = r; render(); var pl = $('.plan-item'); if (pl) pl.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
  }
  if (a === 'swap') { var it = U.plan.items[+d.i], n = swapExercise({ minutes: st.minutes, groups: st.groups, gear: gearList(), level: st.level, goal: st.goal }, U.plan.items, it, realWorkouts(), Date.now() % 9973); if (n) { U.plan.items[+d.i] = n; render(); } else toast('No other matching exercise for that muscle.'); return; }
  if (a === 'swapEx') {
    var xe = S.draft.ex[+d.x], xx = BYNAME[xe.n];
    if (xe.sets.some(function (s) { return s.done; })) { toast('You already logged sets on this one. Remove it to swap.'); return; }
    var g0 = xx && xx.p[0]; if (!g0) { toast('No other matching exercise for that muscle.'); return; }
    var itm = { g: g0, comp: isComp(xx), sets: xe.sets.length, lo: xe.lo, hi: xe.hi, rest: xe.rest };
    var nw = swapExercise({ minutes: st.minutes, groups: [g0], gear: gearList(), level: st.level, goal: st.goal }, S.draft.ex.map(function (z) { return { n: z.n }; }), itm, realWorkouts(), (Date.now() % 99991) + 1);
    if (!nw) { toast('No other ' + g0.toLowerCase() + ' exercise fits your equipment.'); return; }
    S.draft.ex[+d.x] = makeWorkoutEx(realWorkouts(), nw, unit()); persist({ draft: true }); render(); toast('Swapped to ' + nw.n); return;
  }
  if (a === 'demoMode') { U.demoMode = d.m; var dw = $('#demowrap'), dx = BYNAME[d.n]; if (dw && dx) { dw.innerHTML = demoInner(dx); startDemo(dx); } return; }
  if (a === 'rmPlan') { U.plan.items.splice(+d.i, 1); render(); return; }
  if (a === 'startPlan') { newDraft(U.plan.items); U.plan = null; render(); window.scrollTo(0, 0); return; }
  if (a === 'startEmpty') { newDraft([]); render(); window.scrollTo(0, 0); openPicker('draft'); return; }
  if (a === 'pickPlan') { openPicker('plan'); return; }
  if (a === 'pickDraft') { openPicker('draft'); return; }
  if (a === 'pickRow') { addExerciseTo(d.n); return; }
  if (a === 'addToDraft' || a === 'addToPlan') { U.pickMode = a === 'addToDraft' ? 'draft' : 'plan'; addExerciseTo(d.n); return; }
  if (a === 'openEx') { exerciseSheet(d.n); return; }
  if (a === 'toggleSet') {
    var ex = S.draft.ex[+d.x], s = ex.sets[+d.s], bw = isBW(BYNAME[ex.n]);
    if (!s.done) {
      if (!(+s.r > 0)) { toast('Enter the reps first.'); return; }
      if (!bw && !(+s.w > 0)) { toast('Enter the weight first.'); return; }
      s.done = true; s.sug = false;
      var nx = ex.sets[+d.s + 1]; if (nx && !nx.done && nx.sug && (nx.w == null)) nx.w = s.w;
      var rs = s.wu ? 45 : (ex.rest || 90); U.rest = { end: Date.now() + rs * 1000, total: rs, end0: Date.now() }; unlockAudio();
      if (!s.wu) livePR(ex, s);
    } else s.done = false;
    persist({ draft: true }); render(); return;
  }
  if (a === 'addSet') { var e2 = S.draft.ex[+d.x], l = e2.sets[e2.sets.length - 1]; e2.sets.push({ w: l ? l.w : null, r: l ? l.r : e2.lo, done: false, sug: true }); persist({ draft: true }); render(); return; }
  if (a === 'rmSet') { var e3 = S.draft.ex[+d.x]; if (e3.sets.filter(function (q) { return !q.wu; }).length > 1 || e3.sets[e3.sets.length - 1].wu) e3.sets.pop(); persist({ draft: true }); render(); return; }
  if (a === 'rmEx') { S.draft.ex.splice(+d.x, 1); persist({ draft: true }); render(); return; }
  if (a === 'finish') { finishWorkout(); return; }
  if (a === 'discard') { U.confirm = 'discard'; render(); return; }
  if (a === 'noconfirm') { U.confirm = null; render(); return; }
  if (a === 'discard2') { S.draft = null; U.rest = null; U.confirm = null; persist({ draft: true }); render(); tick(); return; }
  if (a === 'restAdd') { if (U.rest) { U.rest.end += +d.v * 1000; U.rest.total = Math.max(15, U.rest.total + +d.v); tick(); } return; }
  if (a === 'restSkip') { U.rest = null; tick(); return; }
  if (a === 'chimeOpt') { st.chime = d.k === 'on'; persist({ settings: true }); render(); if (st.chime) { unlockAudio(); setTimeout(beep, 120); } return; }
  if (a === 'libGroup') { var j = U.libGroups.indexOf(d.g); if (j >= 0) U.libGroups.splice(j, 1); else U.libGroups.push(d.g); U.libShown = 40; render(); return; }
  if (a === 'libGear') { U.libGear = d.k; U.libShown = 40; render(); return; }
  if (a === 'libMore') { U.libShown += 60; refreshLibList(); return; }
  if (a === 'pickGroup') { var k = U.pickGroups.indexOf(d.g); if (k >= 0) U.pickGroups.splice(k, 1); else U.pickGroups.push(d.g); openPicker(U.pickMode, true); return; }
  if (a === 'openGroup') { groupSheet(d.g); return; }
  if (a === 'openLift') { liftSheet(d.n); return; }
  if (a === 'liftMetric') { liftSheet(d.n, d.k); return; }
  if (a === 'openHist') { U.confirm = null; histSheet(d.id); return; }
  if (a === 'delhist') { U.confirm = 'delhist'; histSheet(d.id); return; }
  if (a === 'histCancel') { U.confirm = null; histSheet(d.id); return; }
  if (a === 'delhist2') {
    var w = S.workouts.filter(function (x) { return x.id === d.id; })[0];
    S.workouts = S.workouts.filter(function (x) { return x.id !== d.id; });
    st.deleted = (st.deleted || []).concat(d.id).slice(-200); U.confirm = null;
    persist({ settings: true, month: w ? w.t : Date.now() }); closeSheet(); render(); toast('Workout deleted'); return;
  }
  if (a === 'unit') { st.unit = d.k; persist({ settings: true }); render(); return; }
  if (a === 'level') { st.level = d.k; persist({ settings: true }); render(); return; }
  if (a === 'recTap') { var rr = recoveryState(realWorkouts(), Date.now())[d.g]; toast(d.g + ': ' + (!realWorkouts().length || rr.level === 0 ? 'fresh' : LEVEL_TXT[rr.level].toLowerCase() + ', ready in ~' + readyText(rr.readyH))); return; }
  if (a === 'trainFresh') {
    var rc = recoveryState(realWorkouts(), Date.now()), fresh = GROUPS.filter(function (g) { return rc[g].level === 0; });
    if (!fresh.length) { toast('Nothing is fully fresh yet. Rest up, or pick muscles yourself.'); return; }
    st.groups = fresh.slice(); persist({ settings: true }); render(); toast('Selected ' + fresh.length + ' fresh muscle group' + (fresh.length > 1 ? 's' : '')); return;
  }
  if (a === 'profile') { st.profile = d.k; U.plan = null; persist({ settings: true }); render(); return; }
  if (a === 'gear') { var gl = st.gear[st.profile], q = gl.indexOf(d.k); if (q >= 0) gl.splice(q, 1); else gl.push(d.k); persist({ settings: true }); render(); return; }
  if (a === 'gearAll' || a === 'gearNone') {
    var gl2 = st.gear[st.profile], ids = ITEMS.filter(function (i) { return i.g === d.g; }).map(function (i) { return i.id; });
    st.gear[st.profile] = gl2.filter(function (x) { return ids.indexOf(x) < 0; }).concat(a === 'gearAll' ? ids : []); persist({ settings: true }); render(); return;
  }
  if (a === 'bodyEdit') { bodySheet(); return; }
  if (a === 'bodySex') { U.bsex = d.k; ['M', 'F'].forEach(function (k) { var bt = $('#bs-' + k); if (bt) bt.setAttribute('aria-pressed', String(k === d.k)); }); return; }
  if (a === 'bodySave') { bodySave(); return; }
  if (a === 'bodyDel') {
    var bb = st.body; bb.log = (bb.log || []).filter(function (x) { return String(x.t) !== d.t; }); bb.w = curWeightLb(bb) || null;
    persist({ settings: true }); bodySheet(); render(); return;
  }
  if (a === 'exportCopy') { copyText(backupText()); return; }
  if (a === 'exportFile') { saveBackup(); return; }
  if (a === 'exportCsv') { saveCsv(); return; }
  if (a === 'liftOpt') { st.lift = d.k === 'on'; persist({ settings: true }); document.body.classList.toggle('lift', st.lift); render(); return; }
  if (a === 'restore') { restoreFrom($('#restore').value); return; }
  if (a === 'codeShare') { codeShare(); return; }
  if (a === 'codeCopy') { copyText(myCode()); return; }
  if (a === 'codeAdd') {
    var ci = $('#codein'), fo = codeDecode(ci && ci.value);
    if (!fo) { toast('That does not look like an Iron Ledger code.'); return; }
    if (fo.i === myCid()) { toast('That is your own code.'); return; }
    var cl = codeFriends().filter(function (x) { return x.i !== fo.i; }); var had = cl.length !== codeFriends().length;
    cl.push(fo); st.cfriends = cl; persist({ settings: true }); render(); toast((had ? 'Updated ' : 'Added ') + fo.u); return;
  }
  if (a === 'srvIn' || a === 'srvUp') {
    var su = ($('#su') || {}).value || '', sp = ($('#sp') || {}).value || '', se = $('#s-err'); if (se) se.textContent = '';
    el.disabled = true; srvAuth(a === 'srvUp' ? 'signup' : 'login', su.trim(), sp).then(function (m) { el.disabled = false; if (m) { var e6 = $('#s-err'); if (e6) e6.textContent = m; } else { toast('Welcome, ' + SRV.name); render(); } }); return;
  }
  if (a === 'srvCodes') { U.codes = true; render(); return; }
  if (a === 'srvBack') { U.codes = false; render(); return; }
  if (a === 'srvForget') { srvForget(); render(); return; }
  if (a === 'srvSaveUrl') { var sv = ($('#surl') || {}).value || ''; el.disabled = true; srvConnect(sv).then(function (m) { el.disabled = false; if (m) { var e7 = $('#surl-err'); if (e7) e7.textContent = m; } else { U.codes = false; render(); } }); return; }
  if (a === 'srvOut') { srvSignOut(); closeSheet(); render(); toast('Signed out'); return; }
  if (a === 'srvInvite') { copyText(srvInvite()); return; }
  if (a === 'srvPw') { U.confirm = 'pw'; manageSheet(); return; }
  if (a === 'srvDel') { U.confirm = 'delacct'; manageSheet(); return; }
  if (a === 'srvPwGo') { srvRaw('POST', '/password', { p: ($('#pw-old') || {}).value, np: ($('#pw-new') || {}).value }).then(function () { U.confirm = null; closeSheet(); toast('Password changed'); }, function (e) { var x = $('#pw-err'); if (x) x.textContent = e.message; }); return; }
  if (a === 'srvDelGo') { srvRaw('POST', '/delete-account', { p: ($('#pw-del') || {}).value }).then(function () { U.confirm = null; S.settings.handle = ''; persist({ settings: true }); srvSignOut(); closeSheet(); render(); toast('Account deleted'); }, function (e) { var x = $('#pw-err'); if (x) x.textContent = e.message; }); return; }
  if (a === 'plates') { var px = S.draft && S.draft.ex[+d.x], pset = px ? (px.sets.filter(function (q) { return !q.done && +q.w > 0; })[0] || px.sets.filter(function (q) { return +q.w > 0; }).slice(-1)[0]) : null; U.pcw = pset ? String(toDisp(pset.w, unit())) : ''; plateSheet(); return; }
  if (a === 'pcBar') { st.bar = +d.v; persist({ settings: true }); plateSheet(); return; }
  if (a === 'weekGoal') { st.weekGoal = st.weekGoal >= 6 ? 2 : st.weekGoal + 1; persist({ settings: true }); render(); return; }
  if (a === 'repeatW') { var rw0 = statWorkouts().filter(function (x) { return x.id === d.id; })[0]; if (!rw0 || S.draft) return; newDraft(rw0.ex.filter(function (e) { return BYNAME[e.n]; }).map(function (e) { var it = defaultItem(e.n, st.goal); it.sets = Math.max(1, Math.min(8, e.sets.length)); return it; })); closeSheet(); U.tab = 'train'; render(); window.scrollTo(0, 0); toast('Same exercises, weights from last time'); return; }
  if (a === 'warmup') { addWarmups(S.draft.ex[+d.x]); return; }
  if (a === 'restCycle') { var rc = S.draft.ex[+d.x], opts = [45, 60, 90, 120, 150, 180, 240], ri = opts.indexOf(rc.rest); rc.rest = opts[(ri + 1) % opts.length]; persist({ draft: true }); render(); toast('Rest ' + fmtDur(rc.rest)); return; }
  if (a === 'editW') { var ew = statWorkouts().filter(function (x) { return x.id === d.id; })[0]; if (!ew) return; U.edit = JSON.parse(JSON.stringify(ew)); editSheet(); return; }
  if (a === 'editRm') { var er = U.edit.ex[+d.x]; er.sets.splice(+d.s, 1); if (!er.sets.length) U.edit.ex.splice(+d.x, 1); editSheet(); return; }
  if (a === 'editAdd') { var ea = U.edit.ex[+d.x], la = ea.sets[ea.sets.length - 1]; ea.sets.push({ w: la ? la.w : 0, r: la ? la.r : 8 }); editSheet(); return; }
  if (a === 'editSave') { saveEdit(); return; }
  if (a === 'editCancel') { var ec = U.edit && U.edit.id; U.edit = null; histSheet(ec); return; }
  if (a === 'calMove') { U.calM = (U.calM || 0) + (+d.v); render(); return; }
  if (a === 'calDay') { histSheet(d.id); return; }
  if (a === 'shareW') { shareWorkout(d.id); return; }
  if (a === 'loadInfo') { var lx = BYNAME[d.n], lv = loadInfo(lx); openSheet('How to log ' + d.n, '<div class="card section loadbox"><div class="xname">⚖️ ' + esc(lv.s || 'Weight') + '</div><div class="note" style="font-size:15px">' + esc(lv.l) + '</div></div><button class="btn block" data-act="openEx" data-n="' + esc(d.n) + '">See how to do the exercise</button><button class="btn primary block" data-act="close">Got it</button>'); return; }
  if (a === 'injTap') { var ix = st.injuries.filter(function (j) { return j.a === d.k; })[0]; if (!ix) st.injuries.push({ a: d.k, s: 'careful' }); else if (ix.s === 'careful') ix.s = 'avoid'; else st.injuries = st.injuries.filter(function (j) { return j.a !== d.k; }); persist({ settings: true }); U.plan = null; render(); return; }
  if (a === 'wkSendDraft') { shareWorkoutLink(S.draft.ex.map(function (e) { return [e.n, e.sets.filter(function (q) { return !q.wu; }).length, e.lo, e.hi, e.rest]; }), 'Workout together'); return; }
  if (a === 'wkSendPlan') { shareWorkoutLink(U.plan.items.map(function (it) { return [it.n, it.sets, it.lo, it.hi, it.rest]; }), planTitle(U.plan.items.map(function (it) { return it.n; }))); return; }
  if (a === 'wkSavePlan') { saveTemplate(U.plan.items.map(function (it) { return [it.n, it.sets, it.lo, it.hi, it.rest]; }), planTitle(U.plan.items.map(function (it) { return it.n; })), ''); return; }
  if (a === 'wkSendHist' || a === 'wkSaveHist') { var hw = statWorkouts().filter(function (x) { return x.id === d.id; })[0]; if (!hw) return; var hx = hw.ex.filter(function (e) { return BYNAME[e.n]; }).map(function (e) { var it = defaultItem(e.n, st.goal); return [e.n, e.sets.length, it.lo, it.hi, it.rest]; }), ht = planTitle(hw.ex.map(function (e) { return e.n; })); if (a === 'wkSendHist') shareWorkoutLink(hx, ht); else saveTemplate(hx, ht, ''); return; }
  if (a === 'wkStart') { var tw = d.id ? st.saved.filter(function (x) { return x.id === d.id; })[0] : U.inWk; if (!tw) return; if (S.draft) { toast('Finish or discard your current workout first.'); return; } newDraft(tw.x.filter(function (r) { return BYNAME[r[0]]; }).map(function (r) { return { n: r[0], sets: r[1], lo: r[2], hi: r[3], rest: r[4] }; })); U.inWk = null; closeSheet(); U.tab = 'train'; render(); window.scrollTo(0, 0); toast('Started. Weights are suggested from your own history.'); return; }
  if (a === 'wkKeep') { if (U.inWk) saveTemplate(U.inWk.x, U.inWk.t, U.inWk.f); U.inWk = null; closeSheet(); render(); return; }
  if (a === 'wkDel') { st.saved = st.saved.filter(function (x) { return x.id !== d.id; }); persist({ settings: true }); render(); return; }
  if (a === 'wkSendSaved') { var sv = st.saved.filter(function (x) { return x.id === d.id; })[0]; if (sv) shareWorkoutLink(sv.x, sv.t); return; }
  if (a === 'wkPaste') { var pv = ($('#wkcode') || {}).value || '', ob = wkDecode(pv); if (!ob) { toast('That is not a workout link or code.'); return; } U.inWk = ob; incomingSheet(); return; }
  if (a === 'socCat') { SOC.cat = d.g; render(); return; }
  if (a === 'socChTab') { SOC.chTab = d.k; render(); return; }
  if (a === 'socCreate') {
    var hv = ($('#handle') || {}).value || '', he = $('#h-err'); if (he) he.textContent = '';
    el.disabled = true; socClaim(hv.trim()).then(function (m) { el.disabled = false; if (m) { var e5 = $('#h-err'); if (e5) e5.textContent = m; else toast(m); } else { toast('Welcome, ' + S.settings.handle); render(); } }); return;
  }
  if (a === 'socAdd') { if (st.friends.indexOf(d.id) < 0) st.friends.push(d.id); persist({ settings: true }); SOC.q = ''; render(); toast('Added ' + socName(d.id)); return; }
  if (a === 'socUnfriend') { st.friends = st.friends.filter(function (x) { return x !== d.id; }); st.cfriends = codeFriends().filter(function (x) { return x.i !== d.id; }); persist({ settings: true }); closeSheet(); render(); return; }
  if (a === 'socCompare') { cmpSheet(d.id); return; }
  if (a === 'socManage') { U.confirm = null; manageSheet(); return; }
  if (a === 'socLeave') { U.confirm = 'leave'; manageSheet(); return; }
  if (a === 'socLeave2') { U.confirm = null; socLeave().then(function () { closeSheet(); render(); toast('Profile deleted'); }); return; }
  if (a === 'socNewChal') { U.nc = null; socNewSheet(d.id || null); return; }
  if (a === 'ncType') { U.nc.ty = d.k; U.nc.g = ''; var nn = $('#nc-name'); if (nn) U.nc.name = nn.value; socNewSheet(); return; }
  if (a === 'ncGroup') { U.nc.g = d.g; var n2 = $('#nc-name'); if (n2) U.nc.name = n2.value; socNewSheet(); return; }
  if (a === 'ncDays') { U.nc.days = +d.k; var n3 = $('#nc-name'); if (n3) U.nc.name = n3.value; socNewSheet(); return; }
  if (a === 'ncWho') { var iv = U.nc.inv, ix = iv.indexOf(d.id); if (ix >= 0) iv.splice(ix, 1); else iv.push(d.id); var n4 = $('#nc-name'); if (n4) U.nc.name = n4.value; socNewSheet(); return; }
  if (a === 'ncGo') {
    var q = U.nc, nm = $('#nc-name'); if (nm) q.name = nm.value.trim();
    var t0 = new Date(), start = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()).getTime();
    var ch = { id: 'c' + Date.now().toString(36), n: q.name, ty: q.ty, g: q.ty === 'lift' ? '' : q.g, ex: q.ty === 'lift' ? q.ex : '', st: start, en: start + q.days * DAY - 1, inv: q.inv.slice(), t: Date.now() };
    el.disabled = true;
    socSaveChallenge(ch).then(function () { U.nc = null; closeSheet(); SOC.chTab = 'active'; U.tab = 'friends'; render(); toast('Challenge started'); }, function () { el.disabled = false; toast('Could not start the challenge. Check your connection.'); });
    return;
  }
  if (a === 'socJoin') { var jc = chalList().filter(function (x) { return x.id === d.id; })[0]; if (jc) socJoin(jc).then(function () { render(); if (sheetOpen() && U.socSheet) U.socSheet(); toast('You are in'); }, function () { toast('Could not join. Check your connection.'); }); return; }
  if (a === 'socChal') { chalSheet(d.id, d.by); return; }
  if (a === 'wipe') { U.confirm = 'wipe'; render(); return; }
  if (a === 'wipe2') {
    var months = {}; S.workouts.forEach(function (w) { months[monthKey(w.t)] = 1; });
    var ids = S.workouts.map(function (w) { return w.id; });
    S.workouts = []; S.draft = null; S.settings = defaults(); S.settings.deleted = ids.slice(-200); U.confirm = null; U.plan = null;
    Object.keys(months).forEach(function (m) { dirtyMonths[m] = 1; }); persist({ settings: true, draft: true }); render(); toast('All data deleted'); return;
  }
});
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (eatInput(t)) return;
  if (t.id === 'time') { S.settings.minutes = +t.value; var b = $('#timebig'); if (b) b.textContent = t.value; persist({ settings: true }); return; }
  if (t.id === 'libq') { U.libQ = t.value; U.libShown = 40; refreshLibList(); return; }
  if (t.id === 'pickq') { U.pickQ = t.value; refreshPick(); return; }
  if (t.dataset && t.dataset.ek && U.edit) { var es = U.edit.ex[+t.dataset.x].sets[+t.dataset.s]; if (t.dataset.ek === 'w') es.w = fromDisp(t.value, unit()) || 0; else es.r = Math.max(0, parseInt(t.value, 10) || 0); return; }
  if (t.id === 'exnote') { var nn = t.dataset.n, nv = t.value.slice(0, 200).trim(); if (nv) S.settings.notes[nn] = nv; else delete S.settings.notes[nn]; persist({ settings: true }); return; }
  if (t.id === 'pcw') { U.pcw = t.value; var pb = $('#pcbody'); if (pb) pb.innerHTML = plateBody(); return; }
  if (t.id === 'cname') { S.settings.handle = t.value.slice(0, 16); persist({ settings: true }); var mc = $('#mycode'); if (mc) mc.value = S.settings.handle ? myCode() : 'Enter your name to get a code.'; document.querySelectorAll('[data-act="codeShare"],[data-act="codeCopy"]').forEach(function (b2) { b2.disabled = !S.settings.handle; }); return; }
  if (t.id === 'fq') { SOC.q = t.value; var pl = $('#people-list'); if (pl) pl.innerHTML = peopleList(peopleAll()); return; }
  if (t.dataset && t.dataset.k && S.draft) {
    var s = S.draft.ex[+t.dataset.x].sets[+t.dataset.s]; s.sug = false; t.classList.remove('sug');
    if (t.dataset.k === 'w') s.w = fromDisp(t.value, unit()); else s.r = t.value === '' ? null : Math.max(0, parseInt(t.value, 10) || 0);
    persist({ draft: true });
  }
});
document.addEventListener('change', function (ev) {
  var t = ev.target;
  if (eatChange(t)) return;
  if (bodyChange(t)) return;
  if (t.id === 'libcat') { U.libCat = t.value; U.libShown = 40; refreshLibList(); }
  if (t.id === 'libitem') { U.libItem = t.value; U.libShown = 40; refreshLibList(); }
  if (t.id === 'nc-ex' && U.nc) { U.nc.ex = t.value; return; }
  if (t.id === 'restorefile' && t.files && t.files[0]) { var fr = new FileReader(); fr.onload = function () { restoreFrom(String(fr.result || '')); }; fr.readAsText(t.files[0]); }
});
document.addEventListener('focusin', function (ev) {
  var t = ev.target;
  if (t && t.matches && t.matches('input[inputmode]')) {
    try { t.select(); } catch (e) { }
    setTimeout(function () { try { t.setSelectionRange(0, (t.value || '').length); } catch (e) { } }, 0);
  }
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && sheetOpen()) closeSheet(); });
document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); keepAwake(); } });

/* ===== picker (add exercise) ===== */
function openPicker(mode, keep) {
  U.pickMode = mode; if (!keep) { U.pickQ = ''; U.pickGroups = []; }
  openSheet('Add exercise', '<input class="input" id="pickq" type="search" placeholder="Search exercises" value="' + esc(U.pickQ) + '" aria-label="Search exercises">' + groupChips(U.pickGroups, 'pickGroup') + '<div id="picklist">' + pickList() + '</div>', { focus: keep ? null : '#pickq' });
  U.pickMode = mode;
}
function pickList() { return libList(filterEx(U.pickQ, U.pickGroups, U.pickQ ? 'all' : 'mine', 'all', 'all').slice(0, 200), 30, 'pickRow').replace(/data-act="libMore"/, 'data-act="noop"'); }
function refreshPick() { var l = $('#picklist'); if (l) l.innerHTML = pickList(); }
function addExerciseTo(name) {
  var mode = U.pickMode || (S.draft ? 'draft' : 'plan'), it = defaultItem(name, S.settings.goal);
  if (mode === 'draft' && S.draft) { S.draft.ex.push(makeWorkoutEx(realWorkouts(), it, unit())); persist({ draft: true }); }
  else if (U.plan) { U.plan.items.push(it); }
  else { toast('Build a workout first.'); return; }
  closeSheet(); render(); toast('Added ' + name);
  if (mode === 'draft') { var cs = document.querySelectorAll('.xcard'); if (cs.length) cs[cs.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

/* ===== backup ===== */
function backupText() { return JSON.stringify({ app: 'iron-ledger', v: 1, exported: new Date().toISOString(), settings: S.settings, workouts: S.workouts }, null, 1); }
function copyText(txt) {
  var done = function () { toast('Backup copied. Paste it somewhere safe.'); };
  var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Use Save backup file.'); } ta.remove(); };
  try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
}
async function saveFile(name, data, okMsg) {
  var mime = /\.csv$/.test(name) ? 'text/csv' : 'application/json';
  try {
    var dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: data }); toast(okMsg); return true; }
  } catch (e) { if (e && e.code === 'declined') return false; }
  try {
    var file = new File([data], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); toast(okMsg); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  try {
    var url = URL.createObjectURL(new Blob([data], { type: mime })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast(okMsg); return true;
  } catch (e) { toast('Could not save the file. Use Copy as text below.'); return false; }
}
async function saveBackup() {
  var ok = await saveFile('iron-ledger-backup-' + new Date().toISOString().slice(0, 10) + '.json', backupText(), 'Backup ready. Choose where to keep it.');
  if (ok) { S.settings.lastBackup = Date.now(); persist({ settings: true }); if (U.tab === 'settings') render(); }
}
function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
async function saveCsv() {
  var rows = [['Date', 'Workout minutes', 'Exercise', 'Muscle', 'Set', 'Weight (' + uLabel() + ')', 'Reps', 'Est. 1RM (' + uLabel() + ')']];
  S.workouts.forEach(function (w) {
    var ds = new Date(w.t).toISOString().slice(0, 10);
    w.ex.forEach(function (e) { var ex = BYNAME[e.n]; e.sets.forEach(function (s, i) {
      var wt = +s.w || 0, rp = +s.r || 0; rows.push([ds, Math.round((w.dur || 0) / 60), e.n, ex ? ex.p.join('/') : '', i + 1, wt ? toDisp(wt, unit()) : '', rp, wt && rp ? toDisp(wt * (1 + rp / 30), unit()) : '']);
    }); });
  });
  if (rows.length < 2) { toast('Log a workout first.'); return; }
  await saveFile('iron-ledger-workouts.csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n'), 'Spreadsheet ready.');
}
function restoreFrom(txt) {
  var j; try { j = JSON.parse(txt); } catch (e) { toast('That is not a valid backup.'); return; }
  if (!j || !Array.isArray(j.workouts)) { toast('That backup has no workouts.'); return; }
  var have = {}; S.workouts.forEach(function (w) { have[w.id] = 1; }); var added = 0;
  j.workouts.forEach(function (w) {
    if (!w || !w.id || !Array.isArray(w.ex) || !w.t || have[w.id]) return;
    var ok = w.ex.every(function (e) { return e && BYNAME[e.n] && Array.isArray(e.sets); }); if (!ok) return;
    S.workouts.push({ id: String(w.id), t: +w.t, dur: +w.dur || 3600, ex: w.ex.map(function (e) { return { n: e.n, sets: e.sets.map(function (s) { return { w: +s.w || 0, r: +s.r || 0 }; }) }; }) });
    dirtyMonths[monthKey(+w.t)] = 1; added++;
  });
  S.workouts.sort(function (a, b) { return a.t - b.t; });
  if (j.settings && !S.at.settings) { S.settings = normSettings(Object.assign(defaults(), j.settings)); dirtySettings = true; }
  persist({}); render(); toast(added ? 'Restored ' + added + ' workout' + (added > 1 ? 's' : '') : 'Nothing new to restore.');
}

/* ===== boot ===== */
loadLocal();
document.body.classList.toggle('lift', S.settings.lift !== false);
document.querySelectorAll('#tabs button').forEach(function (b) { b.insertAdjacentHTML('afterbegin', ico({ train: 'train', lib: 'lib', prog: 'prog', body: 'body', eat: 'eat', friends: 'users', settings: 'set' }[b.dataset.t])); });
render();
setInterval(tick, 1000);
keepAwake();
initDb();
if (typeof photosInit === 'function') photosInit();
setTimeout(function () { aiDetect().then(function () { if (U.tab === 'body') render(); }); }, 50);
try { if (!window.claude && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js'); } catch (e) { }

/* ===== this week, live bests, plate math ===== */
function weekStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
function daysTrained(W, a, b) { var c = {}; W.forEach(function (w) { if (w.t >= a && w.t < b) c[new Date(w.t).toDateString()] = 1; }); return Object.keys(c).length; }
function weekCard() {
  var W = realWorkouts(); if (!W.length) return '';
  var goal = S.settings.weekGoal || 3, ws = weekStart(Date.now()), we = ws + 7 * DAY, days = [0, 0, 0, 0, 0, 0, 0], sets = 0;
  W.forEach(function (w) { if (w.t >= ws && w.t < we) { days[(new Date(w.t).getDay() + 6) % 7]++; sets += workoutSets(w); } });
  var n = days.filter(Boolean).length, today = (new Date().getDay() + 6) % 7, L = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var dots = days.map(function (c, i) { return '<div class="wd' + (c ? ' on' : '') + (i === today ? ' today' : '') + '"><span>' + L[i] + '</span><i></i></div>'; }).join('');
  var streak = 0, cur = ws - 7 * DAY;
  for (var g = 0; g < 104 && daysTrained(W, cur, cur + 7 * DAY) >= goal; g++) { streak++; cur -= 7 * DAY; }
  if (n >= goal) streak++;
  var msg = n >= goal ? 'Goal hit' : (goal - n) + ' more to hit your goal';
  return '<div class="card section week"><div class="row"><div class="grow"><div class="xname">This week</div><div class="xmeta">' + msg + ' · ' + sets + ' sets' + (streak > 1 ? ' · ' + streak + '-week streak' : '') + '</div></div><button class="btn small ghost" data-act="weekGoal" aria-label="Weekly goal, tap to change">' + n + ' of ' + goal + ' days</button></div><div class="wdots">' + dots + '</div></div>';
}
function livePR(dx, s) {
  var ex = BYNAME[dx.n]; if (!ex) return;
  var h = exHistory(realWorkouts(), dx.n), prev = 0; h.forEach(function (x) { if (x.best > prev) prev = x.best; });
  var now = sessionBest(ex, dx.sets.filter(function (q) { return q.done && !q.wu; }));
  if (prev > 0 && now > prev * 1.0001 && now > (dx.prShown || 0)) {
    dx.prShown = now;
    toast('New best on ' + dx.n + ' · ' + (isBW(ex) ? Math.round(now) + ' reps' : 'est. 1RM ' + toDisp(now, unit()) + ' ' + uLabel()));
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { }
  }
}
function isBarbell(ex) { return !!(ex && ex.gear && (ex.gear.indexOf('barbell') >= 0 || ex.gear.indexOf('trapbar') >= 0 || ex.gear.indexOf('ezbar') >= 0) && !isBW(ex)); }
function barList() { return unit() === 'kg' ? [20, 15, 10] : [45, 35, 25]; }
function barW() { var b = barList(); return b.indexOf(S.settings.bar) >= 0 ? S.settings.bar : b[0]; }
function plateBody() {
  var kg = unit() === 'kg', bar = barW(), tot = parseFloat(String(U.pcw || '').replace(',', '.'));
  var plates = kg ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
  if (!(tot > 0)) return '<div class="note">Type the total weight on the bar.</div>';
  if (tot < bar) return '<div class="note">That is less than the bar (' + bar + ' ' + uLabel() + ').</div>';
  var side = (tot - bar) / 2, left = side, out = [];
  plates.forEach(function (p) { while (left >= p - 1e-6) { out.push(p); left -= p; } });
  left = Math.round(left * 100) / 100;
  var col = kg ? { 25: '#d64545', 20: '#3a7bd5', 15: '#e3b341', 10: '#3fa66b', 5: '#ececec', 2.5: '#8b8f96', 1.25: '#8b8f96' } : { 45: '#3a7bd5', 35: '#e3b341', 25: '#3fa66b', 10: '#ececec', 5: '#d64545', 2.5: '#8b8f96' };
  var vis = out.map(function (p) { var h = 30 + Math.min(1, p / (kg ? 25 : 45)) * 66; return '<i class="pl" style="height:' + h.toFixed(0) + 'px;background:' + (col[p] || '#888') + '"><b>' + p + '</b></i>'; }).join('');
  return '<div class="pcviz" aria-hidden="true"><span class="pcbar"></span>' + (vis || '<span class="note" style="margin-left:10px">Empty bar</span>') + '<span class="pccollar"></span></div>' +
    '<div class="lrow"><span>Each side</span><span class="num" style="font-size:22px">' + (out.length ? out.join(' + ') : 'nothing') + '</span></div>' +
    (left > 0 ? '<div class="note">Can\'t load that exactly with standard plates. Closest: ' + (Math.round((tot - left * 2) * 100) / 100) + ' ' + uLabel() + '.</div>' : '<div class="note">' + bar + ' ' + uLabel() + ' bar + ' + Math.round((tot - bar) * 100) / 100 + ' ' + uLabel() + ' of plates.</div>');
}
function plateSheet() {
  var bars = barList(), cur = barW();
  openSheet('Plate calculator', '<input class="input" id="pcw" inputmode="decimal" placeholder="Total weight (' + uLabel() + ')" value="' + esc(U.pcw || '') + '" aria-label="Total weight">' +
    '<div><span class="field-label">Bar</span><div class="seg" role="group" aria-label="Bar weight">' + bars.map(function (b) { return '<button aria-pressed="' + (b === cur) + '" data-act="pcBar" data-v="' + b + '">' + b + ' ' + uLabel() + '</button>'; }).join('') + '</div></div>' +
    '<div id="pcbody" class="section" style="gap:8px">' + plateBody() + '</div>');
}

/* ===== warm-ups ===== */
function addWarmups(e) {
  var ex = BYNAME[e.n], work = e.sets.filter(function (q) { return !q.wu && +q.w > 0; })[0];
  if (!work) { toast('Enter your working weight first.'); return; }
  var kg = unit() === 'kg', step = kg ? 2.5 : 5, W = +work.w, dispW = kg ? W / LB : W;
  var bar = isBarbell(ex) ? barW() : 0, plan = [];
  if (bar && dispW > bar * 1.6) plan.push([bar, 10]);
  [[.5, 8], [.7, 5], [.85, 3]].forEach(function (p) { if (p[0] === .85 && dispW < (kg ? 60 : 135)) return; plan.push([p[0] * dispW, p[1]]); });
  var seen = {}, sets = [];
  plan.forEach(function (p) {
    var v = Math.max(bar || 0, Math.round(p[0] / step) * step); if (v <= 0 || v >= dispW || seen[v]) return; seen[v] = 1;
    sets.push({ w: kg ? v * LB : v, r: p[1], done: false, sug: false, wu: true });
  });
  if (!sets.length) { toast('This weight is light enough to start without a warm-up.'); return; }
  e.sets = sets.concat(e.sets); persist({ draft: true }); render();
  toast(sets.length + ' warm-up set' + (sets.length > 1 ? 's' : '') + ' added. They don\'t count toward your stats.');
}

/* ===== editing a saved workout ===== */
function editSheet() {
  var w = U.edit, bwOf = function (n) { return isBW(BYNAME[n]); };
  var body = w.ex.map(function (e, xi) {
    return '<div class="card section" style="gap:8px"><div class="xname">' + esc(e.n) + '</div><div class="esets">' +
      '<div class="hd">SET</div><div class="hd">' + uLabel().toUpperCase() + '</div><div class="hd">REPS</div><div class="hd"></div>' +
      e.sets.map(function (s, si) {
        return '<div class="sn">' + (si + 1) + '</div><input class="input" inputmode="decimal" data-ek="w" data-x="' + xi + '" data-s="' + si + '" value="' + (s.w ? toDisp(s.w, unit()) : (bwOf(e.n) ? '' : '0')) + '" placeholder="0" aria-label="Set ' + (si + 1) + ' weight">' +
          '<input class="input" inputmode="numeric" data-ek="r" data-x="' + xi + '" data-s="' + si + '" value="' + (s.r || '') + '" placeholder="0" aria-label="Set ' + (si + 1) + ' reps">' +
          '<button class="icon-btn" data-act="editRm" data-x="' + xi + '" data-s="' + si + '" aria-label="Remove set ' + (si + 1) + '">' + ico('x') + '</button>';
      }).join('') + '</div><button class="btn small ghost" data-act="editAdd" data-x="' + xi + '">+ Add set</button></div>';
  }).join('');
  openSheet('Edit ' + fmtDateLong(w.t), (body || '<div class="note">No sets left. Save will delete this workout.</div>') +
    '<div class="row"><button class="btn grow" data-act="editCancel">Cancel</button><button class="btn primary grow" data-act="editSave">Save changes</button></div>');
}
function saveEdit() {
  var w = U.edit; if (!w) return;
  w.ex.forEach(function (e) { e.sets = e.sets.filter(function (s) { return (+s.r || 0) > 0; }); });
  w.ex = w.ex.filter(function (e) { return e.sets.length; });
  var i = -1; S.workouts.forEach(function (x, k) { if (x.id === w.id) i = k; });
  if (i < 0) { U.edit = null; closeSheet(); return; }
  if (!w.ex.length) { S.workouts.splice(i, 1); S.settings.deleted = (S.settings.deleted || []).concat([w.id]).slice(-200); persist({ settings: true, month: w.t }); U.edit = null; closeSheet(); render(); toast('Workout deleted'); return; }
  S.workouts[i] = w; persist({ month: w.t }); U.edit = null; render(); histSheet(w.id); toast('Saved');
}

/* ===== calendar ===== */
function calendarHTML(W) {
  var now = new Date(), m = new Date(now.getFullYear(), now.getMonth() + (U.calM || 0), 1), y = m.getFullYear(), mo = m.getMonth();
  var first = new Date(y, mo, 1).getTime(), last = new Date(y, mo + 1, 1).getTime(), byDay = {}, n = 0, sets = 0, vol = 0;
  W.forEach(function (w) { if (w.t >= first && w.t < last) { var dd = new Date(w.t).getDate(); if (!byDay[dd]) { byDay[dd] = []; } byDay[dd].push(w); n++; sets += workoutSets(w); vol += workoutVolume(w); } });
  var lead = (new Date(y, mo, 1).getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate(), cells = '';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (l) { cells += '<div class="cal-h">' + l + '</div>'; });
  for (var i = 0; i < lead; i++) cells += '<div></div>';
  for (var dd = 1; dd <= days; dd++) {
    var ws = byDay[dd], isToday = (U.calM || 0) === 0 && dd === now.getDate();
    if (ws) { var g = groupsHit(ws[0]).slice(0, 2).join(', '); cells += '<button class="cal-d on' + (isToday ? ' today' : '') + '" data-act="calDay" data-id="' + esc(ws[ws.length - 1].id) + '" aria-label="' + MON[mo] + ' ' + dd + ': ' + esc(g || 'workout') + '">' + dd + '</button>'; }
    else cells += '<div class="cal-d' + (isToday ? ' today' : '') + '">' + dd + '</div>';
  }
  var canNext = (U.calM || 0) < 0;
  return '<div class="card section cal"><div class="row"><button class="icon-btn" data-act="calMove" data-v="-1" aria-label="Previous month">‹</button><div class="grow" style="text-align:center"><div class="xname">' + MON_FULL(mo) + ' ' + y + '</div><div class="xmeta">' + n + ' workout' + (n === 1 ? '' : 's') + ' · ' + sets + ' sets · ' + volDisp(vol) + ' ' + uLabel() + '</div></div><button class="icon-btn" data-act="calMove" data-v="1" aria-label="Next month"' + (canNext ? '' : ' disabled') + '>›</button></div><div class="cal-g">' + cells + '</div></div>';
}
function MON_FULL(m) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]; }

/* ===== % of 1RM ===== */
function pctTable(e1) {
  if (!(e1 > 0)) return '';
  var rows = [[1, 100], [2, 0], [3, 0], [5, 0], [8, 0], [10, 0], [12, 0]].map(function (p) {
    var r = p[0], w = r === 1 ? e1 : e1 / (1 + r / 30);
    return '<div class="lrow"><span>' + r + ' rep' + (r > 1 ? 's' : '') + ' <span class="faint">· ' + Math.round(w / e1 * 100) + '%</span></span><span class="num" style="font-size:18px">' + toDisp(w, unit()) + ' ' + uLabel() + '</span></div>';
  }).join('');
  return '<div class="section"><h3 style="font-size:20px">What you could lift now</h3><div class="note">From your latest estimated 1-rep max. Use it to pick weights for a rep target.</div><div>' + rows + '</div></div>';
}

/* ===== share a workout as a picture ===== */
function shareImage(w) {
  var c = document.createElement('canvas'), W = 1080, H = Math.max(1080, Math.min(1350, 760 + Math.min(8, w.ex.length) * 74 + 160)); c.width = W; c.height = H;
  var x = c.getContext('2d'), Y = '#f2c230', fd = '"Barlow Condensed", "Arial Narrow", sans-serif', fb = 'Barlow, Helvetica, Arial, sans-serif';
  x.fillStyle = '#0f1113'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#171a1e'; x.beginPath(); if (x.roundRect) x.roundRect(48, 48, W - 96, H - 96, 40); else x.rect(48, 48, W - 96, H - 96); x.fill();
  x.fillStyle = Y; x.font = '700 44px ' + fd; x.fillText('IRON LEDGER', 100, 130);
  x.fillStyle = '#99a0a9'; x.font = '500 36px ' + fb; x.fillText(fmtDateLong(w.t), 100, 186);
  x.fillStyle = '#eceae4'; x.font = '700 92px ' + fd; x.fillText((groupsHit(w).slice(0, 3).join(' · ') || 'Workout'), 100, 290, W - 200);
  var stats = [[Math.round(w.dur / 60) + '', 'min'], [workoutSets(w) + '', 'sets'], [volDisp(workoutVolume(w)), uLabel() + ' moved']];
  var prior = S.workouts.filter(function (q) { return q.t < w.t; }), prs = findPRs(prior, w).map(function (p) { return p.n; });
  if (prs.length) stats.push([prs.length + '', prs.length === 1 ? 'new best' : 'new bests']);
  var cw = (W - 200) / stats.length;
  stats.forEach(function (s, i) { x.fillStyle = i === 3 ? Y : '#eceae4'; x.font = '700 96px ' + fd; x.fillText(s[0], 100 + i * cw, 430); x.fillStyle = '#99a0a9'; x.font = '500 32px ' + fb; x.fillText(s[1], 100 + i * cw, 476); });
  x.fillStyle = '#2a2f36'; x.fillRect(100, 520, W - 200, 3);
  var yy = 600, list = w.ex.slice(0, 8);
  list.forEach(function (e) {
    var ex = BYNAME[e.n], top = e.sets.slice().sort(function (a, b) { return (b.w - a.w) || (b.r - a.r); })[0];
    var ns = e.sets.length + (e.sets.length === 1 ? ' set' : ' sets'), val = isBW(ex) && !top.w ? ns + ' · best ' + top.r + ' reps' : ns + ' · ' + toDisp(top.w, unit()) + ' × ' + top.r;
    x.fillStyle = '#eceae4'; x.font = '600 38px ' + fb; x.fillText(e.n.length > 30 ? e.n.slice(0, 29) + '…' : e.n, 100, yy, 600);
    x.fillStyle = prs.indexOf(e.n) >= 0 ? Y : '#99a0a9'; x.font = '600 36px ' + fb; x.textAlign = 'right'; x.fillText((prs.indexOf(e.n) >= 0 ? '★ ' : '') + val, W - 100, yy); x.textAlign = 'left';
    yy += 74;
  });
  if (w.ex.length > list.length) { x.fillStyle = '#6c737c'; x.font = '500 32px ' + fb; x.fillText('+ ' + (w.ex.length - list.length) + ' more', 100, yy); }
  var B = profB(), d = B ? socDoc() : null;
  if (d && d.ov != null) { x.fillStyle = '#99a0a9'; x.font = '500 34px ' + fb; x.fillText('Strength rank for my size', 100, H - 150); x.fillStyle = Y; x.font = '700 72px ' + fd; x.textAlign = 'right'; x.fillText(Math.round(d.ov) + ' / 100', W - 100, H - 140); x.textAlign = 'left'; }
  return c;
}
async function shareWorkout(id) {
  var w = statWorkouts().filter(function (x) { return x.id === id; })[0]; if (!w) return;
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { }
  var c = shareImage(w);
  var blob = await new Promise(function (r) { c.toBlob(r, 'image/png'); }); if (!blob) { toast('Could not make the picture.'); return; }
  var name = 'iron-ledger-' + new Date(w.t).toISOString().slice(0, 10) + '.png';
  try {
    var file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'My workout' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  var url = URL.createObjectURL(blob);
  openSheet('Your workout card', '<img src="' + url + '" alt="Workout summary card" style="width:100%;border-radius:16px"><div class="note">Press and hold the picture to save or share it.</div>');
}

/* ===== how to enter the weight for each exercise ===== */
function loadInfo(ex) {
  if (!ex) return { h: uLabel().toUpperCase(), s: '', l: '' };
  var n = ex.n.toLowerCase(), q = ex.q, g = ex.gear || [], u = uLabel(), U2 = u.toUpperCase(), has = function (id) { return g.indexOf(id) >= 0; };
  var bar = u === 'kg' ? '20 kg' : '45 lb';
  if (/assist/.test(n)) return { h: 'ASSIST', s: 'Assistance weight', l: 'Enter how much the machine or band helps you. More assistance = easier, so this number should go down over time.' };
  if (isBW(ex)) {
    return { h: '+' + U2, s: 'Added weight only', l: 'Leave it at 0 for plain bodyweight. Only enter extra weight you add, like a vest, belt or dumbbell. Your reps are what get tracked.' };
  }
  if (q === 'dumbbell' || (has('dumbbell') && !has('barbell') && !has('ezbar'))) {
    var single = /one[- ]arm|single|goblet|pullover|one dumbbell|^dumbbell (?:raise|side bend)$|two-arm.*one dumbbell/.test(n) || /tricep.*extension/.test(n) && !/lying/.test(n);
    return single
      ? { h: U2 + ' (1 DB)', s: 'Weight of the dumbbell', l: 'You use one dumbbell here. Enter its weight, e.g. 40.' }
      : { h: U2 + ' EACH', s: 'Per dumbbell', l: 'Enter the weight of ONE dumbbell. Holding two 50s? Enter 50, not 100. Strength ranks are set up this way too.' };
  }
  if (q === 'kettlebells' || has('kettlebell') && !has('barbell')) {
    return /double|two-arm kettlebell|kettlebell.*s\b.*double/.test(n) ? { h: U2 + ' EACH', s: 'Per kettlebell', l: 'Enter the weight of ONE kettlebell, even when you hold two.' } : { h: U2, s: 'Weight of the bell', l: 'Enter the weight of the kettlebell or dumbbell you hold.' };
  }
  if (has('smith')) return { h: U2 + ' TOTAL', s: 'Plates + bar', l: 'Enter all the plates plus the Smith bar. Smith bars often weigh 15–25 ' + u + ' (check the label). Count it the same way every time.' };
  if (q === 'barbell' || q === 'e-z curl bar' || has('barbell') || has('ezbar') || has('trapbar')) return { h: U2 + ' TOTAL', s: 'Total on the bar', l: 'Enter the total weight, including the bar itself: an Olympic bar is ' + bar + ', an EZ bar is about ' + (u === 'kg' ? '10 kg' : '25 lb') + '. Use Plates to see what to load.' };
  if (has('leg_press') || has('hack') || has('landmine') || has('sled')) return { h: U2 + ' PLATES', s: 'Plates loaded', l: 'Enter the total of all plates you load (both sides added together). Don\'t add the sled or carriage. If it is a pin-stack machine, enter the stack number instead.' };
  if (q === 'cable' || q === 'machine' || has('cable') || has('lat_pd') || has('cable_row') || /machine|lever|pulley|cable/.test(n)) return { h: U2 + ' STACK', s: 'Weight-stack number', l: 'Enter the number on the stack where the pin goes. Every machine is a little different, so compare to yourself on the same machine.' };
  if (q === 'bands') return { h: 'BAND', s: 'Band level', l: 'Enter a number for the band (for example 1 = lightest) and use the same scale each time.' };
  if (q === 'medicine ball') return { h: U2, s: 'Ball weight', l: 'Enter the weight of the ball.' };
  return { h: U2, s: '', l: 'Enter the weight you lift. Count it the same way every time so progress is accurate.' };
}
function loadSuffix(ex) { var i = loadInfo(ex); return /EACH/.test(i.h) ? ' each' : ''; }

/* ===== injuries ===== */
function injName(a) { var r = INJ_AREAS.filter(function (x) { return x[0] === a; })[0]; return r ? r[1] : a; }
function injurySettingsHTML() {
  var st = S.settings;
  return '<div class="section"><span class="field-label">Injuries</span><div class="chips">' + INJ_AREAS.map(function (r) {
    var j = st.injuries.filter(function (x) { return x.a === r[0]; })[0], lv = j ? j.s : '';
    return '<button class="chip inj ' + lv + '" aria-pressed="' + !!j + '" data-act="injTap" data-k="' + r[0] + '">' + (lv === 'avoid' ? '⛔ ' : lv === 'careful' ? '⚠️ ' : '') + r[1] + (lv ? ' · ' + lv : '') + '</button>';
  }).join('') + '</div><div class="note">Tap once for <b>careful</b> (skips the riskiest exercises for that area), twice for <b>avoid</b> (skips anything that loads it), three times to clear. Workouts, swaps and focus plans follow this. It is a guide, not medical advice: if something hurts, stop and get it checked.</div></div>';
}
function injBadge(e) {
  var h = injuryHits(e); if (!h.length) return '';
  var block = h.some(function (x) { return x.block; });
  return '<div class="injw' + (block ? ' bad' : '') + '">' + (block ? '⛔ Not recommended for your ' : '⚠️ Go easy: may load your ') + h.map(function (x) { return injName(x.a).toLowerCase(); }).join(' and ') + '</div>';
}
function injSheetNote(e) {
  var h = injuryHits(e); if (!h.length) return '';
  var block = h.some(function (x) { return x.block; });
  return '<div class="banner' + (block ? ' bad' : '') + '"><span>' + (block ? '⛔ Because of your ' : '⚠️ With your ') + h.map(function (x) { return injName(x.a).toLowerCase(); }).join(' and ') + ' injury, ' + (block ? 'the app leaves this out of your workouts. Pick a pain-free alternative or use the shuffle button.' : 'use a lighter weight and a pain-free range of motion. Stop if it hurts.') + '</span></div>';
}

/* ===== share / save workouts ===== */
function planTitle(names) { var gs = {}; names.forEach(function (n) { var e = BYNAME[n]; if (e) gs[e.p[0]] = 1; }); var g = GROUPS.filter(function (x) { return gs[x]; }).slice(0, 3); return g.length ? g.join(' · ') : 'Workout'; }
function wkEncode(o) { return 'IW1-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function wkDecode(txt) {
  var m = String(txt || '').match(/IW1-[A-Za-z0-9_-]+/); if (!m) return null;
  try {
    var b = m[0].slice(4).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    var o = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!o || !Array.isArray(o.x)) return null;
    var x = o.x.filter(function (r) { return Array.isArray(r) && typeof r[0] === 'string' && BYNAME[r[0]]; }).slice(0, 15).map(function (r) {
      return [r[0], Math.max(1, Math.min(8, +r[1] || 3)), Math.max(1, Math.min(50, +r[2] || 8)), Math.max(1, Math.min(60, +r[3] || 12)), Math.max(15, Math.min(600, +r[4] || 90))];
    });
    if (!x.length) return null;
    return { f: String(o.f || '').slice(0, 24), t: String(o.t || 'Workout').slice(0, 40), x: x };
  } catch (e) { return null; }
}
function shareBase() { return (!window.claude && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) ? location.origin + location.pathname : 'https://jakesilverthorn-a11y.github.io/iron-ledger/'; }
function shareWorkoutLink(x, title) {
  var from = S.settings.handle || (typeof SRV !== 'undefined' && SRV.name) || '';
  var url = shareBase() + '#wk=' + wkEncode({ f: from, t: title, x: x });
  var text = (from ? from + ' sent you' : 'Here\'s') + ' a workout: ' + title + ' (' + x.length + ' exercises). Open it in Iron Ledger:';
  U.lastShare = url;
  if (navigator.share) navigator.share({ title: 'Iron Ledger workout', text: text, url: url }).catch(function () { });
  else copyText(text + ' ' + url);
}
function saveTemplate(x, title, from) {
  var st = S.settings; st.saved = (st.saved || []).filter(function (w) { return JSON.stringify(w.x) !== JSON.stringify(x); });
  st.saved.unshift({ id: 'sv' + Date.now().toString(36), t: title, f: from || '', x: x, at: Date.now() }); st.saved = st.saved.slice(0, 20);
  persist({ settings: true }); toast('Saved to your workouts on the Train tab'); render();
}
function savedWorkoutsHTML() {
  var sv = S.settings.saved || [];
  var rows = sv.map(function (w) { return '<div class="lrow sv"><div class="grow"><div class="xname">' + esc(w.t) + '</div><div class="xmeta">' + w.x.length + ' exercises' + (w.f ? ' · from ' + esc(w.f) : '') + '</div></div><button class="btn small primary" data-act="wkStart" data-id="' + w.id + '">Start</button><button class="icon-btn" data-act="wkSendSaved" data-id="' + w.id + '" aria-label="Send to a friend">👥</button><button class="icon-btn" data-act="wkDel" data-id="' + w.id + '" aria-label="Delete">' + ico('x') + '</button></div>'; }).join('');
  return '<details class="card section savedw"' + (sv.length ? ' open' : '') + '><summary class="xname">Saved &amp; shared workouts' + (sv.length ? ' (' + sv.length + ')' : '') + '</summary>' + (rows || '<div class="note">Save a workout from a plan or your history, or open a link a friend sent you.</div>') +
    '<div class="row" style="gap:8px;margin-top:6px"><input class="input grow" id="wkcode" placeholder="Paste a workout link or code" autocapitalize="none" autocomplete="off"><button class="btn small" data-act="wkPaste">Open</button></div></details>';
}
function incomingSheet() {
  var w = U.inWk; if (!w) return;
  openSheet((w.f ? w.f + ' sent you a workout' : 'Shared workout'), '<div class="xname" style="font-size:19px">' + esc(w.t) + '</div>' +
    '<div class="card" style="padding:0 14px">' + w.x.map(function (r) { var e = BYNAME[r[0]]; return '<div class="lrow"><span class="grow" style="display:flex;gap:10px;align-items:center"><span class="thumb" style="width:52px">' + demoHTML(e, false) + '</span>' + esc(r[0]) + '</span><span class="faint">' + r[1] + ' × ' + r[2] + '–' + r[3] + '</span></div>' + injBadge(e); }).join('') + '</div>' +
    '<div class="note">Same exercises and sets as your friend. The weights are suggested from your own history, so you each lift what is right for you.</div>' +
    '<button class="btn primary block" data-act="wkStart">Start this workout now</button><button class="btn block" data-act="wkKeep">Save for later</button>');
}
(function () {
  var m = (location.hash || '').match(/[#&]wk=([^&]+)/); if (!m) return;
  var o = wkDecode(decodeURIComponent(m[1])); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
  if (o) { U.inWk = o; setTimeout(incomingSheet, 400); }
})();
