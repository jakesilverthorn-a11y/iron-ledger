/* ===== train together, live =====
   Everyone in a session writes their own tg/<id> document:
   { v, code, u, host, t, st, at, pv, x: [[name, sets, lo, hi, rest]...], log: [[[w, r]...]...], cur, fin }
   x is the plan and pv the time it last changed; the newest plan wins, so a swap or added exercise reaches everyone.
   log holds finished working sets only, weights in lb like the rest of the app. Nothing here is private:
   your training partners (and anyone on the same friends server with the code) can see these sets. */
var TG = { pubT: null, last: '', seen: {}, pend: null, adoptT: null, poll: null };
var TG_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', TG_LIVE = 3 * 3600 * 1000;

function tgReady() { return !!(SOC.db && SOC.uid && S.settings.handle); }
function tgOn() { return !!(S.draft && S.draft.tg); }
function tgFresh(d) { return d && d.code && !d.fin && Date.now() - (d.at || 0) < TG_LIVE; }
function tgCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
function tgSig(x) { return x.map(function (r) { return r[0]; }).join('|'); }
function tgPlan() { return S.draft.ex.map(function (e) { return [e.n, e.sets.filter(function (q) { return !q.wu; }).length || 1, e.lo, e.hi, e.rest]; }); }
function tgLog() { return S.draft.ex.map(function (e) { return e.sets.filter(function (s) { return s.done && !s.wu && +s.r > 0; }).map(function (s) { return [+s.w || 0, +s.r || 0]; }); }); }
function tgTitle() {
  var g = []; S.draft.ex.forEach(function (e) { var x = BYNAME[e.n]; if (x && x.p[0] && g.indexOf(x.p[0]) < 0) g.push(x.p[0]); });
  return g.slice(0, 3).join(' · ') || 'Workout';
}
/* the other people in my session, freshest first */
function tgMates() {
  if (!tgOn()) return [];
  var c = S.draft.tg.code, out = [];
  Object.keys(SOC.tg || {}).forEach(function (id) { var d = SOC.tg[id]; if (id !== SOC.uid && d && d.code === c && Date.now() - (d.at || 0) < TG_LIVE) out.push({ id: id, d: d }); });
  return out.sort(function (a, b) { return (b.d.at || 0) - (a.d.at || 0); });
}
/* live sessions friends are running (or anyone, when they hold the code) */
function tgLiveSessions() {
  var f = S.settings.friends || [], out = [];
  Object.keys(SOC.tg || {}).forEach(function (id) { var d = SOC.tg[id]; if (id !== SOC.uid && d && d.host && tgFresh(d) && f.indexOf(id) >= 0) out.push({ id: id, d: d }); });
  return out.sort(function (a, b) { return (b.d.at || 0) - (a.d.at || 0); });
}
function tgFind(code) {
  var hit = null;
  Object.keys(SOC.tg || {}).forEach(function (id) { var d = SOC.tg[id]; if (id !== SOC.uid && d && d.code === code && tgFresh(d) && (!hit || d.host || (d.at > hit.d.at && !hit.d.host))) hit = { id: id, d: d }; });
  return hit;
}

