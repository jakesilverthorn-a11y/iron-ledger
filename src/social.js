/* ===== friends, compare & challenges =====
   Everything shared lives in three per-person documents, so each person only ever writes their own:
   people/<id>  public profile: username, overall + muscle scores (never height, weight or workouts)
   ch/<id>      challenges that person started
   cp/<id>      that person's progress in challenges they joined
   Friends are a private list kept in your own settings. */
var SOC = { db: null, uid: null, canWrite: null, state: 'pending', people: {}, ch: {}, cp: {}, tg: {}, cat: 'Overall', q: '', lastPub: '', lastProg: '', pubT: null, progT: null, renderT: null, err: null, chTab: 'active', busy: false };
var CHAL = {
  workouts: { n: 'Most workouts', d: 'Whoever trains the most days wins.', u: 'workouts' },
  sets: { n: 'Most sets', d: 'Total sets logged. Pick a muscle or count everything.', u: 'sets' },
  climb: { n: 'Rank climb', d: 'Biggest gain in strength score. Fair for any size or level, because you only race your own start.', u: 'pts' },
  lift: { n: 'Lift duel', d: 'Best relative score on one lift. Size-adjusted, so a lighter lifter can beat a heavier one.', u: 'pts' }
};
var CHAL_DAYS = [3, 7, 14, 30];

function socRef() { return SOC.db && SOC.uid ? SOC : null; }
function socMe() { return SOC.people[SOC.uid] || null; }
function socFriends() { var f = S.settings.friends || []; return f.filter(function (id) { return id !== SOC.uid; }); }
function socName(id) { var p = SOC.people[id]; return p ? p.u : 'Someone'; }
function socAgo(t) {
  if (!t) return 'no workouts yet';
  var d = Math.floor((Date.now() - t) / DAY);
  return d <= 0 ? 'trained today' : d === 1 ? 'trained yesterday' : d < 14 ? 'trained ' + d + ' days ago' : d < 60 ? 'trained ' + Math.round(d / 7) + ' weeks ago' : 'last trained ' + fmtDate(t);
}
function socChanged() {
  clearTimeout(SOC.renderT);
  SOC.renderT = setTimeout(function () {
    var a = document.activeElement;
    if (U.tab === 'friends' && !(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) && !sheetOpen()) render();
    else if (sheetOpen() && U.socSheet && !(a && a.tagName === 'INPUT')) U.socSheet();
  }, 250);
  socProgressSoon();
}

async function socInit(db, user, id) {
  SOC.db = db; SOC.uid = id;
  try { SOC.canWrite = user && user.can ? await user.can('data.write') : null; } catch (e) { SOC.canWrite = null; }
  function sub(col, key) {
    try {
      db.collection(col).onSnapshot(function (snap) {
        var m = {}; snap.docs.forEach(function (d) { var x = d.data(); if (x) m[d.id] = x; });
        SOC[key] = m; SOC.state = 'ready'; SOC.err = null;
        if (key === 'tg') { if (typeof tgChanged === 'function') tgChanged(); } else socChanged();
      }, function (e) { SOC.err = e && e.code; if (SOC.state !== 'ready') SOC.state = 'error'; socChanged(); });
    } catch (e) { SOC.state = 'error'; }
  }
  sub('people', 'people'); sub('ch', 'ch'); sub('cp', 'cp'); sub('tg', 'tg');
}

/* what other people may see about you */
function socDoc() {
  var B = profB(), W = realWorkouts(), now = Date.now(), H = allHistories(W), me = socMe() || {};
  var h = S.settings.handle || me.u || '';
  var doc = { v: 1, u: h, un: h.toLowerCase(), ov: null, g: {}, ex: {}, w30: 0, s30: 0, n: W.length, last: W.length ? W[W.length - 1].t : 0 };
  W.forEach(function (w) { if (w.t >= now - 30 * DAY) { doc.w30++; w.ex.forEach(function (e) { doc.s30 += e.sets.filter(function (s) { return (+s.r || 0) > 0; }).length; }); } });
  if (B) {
    var ov = overallRankAt(H, B, now); doc.ov = ov ? ov.score : null;
    // nightly leaderboard: the same scores as of the last 10 pm cut-off
    var C = boardCutoff(now), ovc = overallRankAt(H, B, C); doc.b = { c: C, ov: ovc ? ovc.score : null, g: {} };
    GROUPS.forEach(function (g) { var rc = groupRankAt(H, g, B, C); if (rc) doc.b.g[g] = rc.score; });
    GROUPS.forEach(function (g) { var r = groupRankAt(H, g, B, now); if (r) doc.g[g] = r.score; });
    var arr = []; Object.keys(H).forEach(function (n) { var r = exerciseRank(n, H[n], B, now); if (r) arr.push([n, r.score]); });
    arr.sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10).forEach(function (a) { doc.ex[a[0]] = a[1]; });
  }
  return doc;
}
function socPublishSoon() { clearTimeout(SOC.pubT); SOC.pubT = setTimeout(socPublish, 4000); }
async function socPublish(force) {
  if (!socRef() || SOC.canWrite === false || !S.settings.handle || !socMe()) return;
  if (SOC.busy && !force) return;
  var doc = socDoc(), key = JSON.stringify(doc);
  if (!force && key === SOC.lastPub) return;
  try { SOC.busy = true; doc.at = Date.now(); await SOC.db.doc('people/' + SOC.uid).set(doc); SOC.lastPub = key; }
  catch (e) { clearTimeout(SOC.pubT); SOC.pubT = setTimeout(socPublish, 30000); }
  SOC.busy = false;
}

