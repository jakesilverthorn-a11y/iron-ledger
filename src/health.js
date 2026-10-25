/* ===== Apple Health, through an iPhone Shortcut =====
   Web apps can't read Health directly, so a Shortcut you set up once sends your latest numbers to your account
   (POST /health?k=<your private link key>). The server stores them in the private "health" doc; here we use them:
   weigh-ins go into your body log (ranks use your weight on the day), activity sets calorie targets, and
   sleep / resting heart rate / HRV adjust how fast the recovery map says you bounce back. */
var HK = { key: '', err: '', checking: false };
function healthOn() { return typeof acctMode === 'function' && acctMode() && srvOn(); }
function hEntries() { return (S.health && Array.isArray(S.health.e)) ? S.health.e : []; }
function hLast() { var e = hEntries(); return e.length ? e[e.length - 1] : null; }
function hWeightLb(e) { if (e.wlb != null) return +e.wlb; if (e.w != null) return S.settings.unit === 'kg' ? e.w * LB : +e.w; return null; }
/* newest value of one field, if it isn't older than maxH hours */
function hLatest(k, maxH) {
  var e = hEntries();
  for (var i = e.length - 1; i >= 0; i--) if (e[i][k] != null) { if (maxH && Date.now() - e[i].at > maxH * 3600e3) return null; return { v: +e[i][k], at: e[i].at }; }
  return null;
}
/* one value per day (the last reading that day), oldest first */
function hDaily(k, days) {
  var by = {}, cut = Date.now() - days * DAY;
  hEntries().forEach(function (e) { if (e[k] != null && e.at >= cut) by[dayKey(e.at)] = +e[k]; });
  return Object.keys(by).sort().map(function (d) { return { d: d, v: by[d] }; });
}
function hMedian(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function hAvg(k, days, minN) { var a = hDaily(k, days); if (a.length < (minN || 3)) return null; var s = 0; a.forEach(function (x) { s += x.v; }); return { v: s / a.length, n: a.length }; }
/* your usual: median of the past ~6 weeks, not counting today */
function hBase(k) { var today = dayKey(Date.now()), a = hDaily(k, 45).filter(function (x) { return x.d !== today; }).map(function (x) { return x.v; }); return a.length >= 5 ? hMedian(a) : null; }

/* weigh-ins from Health go into the body log (one per day). A weigh-in you typed that day wins; one you deleted stays deleted. */
function hApplyWeights() {
  var b = S.settings.body; if (!b) return false;
  if (!Array.isArray(b.log)) b.log = [];
  var gone = b.hdel || [], ch = false;
  hEntries().forEach(function (e) {
    var w = hWeightLb(e); if (!w) return;
    var dk = dayKey(e.at); if (gone.indexOf(dk) >= 0) return;
    var same = b.log.filter(function (x) { return dayKey(x.t) === dk; });
    if (same.some(function (x) { return !x.h; })) return;
    w = Math.round(w * 10) / 10;
    if (same[0]) { if (Math.abs(same[0].w - w) > 0.05 || same[0].t !== e.at) { same[0].w = w; same[0].t = e.at; ch = true; } }
    else { b.log.push({ t: e.at, w: w, h: 1 }); ch = true; }
  });
  if (ch) { b.log.sort(function (x, y) { return x.t - y.t; }); b.w = b.log[b.log.length - 1].w; }
  return ch;
}

/* calories you burn moving, averaged over the last 10 days (Health's active energy) */
function hActivity() { var a = hAvg('kcal', 10, 3); return a ? { kcal: Math.round(a.v), n: a.n } : null; }
function hBodyFat() { var b = hLatest('bf', 24 * 45); return b ? b.v : null; }

/* how recovered you are today, from last night's sleep, resting heart rate and HRV against your usual */
var HR_MEMO = { t: 0, v: null };
function hReadiness() {
  if (Date.now() - HR_MEMO.t < 5000) return HR_MEMO.v;
  var r = null, last = hLast();
  if (last && Date.now() - last.at < 30 * 3600e3) {
    var m = 1, why = [], good = [];
    var sl = hLatest('sleep', 30), rh = hLatest('rhr', 30), hv = hLatest('hrv', 30), rb = hBase('rhr'), hb = hBase('hrv');
    if (sl && sl.v > 0.5) { if (sl.v < 6) { m += 0.15; why.push(hrs(sl.v) + ' of sleep'); } else if (sl.v < 7) { m += 0.07; why.push(hrs(sl.v) + ' of sleep'); } else if (sl.v >= 7.5) good.push(hrs(sl.v) + ' of sleep'); }
    if (rh && rb) { if (rh.v >= rb + 5) { m += 0.1; why.push('resting heart rate ' + Math.round(rh.v - rb) + ' above your usual'); } else if (rh.v <= rb) good.push('resting heart rate at or below your usual'); }
    if (hv && hb) { if (hv.v <= hb * 0.8) { m += 0.1; why.push('HRV ' + Math.round((1 - hv.v / hb) * 100) + '% below your usual'); } else if (hv.v >= hb) good.push('HRV at or above your usual'); }
    if (why.length) r = { m: Math.min(1.35, m), why: why, good: [] };
    else if (good.length >= 2) r = { m: 0.95, why: [], good: good };
    else if (sl || rh || hv) r = { m: 1, why: [], good: good };
  }
  HR_MEMO = { t: Date.now(), v: r };
  return r;
}
function hrs(h) { var H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H++; M = 0; } return H + ' h' + (M ? ' ' + M + ' min' : ''); }
recMult = function () { var r = hReadiness(); return r ? r.m : 1; };
function readinessNote() {
  var r = hReadiness(); if (!r) return '';
  if (r.why.length) return '<div class="banner"><span><b>Recovering a bit slower today</b> · ' + esc(r.why.join(', ')) + '. Times below allow for it.</span></div>';
  if (r.good.length >= 2) return '<div class="banner"><span><b>Well rested</b> · ' + esc(r.good.join(', ')) + '.</span></div>';
  return '';
}