/* ----- publishing my side ----- */
function tgDoc() {
  var tg = S.draft.tg, log = tgLog();
  // the exercise I last finished a set on is "where I am"
  var prev = TG.lastLog || [];
  log.forEach(function (l, i) { var p = prev[i]; if (l.length > (p ? p.length : 0)) tg.cur = i; });
  TG.lastLog = log;
  return { v: 1, code: tg.code, u: S.settings.handle, host: !!tg.host, t: tg.t || tgTitle(), st: S.draft.t, pv: tg.pv || 0, x: tgPlan(), log: log, cur: tg.cur || 0, fin: 0 };
}
/* newest plan version anyone in the session has (so a phone with a slow clock still wins with its own edits) */
function tgNewestPv() { var v = 0; tgMates().forEach(function (m) { v = Math.max(v, +m.d.pv || 0); }); return v; }
function tgSoon(ms) { if (!tgOn() || !tgReady()) return; clearTimeout(TG.pubT); TG.pubT = setTimeout(tgPublish, ms == null ? 1200 : ms); }
async function tgPublish(extra) {
  if (!tgReady() || (!tgOn() && !extra)) return;
  var doc = extra || tgDoc();
  if (!extra) {
    var sig = tgSig(doc.x);
    if (S.draft.tg.sig !== sig) { S.draft.tg.sig = sig; S.draft.tg.pv = doc.pv = Math.max(Date.now(), (S.draft.tg.pv || 0) + 1, tgNewestPv() + 1); saveLocal(); }
  }
  var key = JSON.stringify(doc); if (key === TG.last) return;
  doc.at = Date.now();
  try { await SOC.db.doc('tg/' + SOC.uid).set(doc); TG.last = key; SOC.tg = SOC.tg || {}; SOC.tg[SOC.uid] = doc; }
  catch (e) { if (!TG.warned) { TG.warned = 1; toast(e && /404|not found/i.test(String(e.message)) ? 'Your friends server needs an update for live workouts.' : 'Could not reach your friends right now. Still trying.'); } clearTimeout(TG.pubT); TG.pubT = setTimeout(function () { tgPublish(extra); }, 15000); }   // keeps retrying the finish note too
}
/* called before a workout is finished or discarded, so partners see you are done */
function tgEnd() {
  if (!tgOn()) return;
  var d = tgDoc(); d.fin = Date.now(); clearTimeout(TG.pubT); TG.last = ''; TG.lastLog = null;
  tgPublish(d);
}

/* ----- starting, joining, leaving ----- */
function tgNewCode() {
  for (var k = 0; k < 20; k++) {
    var c = ''; for (var i = 0; i < 4; i++) c += TG_CHARS[Math.floor(Math.random() * TG_CHARS.length)];
    if (!tgFind(c)) return c;
  }
  return c;
}
function tgNeedAccount() {
  openSheet('Train together', '<div class="note" style="font-size:15px">Live workouts use your friends account, so you can see each other\'s sets as you go.</div>' +
    (SOC.db ? '<div class="note">Pick a username on the Friends tab first.</div>' : '<div class="note">Sign in or create an account on the Friends tab first. It takes a few seconds.</div>') +
    '<button class="btn primary block" data-act="tab" data-t="friends">Go to Friends</button>' +
    '<button class="btn block" data-act="wkSendDraft">Send a copy of this workout instead</button>');
}
function tgStart() {
  if (!tgReady()) { tgNeedAccount(); return; }
  if (!S.draft || !S.draft.ex.length) { toast('Add an exercise first.'); return; }
  if (!tgOn()) { S.draft.tg = { code: tgNewCode(), host: true, pv: Date.now(), t: tgTitle(), sig: '' }; persist({ draft: true }); tgPublish(); }
  render(); tgInviteSheet();
}
function tgInviteLink() { return shareBase() + '#tg=' + S.draft.tg.code; }
function tgInviteSheet() {
  if (!tgOn()) return;
  var c = S.draft.tg.code;
  openSheet('Train together', '<div class="tgcode-wrap"><div class="note">Your friend taps <b>Join a friend</b> on their Train tab and enters</div><div class="tgcode">' + c.split('').join(' ') + '</div></div>' +
    '<button class="btn primary block" data-act="tgShare">Send invite</button>' +
    '<div class="note">You\'ll both have the same exercises. Add or swap one and it changes for everyone. Each of you sees the others\' sets as they\'re logged, and your weights are suggested from your own history.</div>' +
    '<div class="note">Friends you\'ve added on the Friends tab also see this workout on their Train tab and can join with one tap.</div>');
}
function tgShare() {
  var c = S.draft.tg.code, url = window.claude ? '' : tgInviteLink();
  var text = S.settings.handle + ' is working out now. Join live in Iron Ledger with code ' + c + ' (Train tab → Join a friend)' + (url ? ', or open:' : '.');
  if (navigator.share) navigator.share(url ? { title: 'Train together', text: text, url: url } : { title: 'Train together', text: text }).catch(function () { });
  else copyText(text + (url ? ' ' + url : ''), 'Invite copied. Paste it to your friend.');
}
function tgJoin(code) {
  code = tgCode(code);
  if (!code) { toast('Enter the code your friend sees.'); return; }
  if (!tgReady()) { U.tgPend = code; tgNeedAccount(); return; }
  var h = tgFind(code);
  if (!h) {
    if (!SOC.tgLoaded) { U.tgPend = code; toast('Looking for that workout…'); if (typeof srvPoll === 'function' && srvOn()) srvPoll(); return; }
    toast('No live workout with code ' + code + '. Check the code with your friend.'); return;
  }
  U.tgPend = null;
  if (tgOn() && S.draft.tg.code === code) { closeSheet(); U.tab = 'train'; render(); return; }
  if (S.draft && S.draft.ex.some(function (e) { return e.sets.some(function (s) { return s.done; }); })) {
    U.tgJoinAsk = h; openSheet('Join ' + h.d.u + '?', '<div class="note" style="font-size:15px">You already have a workout going. Join and your logged sets stay; ' + esc(h.d.u) + '\'s exercises are added to it.</div><button class="btn primary block" data-act="tgJoinYes">Join</button><button class="btn block" data-act="close">Not now</button>');
    return;
  }
  tgJoinNow(h);
}
function tgJoinNow(h) {
  var d = h.d;
  if (!S.draft) newDraft([]);
  S.draft.tg = { code: d.code, host: false, pv: d.pv || 0, t: d.t, sig: '' };
  tgAdopt(d.x, true);
  S.draft.tg.sig = tgSig(tgPlan());
  persist({ draft: true }); tgPublish();
  U.tgJoinAsk = null; closeSheet(); U.tab = 'train'; render(); window.scrollTo(0, 0);
  toast('You\'re training with ' + d.u + '. Weights are suggested from your history.');
  keepAwake();
}
function tgLeave() {
  if (!tgOn()) return;
  tgEnd(); delete S.draft.tg; persist({ draft: true }); closeSheet(); render(); toast('You left the live workout. Your sets are still here.');
}