/* ----- usernames ----- */
function validHandle(h) { return /^[A-Za-z0-9_]{3,16}$/.test(h); }
async function socClaim(handle) {
  if (!socRef()) return 'Friends needs your Claude account. Open the app signed in.';
  if (SOC.canWrite === false) return 'Your access to this app is view-only, so you cannot create a profile. Ask the owner to share it with edit or contributor access.';
  var B = profB(); if (!B) return 'Add your height, weight and sex first (Settings → Your body). Scores are compared by size.';
  if (srvOn()) {
    try { S.settings.handle = SRV.name; persist({ settings: true }); var sd = socDoc(); sd.at = Date.now(); await SOC.db.doc('people/' + SOC.uid).set(sd); SOC.people[SOC.uid] = sd; SOC.lastPub = JSON.stringify(socDoc()); return null; }
    catch (e) { return e && e.message || 'Could not reach the server. Try again.'; }
  }
  if (!validHandle(handle)) return 'Use 3 to 16 letters, numbers or underscores.';
  var un = handle.toLowerCase();
  try {
    var lease = await SOC.db.doc('handles/' + un).acquire({ holder: SOC.uid, ttlMs: 8000 });
    if (!lease.acquired) return 'Someone is claiming that name right now. Try again in a few seconds.';
    var q = await SOC.db.collection('people').where('un', '==', un).get(), taken = false;
    q.docs.forEach(function (d) { if (d.id !== SOC.uid) taken = true; });
    if (taken) return 'That username is taken. Try another.';
    S.settings.handle = handle; persist({ settings: true });
    var doc = socDoc(); doc.at = Date.now();
    await SOC.db.doc('people/' + SOC.uid).set(doc);
    SOC.people[SOC.uid] = doc; SOC.lastPub = JSON.stringify(socDoc());
    return null;
  } catch (e) { return e && e.code === 'invalid_argument' ? 'Your access to this app does not allow saving a profile. Ask the owner for contributor access.' : 'Could not reach the server. Try again.'; }
}
async function socLeave() {
  try { await SOC.db.doc('people/' + SOC.uid).delete(); await SOC.db.doc('cp/' + SOC.uid).delete(); } catch (e) { }
  delete SOC.people[SOC.uid]; S.settings.handle = ''; SOC.lastPub = ''; persist({ settings: true });
}

/* ----- challenges ----- */
function chalList() {
  var out = [], me = SOC.uid, fr = socFriends();
  Object.keys(SOC.ch).forEach(function (uid) {
    ((SOC.ch[uid] && SOC.ch[uid].list) || []).forEach(function (c) {
      var mine = uid === me, invited = (c.inv || []).indexOf(me) >= 0, fromFriend = fr.indexOf(uid) >= 0 && !(c.inv && c.inv.length);
      var joined = !!(SOC.cp[me] && SOC.cp[me].c && SOC.cp[me].c[c.id]);
      if (mine || invited || joined || fromFriend) out.push(Object.assign({}, c, { by: uid, mine: mine, invited: invited, joined: joined }));
    });
  });
  return out.sort(function (a, b) { return b.st - a.st; });
}
function chalPlayers(c) {
  var out = [];
  Object.keys(SOC.cp).forEach(function (uid) { var e = SOC.cp[uid] && SOC.cp[uid].c && SOC.cp[uid].c[c.id]; if (e) out.push({ id: uid, v: +e.v || 0 }); });
  return out.sort(function (a, b) { return b.v - a.v; });
}
function chalValue(c) {
  var W = realWorkouts(), B = profB(), now = Math.min(Date.now(), c.en);
  var inW = W.filter(function (w) { return w.t >= c.st && w.t <= c.en; });
  if (c.ty === 'workouts') return inW.length;
  if (c.ty === 'sets') {
    var n = 0; inW.forEach(function (w) { w.ex.forEach(function (e) { var ex = BYNAME[e.n]; if (c.g && !(ex && ex.p.indexOf(c.g) >= 0)) return; n += e.sets.filter(function (s) { return (+s.r || 0) > 0; }).length; }); });
    return n;
  }
  if (!B) return 0;
  var H = allHistories(W);
  if (c.ty === 'climb') {
    var at = function (t) { return c.g ? groupRankAt(H, c.g, B, t) : overallRankAt(H, B, t); };
    var cur = at(now); if (!cur) return 0;
    var base = at(c.st) || (inW.length ? at(inW[0].t) : null);
    return Math.round((cur.pct - (base ? base.pct : cur.pct)) * 10) / 10;
  }
  if (c.ty === 'lift') {
    var Hw = allHistories(inW), r = Hw[c.ex] ? exerciseRank(c.ex, Hw[c.ex], B, now) : null;
    return r ? r.score : 0;
  }
  return 0;
}
function chalFmt(c, v) {
  if (c.ty === 'climb') return (v > 0 ? '+' : '') + (Math.round(v * 10) / 10) + ' pts';
  if (c.ty === 'lift') return v ? Math.round(v) + ' pts' : '–';
  return Math.round(v) + (c.ty === 'sets' ? ' sets' : ' workouts');
}
function chalState(c) { var now = Date.now(); return now < c.st ? 'soon' : now > c.en ? 'done' : 'live'; }
function chalLeft(c) { var d = Math.ceil((c.en - Date.now()) / DAY); return d <= 0 ? 'ends today' : d === 1 ? '1 day left' : d + ' days left'; }
function chalTitle(c) {
  var t = CHAL[c.ty] ? CHAL[c.ty].n : 'Challenge';
  if (c.ty === 'sets' && c.g) t = 'Most ' + c.g.toLowerCase() + ' sets';
  if (c.ty === 'climb' && c.g) t = c.g + ' rank climb';
  if (c.ty === 'lift') t = c.ex;
  return t;
}
function socProgressSoon() { clearTimeout(SOC.progT); SOC.progT = setTimeout(socProgress, 2500); }
async function socProgress() {
  if (!socRef() || SOC.canWrite === false || !S.settings.handle) return;
  var mine = (SOC.cp[SOC.uid] && SOC.cp[SOC.uid].c) || {}, next = {}, changed = false;
  chalList().forEach(function (c) {
    if (!c.joined && !c.mine) return;
    var old = mine[c.id];
    if (chalState(c) === 'done' && old) { next[c.id] = old; return; }
    var v = chalValue(c);
    next[c.id] = { v: v, at: old && old.v === v ? old.at : Date.now() };
    if (!old || old.v !== v) changed = true;
  });
  Object.keys(mine).forEach(function (id) { if (!next[id] && Date.now() - (mine[id].at || 0) < 120 * DAY) next[id] = mine[id]; });
  var key = JSON.stringify(Object.keys(next).sort().map(function (k) { return [k, next[k].v]; }));
  if (!changed && key === SOC.lastProg) return;
  try { await SOC.db.doc('cp/' + SOC.uid).set({ v: 1, c: next, at: Date.now() }); SOC.lastProg = key; } catch (e) { }
}
async function socSaveChallenge(c) {
  var mineList = ((SOC.ch[SOC.uid] && SOC.ch[SOC.uid].list) || []).filter(function (x) { return Date.now() - x.en < 60 * DAY; });
  mineList.push(c);
  var list = mineList.slice(-20);
  await SOC.db.doc('ch/' + SOC.uid).set({ v: 1, list: list, at: Date.now() });
  SOC.ch[SOC.uid] = { v: 1, list: list };
  var mine = (SOC.cp[SOC.uid] && SOC.cp[SOC.uid].c) || {};
  var cc = Object.assign({}, mine); cc[c.id] = { v: chalValue(c), at: Date.now() };
  await SOC.db.doc('cp/' + SOC.uid).set({ v: 1, c: cc, at: Date.now() });
  SOC.cp[SOC.uid] = { v: 1, c: cc };
}
async function socJoin(c) {
  var mine = (SOC.cp[SOC.uid] && SOC.cp[SOC.uid].c) || {}, cc = Object.assign({}, mine); cc[c.id] = { v: chalValue(c), at: Date.now() };
  await SOC.db.doc('cp/' + SOC.uid).set({ v: 1, c: cc, at: Date.now() });
  SOC.cp[SOC.uid] = { v: 1, c: cc };
}