/* ----- screens ----- */
function hAgo(t) { var m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 36 * 60 ? Math.round(m / 60) + ' h ago' : fmtDate(t); }
function healthSettingsCard() {
  if (window.claude) return '';
  var last = hLast();
  var status = !healthOn() ? 'Sign in to connect Apple Health.' : last ? 'Last update ' + hAgo(last.at) + '.' : 'Not connected yet. A Shortcut on your iPhone sends your weight, activity, sleep and heart numbers here once a day.';
  return '<div class="section"><h2>Apple Health</h2><div class="card section" style="gap:10px"><div class="note">' + esc(status) + '</div>' +
    (healthOn() ? '<button class="btn block' + (last ? '' : ' primary') + '" data-act="hkSetup">' + (last ? 'Apple Health settings' : 'Connect Apple Health') + '</button>' : '') + '</div></div>';
}
function hTile(label, val, sub) { return '<div class="htile"><div class="mtag">' + label + '</div><div class="num" style="font-size:24px">' + val + '</div>' + (sub ? '<div class="xmeta">' + sub + '</div>' : '') + '</div>'; }
function healthBodyCard() {
  if (window.claude || !healthOn()) return '';
  var e = hEntries();
  if (!e.length) return '<div class="card section" style="gap:10px"><h2>Apple Health</h2><div class="note">Send your weight, activity, sleep and heart numbers from the Health app. Ranks then use your real weight on each day, calorie targets follow how active you are, and the recovery map allows for short sleep.</div><button class="btn block" data-act="hkSetup">Connect Apple Health</button></div>';
  var u = unit(), tiles = [], B = S.settings.body || {};
  var w = curWeightLb(B), w30 = B.log && B.log.length ? bwAt(B, Date.now() - 30 * DAY) : null;
  if (w) tiles.push(hTile('Weight', toDisp(w, u) + ' <span class="faint" style="font-size:14px">' + uLabel() + '</span>', w30 && Math.abs(w - w30) >= 0.5 ? (w > w30 ? '+' : '−') + toDisp(Math.abs(w - w30), u) + ' in 30 days' : 'steady over 30 days'));
  var bf = hLatest('bf', 24 * 45); if (bf) tiles.push(hTile('Body fat', Math.round(bf.v * 10) / 10 + '%', fmtDate(bf.at)));
  var sl = hLatest('sleep', 40), sa = hAvg('sleep', 7, 3); if (sl || sa) tiles.push(hTile('Sleep', sl ? hrs(sl.v) : '–', sa ? '7-day avg ' + hrs(sa.v) : 'last night'));
  var rh = hLatest('rhr', 72), rb = hBase('rhr'); if (rh) tiles.push(hTile('Resting HR', Math.round(rh.v) + ' <span class="faint" style="font-size:14px">bpm</span>', rb ? 'usual ' + Math.round(rb) : ''));
  var hv = hLatest('hrv', 72), hb = hBase('hrv'); if (hv) tiles.push(hTile('HRV', Math.round(hv.v) + ' <span class="faint" style="font-size:14px">ms</span>', hb ? 'usual ' + Math.round(hb) : ''));
  var ka = hAvg('kcal', 7, 2); if (ka) tiles.push(hTile('Active energy', Math.round(ka.v).toLocaleString('en-US'), 'kcal a day, 7-day avg'));
  var st = hAvg('steps', 7, 2); if (st) tiles.push(hTile('Steps', Math.round(st.v).toLocaleString('en-US'), 'a day, 7-day avg'));
  var pts = (B.log || []).filter(function (x) { return x.t >= Date.now() - 182 * DAY; }).map(function (x) { return { t: x.t, v: u === 'kg' ? x.w / LB : x.w }; });
  return '<div class="section"><div class="row"><h2 class="grow">Health</h2><button class="btn small ghost" data-act="hkSetup">Settings</button></div>' + readinessNote() +
    '<div class="hgrid">' + tiles.join('') + '</div>' +
    (pts.length > 1 ? '<div class="card section" style="gap:6px"><div class="xname">Weight, last 6 months</div>' + lineChart(pts, { label: 'Weight trend', fmt: function (v) { return Math.round(v); } }) + '</div>' : '') +
    '<div class="note">From Apple Health · updated ' + hAgo(e[e.length - 1].at) + '.</div></div>';
}
function hLink() { return HK.key ? SRV.url + '/health?k=' + encodeURIComponent(HK.key) : ''; }
function healthSheet() {
  if (!healthOn()) { toast('Sign in first.'); return; }
  if (!HK.key && !HK.err) {
    openSheet('Apple Health', '<div class="note">Getting your private link…</div>');
    srvRaw('GET', '/health/key').then(function (r) { HK.key = r.key || ''; if (sheetOpen()) healthSheet(); }, function (e) { HK.err = e.message || 'Could not reach the server.'; if (sheetOpen()) healthSheet(); });
    return;
  }
  var last = hLast(), raw = last && last.raw ? Object.keys(last.raw).map(function (k) { return '<b>' + esc({ w: 'Weight', bf: 'Body fat', rhr: 'Resting HR', hrv: 'HRV', steps: 'Steps', kcal: 'Active energy', sleep: 'Sleep' }[k] || k) + '</b> "' + esc(last.raw[k]) + '"'; }).join(' · ') : '';
  var V = function (n) { return '<b class="hkv">' + n + '</b>'; };
  openSheet('Apple Health', (HK.err ? '<div class="banner"><span>' + esc(HK.err) + '</span></div>' : '') +
    '<div class="card section" style="gap:8px"><div class="xname">' + (last ? 'Connected' : 'Not connected yet') + '</div><div class="note">' + (last ? 'Last update ' + esc(hAgo(last.at)) + ' (' + esc(fmtDateLong(last.at)) + '). Received: ' + raw : 'Follow the steps below once. After that your iPhone sends your numbers every day by itself.') + '</div>' +
    '<button class="btn block" data-act="hkCheck"' + (HK.checking ? ' disabled' : '') + '>' + (HK.checking ? 'Checking…' : 'Check for new data') + '</button></div>' +
    '<div class="card section" style="gap:8px"><div class="xname">Your private link</div><div class="note">The Shortcut sends your numbers to this address. Keep it to yourself: anyone with it can add readings to your account (they can\'t see anything).</div>' +
    '<input class="input" readonly value="' + esc(hLink()) + '" aria-label="Your Apple Health link" style="font-size:13px" onfocus="this.select()"><button class="btn primary block" data-act="hkCopy"' + (HK.key ? '' : ' disabled') + '>Copy link</button></div>' +
    '<div class="section" style="gap:8px"><h3 style="font-size:20px">Set up the Shortcut (once, about 5 minutes)</h3><ol class="steps">' +
    '<li>Open the <b>Shortcuts</b> app, tap <b>+</b>, and name the shortcut <b>Iron Ledger Health</b>.</li>' +
    '<li>Add the action <b>Find Health Samples</b>. Set Type to <b>Weight</b>, Sort by <b>Start Date</b>, Order <b>Latest First</b>, and turn on <b>Limit</b> at <b>1</b>. Then add <b>Set Variable</b> and name it ' + V('w') + '.</li>' +
    '<li>Do the same for each of these, naming the variable as shown. Skip any you don\'t track: <b>Body Fat Percentage</b> → ' + V('bf') + ', <b>Resting Heart Rate</b> → ' + V('rhr') + ', <b>Heart Rate Variability</b> → ' + V('hrv') + '.</li>' +
    '<li>Activity for the last day: add <b>Find Health Samples</b> with Type <b>Active Energy</b> and the filter <b>Start Date is in the last 1 days</b> (no limit). Add <b>Calculate Statistics</b> set to <b>Sum</b>, then <b>Set Variable</b> ' + V('kcal') + '. Repeat with <b>Steps</b> → ' + V('steps') + '.</li>' +
    '<li>Sleep (needs an Apple Watch or another sleep tracker): <b>Find Health Samples</b> with Type <b>Sleep Analysis</b> and <b>Start Date is in the last 1 days</b>. If it offers a Value filter, leave out <b>In Bed</b> and <b>Awake</b>. Add <b>Get Details of Health Samples</b> → <b>Duration</b>, then <b>Calculate Statistics</b> → <b>Sum</b>, then <b>Set Variable</b> ' + V('sleep') + '.</li>' +
    '<li>Add <b>Get Contents of URL</b> and paste your link from above. Tap the arrow to show more: Method <b>POST</b>, Request Body <b>JSON</b>. Add a <b>Text</b> field for each variable you made: the key is its name (' + V('w') + ', ' + V('bf') + ', ' + V('rhr') + '…) and the value is that variable.</li>' +
    '<li>Optional: add <b>Show Notification</b> with <b>Contents of URL</b>, so you see what was sent.</li>' +
    '<li>Tap ▶ to run it. Allow Health access when asked, then come back here and tap <b>Check for new data</b>.</li>' +
    '<li>Make it automatic: in Shortcuts open <b>Automation</b> → <b>+</b> → <b>Time of Day</b>, pick a time you usually have your phone unlocked (for example 8:30 AM), <b>Daily</b>, <b>Run Immediately</b>, and choose <b>Iron Ledger Health</b>. iPhone keeps Health data locked while the phone is locked, so a 3 AM run would find nothing.</li>' +
    '</ol></div>' +
    '<div class="note">What it\'s used for: your weigh-ins go into your body log (a weigh-in you type yourself that day wins), so ranks use your weight on each day. Active energy sets your daily calories on the Eat tab, and body fat makes the calorie estimate more exact. Sleep, resting heart rate and HRV adjust the recovery map. It all stays private in your account.</div>' +
    '<div class="note">Sharing your Shortcut with a friend? The link inside it is yours. They must replace it with their own link from their Iron Ledger.</div>' +
    '<button class="btn block ghost" data-act="hkNew"' + (HK.key ? '' : ' disabled') + '>Make a new link (the old one stops working)</button>');
}
function healthClick(a) {
  if (a === 'hkSetup') { HK.err = ''; healthSheet(); return true; }
  if (a === 'hkCopy') { copyText(hLink(), 'Link copied. Paste it into Get Contents of URL.'); return true; }
  if (a === 'hkCheck') { HK.checking = true; healthSheet(); ACCT.last = 0; acctSync().then(function () { HK.checking = false; if (sheetOpen()) healthSheet(); var l = hLast(); toast(l ? 'Last update ' + hAgo(l.at) : 'Nothing received yet'); }); return true; }
  if (a === 'hkNew') {
    if (!confirm('Make a new link? The Shortcut stops working until you paste the new link into it.')) return true;
    srvRaw('POST', '/health/key').then(function (r) { HK.key = r.key || ''; healthSheet(); toast('New link made. Paste it into your Shortcut.'); }, function (e) { toast(e.message); });
    return true;
  }
  return false;
}