/* ----- following someone else's plan ----- */
/* Rebuild my exercise list in their order. Exercises I already logged sets on are always kept. */
function tgAdopt(x, quiet) {
  var mine = S.draft.ex.slice(), used = [], next = [], added = [], dropped = [];
  x.forEach(function (r) {
    if (!BYNAME[r[0]]) return;
    var i = -1; mine.forEach(function (e, j) { if (i < 0 && used.indexOf(j) < 0 && e.n === r[0]) i = j; });
    if (i >= 0) { used.push(i); next.push(mine[i]); }
    else { next.push(makeWorkoutEx(realWorkouts(), { n: r[0], sets: r[1], lo: r[2], hi: r[3], rest: r[4] }, unit())); added.push(r[0]); }
  });
  mine.forEach(function (e, j) {
    if (used.indexOf(j) >= 0) return;
    if (e.sets.some(function (s) { return s.done; })) next.push(e); else dropped.push(e.n);
  });
  S.draft.ex = next;
  return { added: added, dropped: dropped };
}
function tgSync() {
  if (!tgOn()) return false;
  var tg = S.draft.tg, best = null;
  tgMates().forEach(function (m) { if (!m.d.fin && (m.d.pv || 0) > (tg.pv || 0) && (!best || m.d.pv > best.d.pv)) best = m; });
  if (!best) return false;
  var a = document.activeElement;
  if (a && a.tagName === 'INPUT' && $('#view').contains(a)) { clearTimeout(TG.adoptT); TG.adoptT = setTimeout(function () { if (tgSync()) render(); }, 1500); return false; }
  var ch = tgAdopt(best.d.x);
  tg.pv = best.d.pv; tg.sig = tgSig(tgPlan());
  persist({ draft: true }); tgSoon(300);
  var bits = [];
  if (ch.added.length) bits.push('added ' + ch.added.join(', '));
  if (ch.dropped.length) bits.push('removed ' + ch.dropped.join(', '));
  if (bits.length) toast(best.d.u + ' ' + bits.join(' and '));
  return true;
}
/* someone else's new sets, as a short heads-up */
function tgNews() {
  tgMates().forEach(function (m) {
    var d = m.d, n = 0; (d.log || []).forEach(function (l) { n += l.length; });
    var k = m.id + ':' + d.code, was = TG.seen[k];
    TG.seen[k] = n;
    if (was == null || n <= was) { if (d.fin && TG.seen[k + ':fin'] !== d.fin) { TG.seen[k + ':fin'] = d.fin; if (was != null) toast(d.u + ' finished their workout'); } return; }
    var l = (d.log || [])[d.cur || 0], s = l && l[l.length - 1], nm = d.x && d.x[d.cur || 0] ? d.x[d.cur || 0][0] : '';
    if (s && nm) toast(d.u + ': ' + nm + ' · ' + tgSet(s, BYNAME[nm]));
  });
}
function tgSet(s, ex) { var w = +s[0] || 0, r = Math.round(+s[1] || 0); return (ex && isBW(ex) && !w) ? r + ' reps' : fmtW(w, unit()) + ' ' + uLabel() + ' × ' + r; }