/* ----- views ----- */
function lbRows(cat) {
  var ids = [SOC.uid].concat(socFriends()), rows = [];
  ids.forEach(function (id) {
    var p = SOC.people[id]; if (!p) { if (id !== SOC.uid) rows.push({ id: id, gone: true, s: null }); return; }
    var s = boardVal(p, cat);
    rows.push({ id: id, p: p, s: s == null ? null : s, me: id === SOC.uid });
  });
  rows.sort(function (a, b) { return (b.s == null ? -1 : b.s) - (a.s == null ? -1 : a.s); });
  return rows;
}
function scoreChip(s) { return s == null ? '<span class="faint">–</span>' : '<span class="num" style="font-size:26px">' + Math.round(s) + '</span>'; }
function socJoinCard(why) {
  var B = profB();
  if (srvOn()) return '<div class="card section"><h2>Signed in as ' + esc(SRV.name) + '</h2><div class="note">One more step: publish your scores so friends can see them. Friends see your username and strength scores only. Your height, weight and workouts stay on your phone.</div>' + (B ? '' : '<div class="banner"><span>Add your height, weight and sex first so your score can be worked out.</span><button class="btn small" data-act="bodyEdit">Add</button></div>') + '<div class="note" id="h-err" style="color:var(--down);min-height:0">' + esc(why || '') + '</div><button class="btn primary block" data-act="socCreate">Publish my scores</button><button class="btn block ghost" data-act="srvOut">Sign out</button></div>';
  var blocked = SOC.canWrite === false ? '<div class="banner"><span>Your access to this app is <b>view-only</b>, so you can look but not create a profile. Ask the person who shared it to give you contributor (or editor) access.</span></div>' : '';
  return '<div class="card section"><h2>Race your friends</h2><div class="note">Pick a username. Friends see your strength scores, which are already adjusted for height, weight and sex, so a 70 from a small lifter beats a 60 from a big one. Your height, weight and workouts stay private.</div>' +
    (B ? '' : '<div class="banner"><span>Add your height, weight and sex first so your score can be worked out.</span><button class="btn small" data-act="bodyEdit">Add</button></div>') + blocked +
    '<input class="input" id="handle" maxlength="16" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Username (3–16 letters or numbers)" aria-label="Username" value="' + esc(S.settings.handle || '') + '">' +
    '<div class="note" id="h-err" style="color:var(--down);min-height:0">' + esc(why || '') + '</div>' +
    '<button class="btn primary block" data-act="socCreate">Create my profile</button>' +
    '<div class="note">There is no separate password. You are already signed in with your Claude account, and that is what keeps your profile yours. The username is only the name friends see.</div></div>';
}
function viewFriends() {
  if (codeMode()) return (SRV.url && !U.codes) ? viewFriendsAuth() : viewFriendsCode();
  var head = '<div class="screen-head"><div><div class="sub">Compare strength, start challenges</div><h1>Friends</h1></div></div>';
  if (!SOC.db) return '<div class="screen">' + head + '<div class="empty"><h3>Sign in to use Friends</h3>Friends and challenges are saved to your Claude account. Open this app while signed in to Claude and they appear here.</div></div>';
  if (SOC.state === 'pending') return '<div class="screen">' + head + '<div class="empty"><h3>Loading…</h3></div></div>';
  if (SOC.state === 'error') return '<div class="screen">' + head + '<div class="empty"><h3>Could not load friends</h3>Check your connection and try again in a moment.</div></div>';
  if (!socMe() || !S.settings.handle) return '<div class="screen">' + head + socJoinCard() + '</div>';
  var cats = ['Overall'].concat(GROUPS), cat = SOC.cat;
  var chips = '<div class="chips">' + cats.map(function (g) { return '<button class="chip" aria-pressed="' + (g === cat) + '" data-act="socCat" data-g="' + g + '">' + g + '</button>'; }).join('') + '</div>';
  var rows = lbRows(cat), rk = 0, fr = socFriends();
  var board = rows.map(function (r) {
    if (r.gone) return '<div class="lb"><span class="lbr">–</span><div class="grow"><div class="xname faint">Left the app</div></div><button class="btn small ghost" data-act="socUnfriend" data-id="' + esc(r.id) + '">Remove</button></div>';
    if (r.s != null) rk++;
    var inner = '<span class="lbr">' + (r.s != null ? rk : '–') + '</span><div class="grow"><div class="xname">' + esc(r.p.u) + (r.me ? ' <span class="tag p">You</span>' : '') + '</div><div class="xmeta">' + (r.s != null ? tierOf(r.s) + ' · ' : '') + socAgo(r.p.last) + '</div></div>' + scoreChip(r.s);
    return r.me ? '<div class="lb me">' + inner + '</div>' : '<button class="lb" data-act="socCompare" data-id="' + esc(r.id) + '">' + inner + '</button>';
  }).join('');
  var lb = '<div class="section"><h2>Leaderboard</h2>' + chips + '<div class="seg" role="group" aria-label="Leaderboard updates" style="margin-bottom:6px"><button aria-pressed="' + (S.settings.boardMode !== 'nightly') + '" data-act="boardMode" data-k="live">Live</button><button aria-pressed="' + (S.settings.boardMode === 'nightly') + '" data-act="boardMode" data-k="nightly">Nightly at 10 pm</button></div><div class="note">' + (S.settings.boardMode === 'nightly' ? '🕙 Scores lock in every night at 10 pm (Eastern). Last update ' + boardWhen(boardCutoff(Date.now())) + ', next ' + boardWhen(boardCutoff(Date.now()) + DAY, 1) + '.' : '🟢 Live: scores update within seconds of anyone finishing a workout.') + '</div><div class="card" style="padding:4px 14px">' + board + '</div>' +
    (fr.length ? '' : '<div class="note">Add a friend below to see how you stack up. Scores compare people of similar size, so it is a fair race.</div>') + '</div>';
  var all = peopleAll();
  var add = '<div class="section"><h2>Add friends</h2><input class="input" id="fq" type="search" autocapitalize="none" autocomplete="off" placeholder="Search username" aria-label="Search username" value="' + esc(SOC.q) + '">' +
    '<div class="card" style="padding:4px 14px" id="people-list">' + peopleList(all) + '</div>' +
    (srvOn() ? '<div class="note">Send friends your invite link. When they make a username, they show up here.</div><button class="btn block" data-act="srvInvite">Copy invite link</button></div>' : '<div class="note">Send friends the link to this app. When they make a username, they show up here. They need to be signed in to Claude and given access to the app.</div></div>');
  var ch = chalSection();
  var mine = '<div class="card row" style="gap:12px"><div class="grow"><div class="xname">You are ' + esc(S.settings.handle) + '</div><div class="xmeta">Visible: username, scores, last workout date</div></div><button class="btn small ghost" data-act="socManage">Manage</button></div>';
  return '<div class="screen">' + head + lb + ch + add + mine + '</div>';
}
function peopleAll() {
  var fr = socFriends();
  return Object.keys(SOC.people).filter(function (id) { return id !== SOC.uid && fr.indexOf(id) < 0; }).map(function (id) { return { id: id, p: SOC.people[id] }; })
    .filter(function (x) { return x.p && x.p.u && (!SOC.q || x.p.un.indexOf(SOC.q.toLowerCase()) >= 0); }).sort(function (a, b) { return a.p.un < b.p.un ? -1 : 1; });
}
function peopleList(all) {
  if (!all.length) return '<div class="note" style="padding:12px 0">' + (SOC.q ? 'No one by that name yet.' : 'No one else is on Iron Ledger yet. Share the link!') + '</div>';
  return all.slice(0, 30).map(function (x) {
    return '<div class="lb"><div class="grow"><div class="xname">' + esc(x.p.u) + '</div><div class="xmeta">' + (x.p.ov != null ? 'Score ' + Math.round(x.p.ov) + ' · ' : '') + socAgo(x.p.last) + '</div></div><button class="btn small" data-act="socAdd" data-id="' + esc(x.id) + '">Add</button></div>';
  }).join('');
}
function chalCard(c) {
  var pl = chalPlayers(c), st = chalState(c), top = pl.slice(0, 3), mx = Math.max.apply(null, pl.map(function (p) { return Math.abs(p.v); }).concat([1]));
  var rows = top.map(function (p, i) {
    return '<div class="crow"><span class="lbr">' + (i + 1) + '</span><span class="grow">' + esc(socName(p.id)) + (p.id === SOC.uid ? ' <span class="faint">(you)</span>' : '') + '</span><span class="num" style="font-size:20px">' + chalFmt(c, p.v) + '</span></div><div class="cbar"><i style="width:' + Math.max(4, Math.round(Math.abs(p.v) / mx * 100)) + '%"></i></div>';
  }).join('');
  var win = st === 'done' && pl.length ? '<div class="note"><b>' + esc(socName(pl[0].id)) + (pl[0].id === SOC.uid ? ' (you)' : '') + ' won</b> with ' + chalFmt(c, pl[0].v) + '</div>' : '';
  var act = c.joined || c.mine ? '' : (st === 'done' ? '' : '<button class="btn small primary" data-act="socJoin" data-id="' + esc(c.id) + '" data-by="' + esc(c.by) + '">Join</button>');
  return '<div class="card chal"><div class="chal-h"><button class="grow" style="text-align:left" data-act="socChal" data-id="' + esc(c.id) + '" data-by="' + esc(c.by) + '"><div class="xname">' + esc(c.n || chalTitle(c)) + '</div><div class="xmeta">' + esc(chalTitle(c)) + ' · by ' + (c.mine ? 'you' : esc(socName(c.by))) + ' · ' + (st === 'live' ? chalLeft(c) : st === 'soon' ? 'starts ' + fmtDate(c.st) : 'ended ' + fmtDate(c.en)) + '</div></button>' + act + '</div>' +
    (pl.length ? rows : '<div class="note">No one has joined yet.</div>') + win + '</div>';
}
function chalSection() {
  var all = chalList(), act = all.filter(function (c) { return chalState(c) !== 'done'; }), done = all.filter(function (c) { return chalState(c) === 'done'; });
  var tabs = '<div class="seg" role="group" aria-label="Challenges"><button aria-pressed="' + (SOC.chTab === 'active') + '" data-act="socChTab" data-k="active">Active · ' + act.length + '</button><button aria-pressed="' + (SOC.chTab === 'done') + '" data-act="socChTab" data-k="done">Finished · ' + done.length + '</button></div>';
  var list = SOC.chTab === 'done' ? done : act;
  var body = list.length ? list.map(chalCard).join('') : '<div class="empty"><h3>' + (SOC.chTab === 'done' ? 'Nothing finished yet' : 'No challenges yet') + '</h3>' + (SOC.chTab === 'done' ? 'Finished challenges and winners show up here.' : 'Start one and invite a friend. Races are decided by size-adjusted strength, so they are fair.') + '</div>';
  return '<div class="section"><div class="row"><h2 class="grow">Challenges</h2><button class="btn small primary" data-act="socNewChal">+ Start one</button></div>' + tabs + body + '</div>';
}