/* new data from the server or the shared store */
function tgChanged() {
  SOC.tgLoaded = true;
  if (U.tgPend) {
    var p = U.tgPend;
    if (tgFind(p)) { U.tgPend = null; tgJoin(p); return; }
    U.tgPend = null; toast('No live workout with code ' + p + '. Check the code with your friend.');   // give up after the first fresh copy, never auto-join later
  }
  if (tgOn()) {
    var moved = tgSync(); tgNews();
    if (moved && U.tab === 'train') render();
    var b = $('#tgbox'); if (b) b.innerHTML = tgBoxInner();
    if (U.tgSheet && sheetOpen()) tgSheet();
  } else if (U.tab === 'train' && !S.draft) {
    var l = $('#tglive'); if (l) l.outerHTML = tgJoinCard();
  }
}

/* ----- views ----- */
function tgAgo(t) { var s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 45 ? 'now' : s < 3600 ? Math.round(s / 60) + 'm ago' : Math.round(s / 3600) + 'h ago'; }
function tgCount(d) { var n = 0; (d.log || []).forEach(function (l) { n += l.length; }); return n; }
function tgTotal(d) { var n = 0; (d.x || []).forEach(function (r) { n += +r[1] || 0; }); return n; }
function tgMateRow(m) {
  var d = m.d, i = d.cur || 0, nm = d.x && d.x[i] ? d.x[i][0] : '', l = (d.log || [])[i] || [], s = l[l.length - 1];
  var done = tgCount(d), tot = Math.max(done, tgTotal(d));
  var where = d.fin ? 'Finished · ' + done + ' sets' : done ? esc(nm) + ' · set ' + l.length + (s ? ': ' + tgSet(s, BYNAME[nm]) : '') : 'Getting started';
  return '<div class="tgm"><div class="tgav">' + esc((d.u || '?').slice(0, 1).toUpperCase()) + '</div><div class="grow"><div class="row" style="gap:8px"><b class="grow">' + esc(d.u) + '</b><span class="faint" style="font-size:12px">' + tgAgo(d.at) + '</span></div><div class="xmeta">' + where + '</div><div class="cbar" style="margin:5px 0 0"><i style="width:' + (tot ? Math.round(100 * done / tot) : 0) + '%"></i></div></div></div>';
}
function tgBoxInner() {
  var ms = tgMates(), c = S.draft.tg.code;
  var head = '<div class="row" style="gap:8px"><span class="tglive-dot"></span><b class="grow">Live · code ' + c + '</b><button class="btn small ghost" data-act="tgInvite">Invite</button><button class="btn small ghost" data-act="tgOpen">Sets</button></div>';
  if (!ms.length) return head + '<div class="note">Waiting for a friend to join. They tap <b>Join a friend</b> on their Train tab and enter ' + c + '.</div>';
  return head + ms.map(tgMateRow).join('');
}
function tgBox() { return tgOn() ? '<div class="card tgbox" id="tgbox">' + tgBoxInner() + '</div>' : ''; }
function tgWorkoutButtons() {
  if (!S.draft.ex.length) return '';
  if (tgOn()) return '<button class="btn block ghost" data-act="tgLeave">Leave live workout</button>';
  return '<button class="btn block ghost" data-act="tgStart">👥 Train together live</button>' +
    '<div class="note" style="text-align:center;margin-top:-6px"><button class="linkbtn" data-act="wkSendDraft">or send a copy of this workout</button></div>';
}
/* everyone's sets, exercise by exercise */
function tgSheet() {
  if (!tgOn()) { U.tgSheet = false; return; }
  U.tgSheet = true;
  var me = { id: SOC.uid, d: SOC.tg && SOC.tg[SOC.uid] && SOC.tg[SOC.uid].code === S.draft.tg.code ? SOC.tg[SOC.uid] : tgDoc() };
  me.d = Object.assign({}, me.d, { u: 'You', x: tgPlan(), log: tgLog() });
  var ppl = [me].concat(tgMates());
  var names = [];
  ppl.forEach(function (p) { (p.d.x || []).forEach(function (r) { if (names.indexOf(r[0]) < 0) names.push(r[0]); }); });
  var body = names.map(function (n) {
    var ex = BYNAME[n];
    return '<div class="card" style="padding:10px 14px"><div class="xname" style="margin-bottom:6px">' + esc(n) + '</div>' + ppl.map(function (p) {
      var i = -1; (p.d.x || []).forEach(function (r, j) { if (i < 0 && r[0] === n) i = j; });
      var l = i >= 0 ? ((p.d.log || [])[i] || []) : null;
      return '<div class="lrow"><span>' + esc(p.d.u) + '</span><span class="faint" style="text-align:right">' + (l == null ? 'not in their workout' : l.length ? l.map(function (s) { return tgSet(s, ex); }).join(', ') : '–') + '</span></div>';
    }).join('') + '</div>';
  }).join('');
  var sb = $('#sheet-body'), y = U.tgSheetOpen && sb ? sb.scrollTop : 0;
  openSheet('Everyone\'s sets', body + '<div class="note">Updates every few seconds while the app is open.</div>');
  U.tgSheet = true; U.tgSheetOpen = true; sb = $('#sheet-body'); if (sb && y) sb.scrollTop = y;
}
/* Train tab: join by code, or tap a friend who is training now */
function tgJoinCard() {
  if (!SOC.db) return '<div id="tglive"></div>';
  var live = tgLiveSessions();
  return '<div class="card section tgjoin" id="tglive" style="gap:10px"><div class="row"><h2 class="grow" style="font-size:22px">Join a friend</h2>' + (live.length ? '<span class="tglive-dot"></span>' : '') + '</div>' +
    live.map(function (s) { var d = s.d; return '<div class="lrow sv"><div class="grow"><div class="xname">' + esc(d.u) + ' · ' + esc(d.t || 'Workout') + '</div><div class="xmeta">' + (d.x || []).length + ' exercises · started ' + tgAgo(d.st || d.at) + '</div></div><button class="btn small primary" data-act="tgJoin" data-c="' + esc(d.code) + '">Join</button></div>'; }).join('') +
    '<div class="row" style="gap:8px"><input class="input grow tgin" id="tgcode" placeholder="Code, like K7Q2" maxlength="6" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Workout code"><button class="btn small" data-act="tgJoinCode">Join</button></div>' +
    (live.length ? '' : '<div class="note">Working out with someone? Start a workout, tap <b>Train together live</b>, and they enter the code here.</div>') + '</div>';
}

/* ----- links opened in Safari instead of the Home Screen app ----- */
function tgIsSafariTab() { return !window.claude && /iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.standalone === false; }
function tgHasHistory() { return (S.workouts || []).length > 0; }
function safariSheet(kind, val, go) {
  U.safariGo = go;
  var link = shareBase() + '#' + kind + '=' + val;
  U.safariLink = link;
  openSheet('Open in your app?', '<div class="note" style="font-size:15px">This opened in Safari. If you have Iron Ledger on your Home Screen, open it there so it lands with your own workouts.</div>' +
    (kind === 'tg' ? '<div class="tgcode-wrap"><div class="note">In the app, tap <b>Join a friend</b> on the Train tab and enter</div><div class="tgcode">' + val.split('').join(' ') + '</div></div>'
      : '<button class="btn primary block" data-act="safariCopy">Copy workout link</button><div class="note">Then open Iron Ledger from your Home Screen and tap <b>Paste</b> under Saved &amp; shared workouts on the Train tab.</div>') +
    '<button class="btn block" data-act="safariHere">Use it here in Safari</button>' +
    '<div class="note">No app yet? Tap the Share button below, then <b>Add to Home Screen</b>.</div>');
}
async function pasteInto(id) {
  try {
    var t = await navigator.clipboard.readText(), el = $('#' + id);
    if (!t) { toast('Nothing copied yet.'); return null; }
    if (el) el.value = t.trim();
    return t.trim();
  } catch (e) { toast('Press and hold the box, then tap Paste.'); var el2 = $('#' + id); if (el2) el2.focus(); return null; }
}
/* a pasted link or text may be a live code, a #tg= link, or a shared workout */
function openPasted(t) {
  var m = String(t || '').match(/[#&]tg=([A-Za-z0-9]{3,6})/);
  if (m) { tgJoin(m[1]); return true; }
  var w = wkDecode(t); if (w) { U.inWk = w; incomingSheet(); return true; }
  if (/^[A-Za-z0-9]{4}$/.test(String(t || '').trim())) { tgJoin(t); return true; }
  return false;
}

function tgClick(a, d) {
  if (a === 'tgStart') { tgStart(); return true; }
  if (a === 'tgInvite') { tgInviteSheet(); return true; }
  if (a === 'tgShare') { tgShare(); return true; }
  if (a === 'tgLeave') { tgLeave(); return true; }
  if (a === 'tgOpen') { tgSheet(); return true; }
  if (a === 'tgJoin') { tgJoin(d.c); return true; }
  if (a === 'tgJoinCode') { tgJoin(($('#tgcode') || {}).value); return true; }
  if (a === 'tgJoinYes') { if (U.tgJoinAsk) tgJoinNow(U.tgJoinAsk); return true; }
  if (a === 'safariCopy') { copyText(U.safariLink || '', 'Copied. Now open Iron Ledger from your Home Screen.'); return true; }
  if (a === 'safariHere') { var g = U.safariGo; U.safariGo = null; closeSheet(); if (g) g(); return true; }
  if (a === 'tgPasteWk') { pasteInto('wkcode').then(function (t) { if (t && !openPasted(t)) toast('That is not a workout link or code.'); }); return true; }
  return false;
}

/* faster refresh while you are in a live workout */
function tgTick() {
  if (!tgOn() || document.hidden) return;
  if (typeof srvOn === 'function' && srvOn() && SRV.uid) srvPoll();
}
setInterval(tgTick, 8000);

/* links: #tg=CODE (waits for the friends connection to come up first) */
setTimeout(function () {
  var m = (location.hash || '').match(/[#&]tg=([A-Za-z0-9]{3,6})/); if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
  var code = tgCode(m[1]), tries = 0;
  var go = function () {
    U.tab = 'train'; render();
    (function wait() { if (tgReady() || ++tries > 20) tgJoin(code); else setTimeout(wait, 300); })();
  };
  if (tgIsSafariTab() && !tgHasHistory()) safariSheet('tg', code, go); else go();
}, 700);