function cmpSheet(id) {
  var cm = codeMode(), p = cm ? codeFriend(id) : SOC.people[id], me = cm ? socDoc() : socMe(); if (!p || !me) return;
  U.socSheet = function () { cmpSheet(id); };
  var wins = 0, losses = 0;
  var rows = ['Overall'].concat(GROUPS).map(function (g) {
    var a = g === 'Overall' ? me.ov : (me.g || {})[g], b = g === 'Overall' ? p.ov : (p.g || {})[g];
    if (g !== 'Overall' && a != null && b != null) { if (a > b) wins++; else if (b > a) losses++; }
    var ah = a == null ? 0 : a, bh = b == null ? 0 : b;
    return '<div class="cmp' + (g === 'Overall' ? ' ov' : '') + '"><div class="cmp-h"><b class="' + (a != null && b != null && a > b ? 'lead' : '') + '">' + (a == null ? '–' : Math.round(a)) + '</b><span>' + g + '</span><b class="' + (a != null && b != null && b > a ? 'lead them' : '') + '">' + (b == null ? '–' : Math.round(b)) + '</b></div><div class="cmp-b"><div class="l"><i style="width:' + ah + '%"></i></div><div class="r"><i style="width:' + bh + '%"></i></div></div></div>';
  }).join('');
  var verdict = wins === losses ? 'Dead even on muscle groups.' : wins > losses ? 'You lead on ' + wins + ' of ' + (wins + losses) + ' muscle groups.' : esc(p.u) + ' leads on ' + losses + ' of ' + (wins + losses) + '.';
  var common = Object.keys(p.ex || {}).filter(function (n) { return (me.ex || {})[n] != null; });
  var lifts = common.length ? '<div class="section"><h3 style="font-size:20px">Lifts you both do</h3>' + common.slice(0, 6).map(function (n) { var a = me.ex[n], b = p.ex[n]; return '<div class="lrow"><span>' + esc(n) + '</span><span class="num" style="font-size:18px"><span class="' + (a >= b ? 'lead-t' : '') + '">' + a + '</span> vs <span class="' + (b >= a ? 'lead-t' : '') + '">' + b + '</span></span></div>'; }).join('') + '</div>' : '';
  openSheet(p.u, '<div class="cmp-top"><div><div class="faint" style="font-size:13px">You</div><div class="num" style="font-size:40px">' + (me.ov == null ? '–' : Math.round(me.ov)) + '</div></div><div class="vs">vs</div><div style="text-align:right"><div class="faint" style="font-size:13px">' + esc(p.u) + '</div><div class="num" style="font-size:40px;color:var(--cmp-b)">' + (p.ov == null ? '–' : Math.round(p.ov)) + '</div></div></div>' +
    '<div class="note">' + verdict + ' Scores are 1–100 against lifters of the same height, weight and sex, so this is a fair comparison.</div>' +
    (cm ? '<div class="note">Snapshot from ' + fmtDate(p.at) + '. Ask ' + esc(p.u) + ' for a fresh code to update it.</div>' : '<button class="btn primary block" data-act="socNewChal" data-id="' + esc(id) + '">Challenge ' + esc(p.u) + '</button>') + rows + lifts +
    '<button class="btn block ghost danger" data-act="socUnfriend" data-id="' + esc(id) + '">Remove friend</button>');
}
function socNewSheet(pre) {
  var st = U.nc || (U.nc = { ty: 'workouts', days: 7, g: '', ex: '', inv: pre ? [pre] : socFriends().slice(), name: '' });
  if (pre) st.inv = [pre];
  U.socSheet = null;
  var fr = socFriends();
  var types = Object.keys(CHAL).map(function (k) { return '<button class="chip" aria-pressed="' + (st.ty === k) + '" data-act="ncType" data-k="' + k + '">' + CHAL[k].n + '</button>'; }).join('');
  var extra = '';
  if (st.ty === 'sets' || st.ty === 'climb') extra = '<div><span class="field-label">Muscle</span><div class="chips"><button class="chip" aria-pressed="' + (!st.g) + '" data-act="ncGroup" data-g="">' + (st.ty === 'climb' ? 'Overall' : 'Any') + '</button>' + GROUPS.map(function (g) { return '<button class="chip" aria-pressed="' + (st.g === g) + '" data-act="ncGroup" data-g="' + g + '">' + g + '</button>'; }).join('') + '</div></div>';
  if (st.ty === 'lift') {
    var B = profB(), H = allHistories(realWorkouts()), opts = Object.keys(H).filter(function (n) { return B && exerciseRank(n, H[n], B, Date.now()); }).sort();
    if (!st.ex || opts.indexOf(st.ex) < 0) st.ex = opts[0] || '';
    extra = opts.length ? '<div><span class="field-label">Lift</span><select class="input" id="nc-ex">' + opts.map(function (n) { return '<option value="' + esc(n) + '"' + (st.ex === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>' : '<div class="banner"><span>Log a ranked lift (like bench press or squat) first, then you can duel on it.</span></div>';
  }
  var days = '<div class="seg" role="group" aria-label="Length">' + CHAL_DAYS.map(function (d) { return '<button aria-pressed="' + (st.days === d) + '" data-act="ncDays" data-k="' + d + '">' + d + ' days</button>'; }).join('') + '</div>';
  var who = fr.length ? '<div class="chips">' + fr.map(function (id) { return '<button class="chip" aria-pressed="' + (st.inv.indexOf(id) >= 0) + '" data-act="ncWho" data-id="' + esc(id) + '">' + esc(socName(id)) + '</button>'; }).join('') + '</div>' : '<div class="note">Add a friend first. Anyone who is already your friend can join.</div>';
  openSheet('Start a challenge', '<div><span class="field-label">Type</span><div class="chips">' + types + '</div><div class="note" style="margin-top:6px">' + CHAL[st.ty].d + '</div></div>' + extra +
    '<div><span class="field-label">Length</span>' + days + '</div><div><span class="field-label">Invite</span>' + who + '</div>' +
    '<div><span class="field-label">Name (optional)</span><input class="input" id="nc-name" maxlength="40" placeholder="e.g. Summer showdown" value="' + esc(st.name) + '"></div>' +
    '<button class="btn primary block" data-act="ncGo"' + (st.ty === 'lift' && !st.ex ? ' disabled' : '') + '>Start now</button><div class="note">Starts today, so only workouts from now on count. Friends see it on their Friends tab and can join.</div>');
}
function chalSheet(id, by) {
  var c = chalList().filter(function (x) { return x.id === id; })[0]; if (!c) return;
  U.socSheet = function () { chalSheet(id, by); };
  var pl = chalPlayers(c), mx = Math.max.apply(null, pl.map(function (p) { return Math.abs(p.v); }).concat([1])), st = chalState(c);
  var rows = pl.map(function (p, i) {
    return '<div class="crow"><span class="lbr">' + (i + 1) + '</span><span class="grow">' + esc(socName(p.id)) + (p.id === SOC.uid ? ' <span class="faint">(you)</span>' : '') + '</span><span class="num" style="font-size:22px">' + chalFmt(c, p.v) + '</span></div><div class="cbar"><i style="width:' + Math.max(4, Math.round(Math.abs(p.v) / mx * 100)) + '%"></i></div>';
  }).join('');
  var inv = (c.inv || []).filter(function (u) { return !pl.some(function (p) { return p.id === u; }); }).map(function (u) { return esc(socName(u)); });
  openSheet(c.n || chalTitle(c), '<div class="note">' + esc(chalTitle(c)) + ' · ' + fmtDate(c.st) + ' to ' + fmtDate(c.en) + ' · ' + (st === 'live' ? chalLeft(c) : st === 'soon' ? 'not started' : 'finished') + '</div>' +
    (!c.joined && !c.mine && st !== 'done' ? '<button class="btn primary block" data-act="socJoin" data-id="' + esc(c.id) + '" data-by="' + esc(c.by) + '">Join this challenge</button>' : '') +
    '<div class="card section" style="gap:6px">' + (rows || '<div class="note">No one has joined yet.</div>') + '</div>' +
    (st === 'done' && pl.length ? '<div class="banner"><span><b>' + esc(socName(pl[0].id)) + (pl[0].id === SOC.uid ? ' (you)' : '') + '</b> won with ' + chalFmt(c, pl[0].v) + '.</span></div>' : '') +
    (inv.length ? '<div class="note">Invited, not joined yet: ' + inv.join(', ') + '</div>' : '') +
    '<div class="note">Scores update when each person finishes a workout. ' + (c.ty === 'climb' || c.ty === 'lift' ? 'These use size-adjusted strength, so size does not decide it.' : '') + '</div>');
}
function manageSheet() {
  U.socSheet = null;
  openSheet('Your profile', '<div class="card section"><div class="xname">' + esc(S.settings.handle) + '</div><div class="note">Friends can see: your username, overall score, muscle-group scores, your top lift scores, and when you last worked out. They cannot see your height, weight, or workout log.</div></div>' +
    (srvOn() ? '<div class="note">Signed in as <b>' + esc(SRV.name) + '</b>. Passwords are stored scrambled on your friends server.</div><div class="row"><button class="btn grow" data-act="srvInvite">Copy invite link</button><button class="btn grow" data-act="srvOut">Sign out</button></div>' + (U.confirm === 'pw' ? '<div class="card section"><input class="input" id="pw-old" type="password" autocomplete="current-password" placeholder="Current password"><input class="input" id="pw-new" type="password" autocomplete="new-password" placeholder="New password (6+)"><div class="note" id="pw-err" style="color:var(--down);min-height:0"></div><button class="btn primary block" data-act="srvPwGo">Save new password</button></div>' : '<button class="btn block ghost" data-act="srvPw">Change password</button>') + (U.confirm === 'delacct' ? '<div class="card section"><div class="note">This deletes your account, profile and challenge scores from the server. Your workouts on this phone are not touched.</div><input class="input" id="pw-del" type="password" autocomplete="current-password" placeholder="Password"><div class="note" id="pw-err" style="color:var(--down);min-height:0"></div><button class="btn danger block" data-act="srvDelGo">Delete my account</button></div>' : '<button class="btn block ghost danger" data-act="srvDel">Delete my account</button>') : '<div class="note">Your Claude account is your login. There is no separate password to remember or leak.</div>') +
    (U.confirm === 'leave' ? '<div class="banner"><span>Delete your profile and leave all challenges?</span><span class="row"><button class="btn small danger" data-act="socLeave2">Delete</button><button class="btn small" data-act="socManage">Keep</button></span></div>' : '<button class="btn block ghost danger" data-act="socLeave">Delete my profile</button>'));
}

/* ===== no shared database (hosted on your own): friend codes =====
   A code is a small snapshot of your scores. Paste a friend's code to add them; paste a newer one to refresh. */
function codeMode() { return !SOC.db; }
function myCid() { if (!S.settings.cid) { S.settings.cid = Math.random().toString(36).slice(2, 10); persist({ settings: true }); } return S.settings.cid; }
function codeEncode(o) { return 'IL1-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function codeDecode(txt) {
  var m = String(txt || '').match(/IL1-[A-Za-z0-9_-]+/); if (!m) return null;
  try {
    var b = m[0].slice(4).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    var o = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!o || typeof o.i !== 'string' || typeof o.u !== 'string' || !Array.isArray(o.g)) return null;
    var g = {}; GROUPS.forEach(function (n, k) { var v = +o.g[k]; if (o.g[k] != null && v >= 1 && v <= 100) g[n] = Math.round(v); });
    var ov = o.ov == null ? null : Math.max(1, Math.min(100, Math.round(+o.ov)));
    return { i: o.i.slice(0, 16), u: o.u.slice(0, 16), ov: ov, g: g, at: +o.at || Date.now() };
  } catch (e) { return null; }
}
function myCode() {
  var d = socDoc();
  return codeEncode({ i: myCid(), u: S.settings.handle || 'Me', ov: d.ov, g: GROUPS.map(function (g) { return d.g[g] == null ? null : d.g[g]; }), at: Date.now() });
}
function codeFriends() { return S.settings.cfriends || []; }
function codeFriend(id) { var f = codeFriends().filter(function (x) { return x.i === id; })[0]; return f ? { u: f.u, un: f.u.toLowerCase(), ov: f.ov, g: f.g, ex: {}, at: f.at, last: 0 } : null; }
function codeShare() {
  var txt = 'My Iron Ledger strength score is ' + (socDoc().ov == null ? 'not ranked yet' : Math.round(socDoc().ov)) + '. Add me with this code: ' + myCode();
  if (navigator.share) { navigator.share({ text: txt }).catch(function () { }); } else copyText(txt);
}
function viewFriendsCode() {
  var head = '<div class="screen-head"><div><div class="sub">Compare strength with friends</div><h1>Friends</h1></div></div>';
  var B = profB(), d = B ? socDoc() : null, me = S.settings.handle || '';
  var rows = [], cat = SOC.cat;
  var pick = function (o) { return cat === 'Overall' ? o.ov : (o.g || {})[cat]; };
  if (d) rows.push({ me: true, u: me || 'You', s: pick(d) });
  codeFriends().forEach(function (f) { rows.push({ id: f.i, u: f.u, s: pick(f) == null ? null : pick(f), at: f.at }); });
  rows.sort(function (a, b) { return (b.s == null ? -1 : b.s) - (a.s == null ? -1 : a.s); });
  var rk = 0;
  var board = rows.map(function (r) {
    if (r.s != null) rk++;
    var inner = '<span class="lbr">' + (r.s != null ? rk : '–') + '</span><div class="grow"><div class="xname">' + esc(r.u) + (r.me ? ' <span class="tag p">You</span>' : '') + '</div><div class="xmeta">' + (r.s != null ? tierOf(r.s) + ' · ' : '') + (r.me ? 'live' : 'as of ' + fmtDate(r.at)) + '</div></div>' + scoreChip(r.s);
    return r.me ? '<div class="lb me">' + inner + '</div>' : '<button class="lb" data-act="socCompare" data-id="' + esc(r.id) + '">' + inner + '</button>';
  }).join('');
  var chips = '<div class="chips">' + ['Overall'].concat(GROUPS).map(function (g) { return '<button class="chip" aria-pressed="' + (g === cat) + '" data-act="socCat" data-g="' + g + '">' + g + '</button>'; }).join('') + '</div>';
  var mine = !B ? '<div class="card section"><h2>Your code</h2><div class="banner"><span>Add your height, weight and sex first so your score can be worked out.</span><button class="btn small" data-act="bodyEdit">Add</button></div></div>' :
    '<div class="card section"><h2>Your code</h2><input class="input" id="cname" maxlength="16" autocomplete="off" placeholder="Your name (shown to friends)" aria-label="Your name" value="' + esc(me) + '">' +
    '<textarea class="input" id="mycode" rows="3" readonly style="padding:10px 14px;min-height:84px;font-size:13px;word-break:break-all">' + esc(me ? myCode() : 'Enter your name to get a code.') + '</textarea>' +
    '<div class="row"><button class="btn primary grow" data-act="codeShare"' + (me ? '' : ' disabled') + '>Send my code</button><button class="btn grow" data-act="codeCopy"' + (me ? '' : ' disabled') + '>Copy</button></div>' +
    '<div class="note">The code is a snapshot of your scores today (never your height, weight or workouts). Send it to a friend. When your scores change, send a fresh one.</div></div>';
  var add = '<div class="card section"><h2>Add a friend</h2><textarea class="input" id="codein" rows="2" style="padding:10px 14px;min-height:64px;font-size:13px" placeholder="Paste a friend\'s code or their whole message"></textarea><button class="btn block" data-act="codeAdd">Add friend</button><div class="note">Pasting a newer code from the same friend updates their scores.</div></div>';
  var lb = d ? '<div class="section"><h2>Leaderboard</h2>' + chips + '<div class="card" style="padding:4px 14px">' + board + '</div>' + (codeFriends().length ? '' : '<div class="note">Add a friend to see how you stack up. Scores compare people of similar height, weight and sex, so it is a fair race.</div>') + '</div>' : '';
  return '<div class="screen">' + head + mine + lb + add + (SRV.url ? '<button class="btn block ghost" data-act="srvBack">Back to sign in</button>' : srvConnectCard() + '<div class="note">Friend codes work anywhere with no server. Live challenges need a friends server.</div>') + '</div>';
}

/* ===== nightly leaderboard cut-off: 10 pm in Toronto (handles daylight saving) ===== */
var BOARD_TZ = 'America/Toronto', BOARD_HOUR = 22;
function tzOffsetMin(t) {
  try {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: BOARD_TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }), o = {};
    f.formatToParts(new Date(t)).forEach(function (x) { o[x.type] = +x.value; });
    return (Date.UTC(o.year, o.month - 1, o.day, o.hour % 24, o.minute, o.second) - Math.floor(t / 1000) * 1000) / 60000;
  } catch (e) { return -new Date(t).getTimezoneOffset(); }
}
function boardCutoff(t) {
  var off = tzOffsetMin(t), loc = new Date(t + off * 60000);             // wall-clock time in Toronto, read with UTC getters
  var c = Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), loc.getUTCDate(), BOARD_HOUR, 0, 0) - off * 60000;
  if (c > t) c -= DAY;
  return c - (tzOffsetMin(c) - off) * 60000;                              // correct if DST changed in between
}
function boardWhen(c, future) {
  var d = new Date(c), now = new Date(), same = d.toDateString() === now.toDateString(), y = new Date(Date.now() - DAY).toDateString() === d.toDateString(), tm = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
  var hh = d.getHours() % 12 || 12, ap = d.getHours() < 12 ? 'am' : 'pm', t2 = hh + (d.getMinutes() ? ':' + ('0' + d.getMinutes()).slice(-2) : '') + ' ' + ap;
  if (future) return (same ? 'tonight' : 'tomorrow') + ' at ' + t2;
  return (same ? 'today' : y ? 'yesterday' : DOW[d.getDay()]) + ' at ' + t2;
}
/* a friend's score on the nightly board: their live score is right if they last published before the cut-off,
   otherwise use the score they computed for that same cut-off */
function boardVal(p, cat) {
  var C = boardCutoff(Date.now()), pick = function (o) { return o ? (cat === 'Overall' ? o.ov : (o.g || {})[cat]) : null; };
  if (S.settings.boardMode !== 'nightly') return pick(p);
  if (!p.at || p.at <= C) return pick(p);
  if (p.b && p.b.c >= C) return pick(p.b);
  return pick(p);
}
