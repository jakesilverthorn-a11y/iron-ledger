/* ===== inside the Iron Ledger iPhone app =====
   The Xcode app shows this same page in a web view and adds what a web page can't do on iPhone:
   Apple Health read directly, a notification when rest is over, haptics, keeping the screen on, and the share sheet.
   window.webkit.messageHandlers.il is the native side; it answers through window.ILNativeReply. */
var NATIVE = { on: !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.il), cb: {}, n: 0, restEnd: 0, awake: false };
function nativeCall(cmd, args, ms) {
  if (!NATIVE.on) return Promise.reject(new Error('Only in the iPhone app.'));
  return new Promise(function (ok, bad) {
    var id = 'c' + (++NATIVE.n);
    NATIVE.cb[id] = { ok: ok, bad: bad };
    setTimeout(function () { if (NATIVE.cb[id]) { delete NATIVE.cb[id]; bad(new Error('The app did not answer.')); } }, ms || 60000);
    try { window.webkit.messageHandlers.il.postMessage({ id: id, cmd: cmd, args: args || {} }); } catch (e) { delete NATIVE.cb[id]; bad(e); }
  });
}
window.ILNativeReply = function (o) {
  var c = o && NATIVE.cb[o.id]; if (!c) return; delete NATIVE.cb[o.id];
  if (o.err) { var e = new Error(o.err); if (o.cancel) e.name = 'AbortError'; c.bad(e); } else c.ok(o.data);
};
window.ILNativeEvent = function (name, arg) {
  if (name === 'foreground') { nativeHealthSync(false); if (typeof tick === 'function') tick(); }
  if (name === 'quick') nativeQuick(arg);
};
/* pressing and holding the app icon: Today's workout, Empty workout, Log weight */
function nativeQuick(k) {
  if (typeof needGate === 'function' && needGate()) { toast('Sign in first.'); return; }
  closeSheet();
  if (k === 'weight') { U.tab = 'settings'; render(); bodySheet(); return; }
  U.tab = 'train';
  if (S.draft) { render(); window.scrollTo(0, 0); toast('Your workout is still going'); return; }
  if (k === 'empty') { newDraft([]); render(); window.scrollTo(0, 0); openPicker('draft'); return; }
  // today's planned workout if there is one, otherwise a fresh workout from your builder settings
  var p = typeof wkPlan === 'function' && wkPlan(), ti = Math.floor((Date.now() - weekStart(Date.now())) / DAY);
  if (p && p.ws === weekStart(Date.now()) && p.days[ti]) { newDraft(p.days[ti].items); render(); window.scrollTo(0, 0); toast('Started today\'s ' + p.days[ti].f + ' workout'); return; }
  var st = S.settings, r = generateWorkout({ minutes: st.minutes, groups: st.groups, gear: gearList(), level: st.level, goal: st.goal }, realWorkouts(), (Date.now() % 100003) + 1);
  U.plan = r.items.length ? r : null; render(); var pl = $('.plan-item'); if (pl) pl.scrollIntoView({ block: 'center' });
}
/* finished workouts go to Apple Health (Fitness app, Activity rings), if you allow it */
function nativeSaveWorkout(w) {
  if (!nativeHealthOn() || nhGet('wk') === '0' || !w || !w.dur) return;
  var B = S.settings.body, kg = (curWeightLb(B) || 165) / LB, hrs = w.dur / 3600;
  var kcal = Math.round(5 * kg * hrs);   // strength training ≈ 5 METs
  nativeCall('saveWorkout', { start: w.t, end: w.t + w.dur * 1000, kcal: kcal }, 120000).then(function () { toast('Saved to Apple Health'); }, function (e) { NH.err = e.message; });
}

/* share sheet for files and links (the web view's own share support is patchy) */
if (NATIVE.on) {
  var blobB64 = function (b) { return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = function () { bad(r.error); }; r.readAsDataURL(b); }); };
  navigator.canShare = function (d) { return !!d && (!!(d.files && d.files.length) || !!d.text || !!d.url); };
  navigator.share = function (d) {
    d = d || {};
    if (d.files && d.files.length) { var f = d.files[0]; return blobB64(f).then(function (b) { return nativeCall('share', { name: f.name || 'file', mime: f.type || '', b64: b }, 600000); }); }
    return nativeCall('share', { text: [d.text, d.url].filter(Boolean).join(' ') }, 600000);
  };
}

/* rest-over notification and screen-on, kept in step with the workout every second (called from tick) */
function nativeTick() {
  if (!NATIVE.on) { webRestTick(); return; }
  var r = U.rest, end = r && !r.done ? Math.round(r.end) : 0;
  if (end !== NATIVE.restEnd) {
    NATIVE.restEnd = end;
    if (end) nativeCall('restStart', { sec: Math.max(1, (end - Date.now()) / 1000), body: 'Time for your next set.' }).catch(function () { });
    else nativeCall('restCancel').catch(function () { });
  }
  var aw = !!S.draft;
  if (aw !== NATIVE.awake) { NATIVE.awake = aw; nativeCall('awake', { on: aw }).catch(function () { }); if (aw) nativeCall('notifyAsk').catch(function () { }); }
}
function haptic(k) {
  if (NATIVE.on) { nativeCall('haptic', { k: k || 'tap' }).catch(function () { }); return; }
  try { if (navigator.vibrate) navigator.vibrate(k === 'done' ? [220, 120, 220] : 60); } catch (e) { }
}

/* ----- Apple Health, read directly by the app ----- */
var NH = { busy: false, err: '' };
function nhKey(s) { return 'il-nh' + s + ':' + (SRV.uid || ''); }
function nhGet(s) { try { return localStorage.getItem(nhKey(s)) || ''; } catch (e) { return ''; } }
function nhSet(s, v) { try { localStorage.setItem(nhKey(s), v); } catch (e) { } }
function nativeHealthOn() { return NATIVE.on && healthOn() && nhGet('') === '1'; }
async function nativeHealthSync(force) {
  if (!nativeHealthOn() || NH.busy) return;
  var last = +nhGet('last') || 0;
  if (!force && Date.now() - last < 3 * 3600e3) return;
  NH.busy = true; NH.err = '';
  try {
    if (!HK.key) HK.key = (await srvRaw('GET', '/health/key')).key || '';
    // first time: two months, so "your usual" resting heart rate, HRV and weight trend are ready at once; after that a few days
    var r = await nativeCall('healthRead', { days: last ? 4 : 60 }, 120000), days = (r && r.days) || [];
    if (days.length) {
      var res = await fetch(hLink(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: days }) });
      if (!res.ok) throw new Error('The server did not take the Health data (' + res.status + ').');
    }
    nhSet('last', String(Date.now()));
    ACCT.last = 0; await acctSync();
  } catch (e) { NH.err = e.message || 'Could not read Apple Health.'; }
  NH.busy = false;
  if (sheetOpen() && U.nhSheet) nativeHealthSheet();
}
function nativeHealthSheet() {
  U.nhSheet = true;
  var on = nhGet('') === '1', last = hLast();
  openSheet('Apple Health', (NH.err ? '<div class="banner"><span>' + esc(NH.err) + '</span></div>' : '') +
    '<div class="card section" style="gap:10px"><div class="xname">' + (on ? 'Connected' : 'Connect Apple Health') + '</div>' +
    '<div class="note">' + (on ? (last ? 'Last update ' + esc(hAgo(last.at)) + '. ' : '') + 'Iron Ledger reads Health each time you open it (at most every few hours).' :
      'Iron Ledger reads your weight, body fat, resting heart rate, HRV, sleep, steps, active energy and waist size straight from Apple Health, and can save your finished workouts there. Only you can see these numbers.') + '</div>' +
    (on ? '<button class="btn primary block" data-act="nhSync"' + (NH.busy ? ' disabled' : '') + '>' + (NH.busy ? 'Reading Apple Health…' : 'Update now') + '</button>'
      : '<button class="btn primary block" data-act="nhConnect"' + (NH.busy ? ' disabled' : '') + '>' + (NH.busy ? 'Connecting…' : 'Connect Apple Health') + '</button>') + '</div>' +
    (on ? '<div class="card section" style="gap:8px"><div class="xname">Save workouts to Apple Health</div><div class="note">Finished workouts show in the Fitness app as strength training and count toward your Activity rings.</div><div class="seg" role="group" aria-label="Save workouts to Health"><button aria-pressed="' + (nhGet('wk') !== '0') + '" data-act="nhWk" data-k="1">On</button><button aria-pressed="' + (nhGet('wk') === '0') + '" data-act="nhWk" data-k="0">Off</button></div></div>' : '') +
    '<div class="note">What it\'s used for: your weigh-ins go into your body log (a weigh-in you type yourself that day wins), so ranks use your weight on each day. Active energy sets your daily calories on the Eat tab, and body fat makes the calorie estimate more exact. Sleep, resting heart rate and HRV adjust the recovery map.</div>' +
    '<div class="note">To change what Iron Ledger can read: Settings app → Health → Data Access &amp; Devices → Iron Ledger. If a number never shows up, check it is switched on there.</div>');
}
function nativeClick(a, d) {
  if (a === 'nhConnect') {
    NH.busy = true; NH.err = ''; nativeHealthSheet();
    nativeCall('healthAuth', {}, 600000).then(function () { nhSet('', '1'); NH.busy = false; return nativeHealthSync(true); }, function (e) { NH.busy = false; NH.err = e.message; })
      .then(function () { if (sheetOpen()) nativeHealthSheet(); render(); });
    return true;
  }
  if (a === 'nhWk') { nhSet('wk', d.k); nativeHealthSheet(); return true; }
  if (a === 'nhSync') { nativeHealthSync(true); NH.busy = true; nativeHealthSheet(); return true; }
  return false;
}

/* ----- rest alerts for the web app (Home Screen app on iPhone, iOS 16.4+): the friends server sends a push
   when rest ends, so the alert comes even with the app closed or the phone locked ----- */
var WP = { end: 0 };
/* no account needed: this phone registers with the server once and gets its own id (il-pushdev) */
function webPushAvail() { return !NATIVE.on && !window.claude && typeof SRV !== 'undefined' && !!SRV.url && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function webPushDev() { try { return JSON.parse(localStorage.getItem('il-pushdev') || 'null'); } catch (e) { return null; } }
function webPushOn() { var d = webPushDev(); return webPushAvail() && !!(d && d.did && d.on !== false) && Notification.permission === 'granted'; }
/* iPhone only allows notifications for web apps opened from the Home Screen, not a Safari tab */
function webPushNeedsInstall() { return /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone && !(window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
function b64u8(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
async function webPushEnable() {
  if (!webPushAvail() || webPushNeedsInstall()) throw new Error('On iPhone, rest alerts need Iron Ledger added to your Home Screen (Share → Add to Home Screen), then opened from there.');
  var perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are off for Iron Ledger. Turn them on in the iPhone Settings app → Notifications → Iron Ledger.');
  var reg = await navigator.serviceWorker.ready, key = (await srvRaw('GET', '/push/key', null, false)).key;
  var sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(key) }));
  var old = webPushDev() || {}, r;
  try { r = await srvRaw('POST', '/push/dev', { sub: sub.toJSON(), did: old.did, sec: old.sec }, false); }
  catch (e) {
    // a server that has not been updated yet: fall back to alerts tied to your account
    if (e.code !== 404 && e.code !== 401) throw e;
    if (!(typeof srvOn === 'function' && srvOn())) throw new Error('Sign in (Friends tab) to turn on rest alerts.');
    await srvRaw('POST', '/push/sub', { sub: sub.toJSON() });
    try { localStorage.setItem('il-pushdev', JSON.stringify({ did: 'acct', legacy: true, on: true })); } catch (e2) { }
    return;
  }
  try { localStorage.setItem('il-pushdev', JSON.stringify({ did: r.did, sec: r.sec, on: true })); } catch (e) { }
}
function webPushOff() { var d = webPushDev(); if (d) { d.on = false; try { localStorage.setItem('il-pushdev', JSON.stringify(d)); } catch (e) { } } }
function webRestSend(end) {
  var d = webPushDev(); if (!d) return;
  if (d.legacy) { if (srvOn()) (end ? srvRaw('POST', '/push/rest', { end: end }) : srvRaw('DELETE', '/push/rest')).catch(function () { }); return; }
  srvRaw('POST', '/push/devrest', end ? { did: d.did, sec: d.sec, end: end } : { did: d.did, sec: d.sec, cancel: true }, false).catch(function (e) { if (e && /again/.test(e.message || '')) { NH.pushErr = e.message; } });
}
/* the push address can change (iPhone renews it now and then): re-register quietly when the app opens */
function webPushRefresh() {
  // phones that turned alerts on with an account before: move them over to the no-account setup (no new prompt, permission is already given)
  try { if (!webPushDev() && webPushAvail() && !webPushNeedsInstall() && Notification.permission === 'granted' && Object.keys(localStorage).some(function (k) { return k.indexOf('il-push:') === 0 && localStorage.getItem(k) === '1'; })) { webPushEnable().catch(function () { }); return; } } catch (e) { }
  if (!webPushOn()) return;
  navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
    var d = webPushDev(); if (!sub || !d) return;
    if (d.legacy) return webPushEnable();   // try again: moves to the no-account setup once the server has it
    return srvRaw('POST', '/push/dev', { sub: sub.toJSON(), did: d.did, sec: d.sec }, false).then(function (r) { try { localStorage.setItem('il-pushdev', JSON.stringify({ did: r.did, sec: r.sec, on: true })); } catch (e) { } });
  }).catch(function () { });
}
function webRestTick() {
  if (!webPushOn()) return;
  var r = U.rest, end = r && !r.done ? Math.round(r.end) : 0;
  // watching the app when rest ends: the in-app chime is enough, so call off the push just before
  if (end && !document.hidden && end - Date.now() < 2500) end = 0;
  if (end !== WP.end) {
    var was = WP.end; WP.end = end;
    if (end) webRestSend(end);
    else if (was) webRestSend(0);
  }
}
/* the card in Settings, and a one-time tip during a workout */
function restAlertCard() {
  var body, btn = '';
  if (NATIVE.on) body = 'On. When rest is over you get a notification, even in another app or with the phone locked. You can change it in the iPhone Settings app → Notifications → Iron Ledger.';
  else if (window.claude) body = 'In this version the alert only sounds while Iron Ledger is open on screen. Use the Home Screen app (or the iPhone app) for alerts with the app closed.';
  else if (webPushOn()) { body = 'On. When rest is over this phone plays its notification sound and shows "Rest is over", even with the app closed, the phone locked or another app open (and on your Apple Watch). No account needed.'; btn = '<button class="btn block ghost" data-act="pushTest">Send a test alert in 5 s</button><button class="btn block ghost" data-act="pushOff">Turn off</button>'; }
  else if (webPushAvail() && !webPushNeedsInstall()) { body = 'Get the chime as a notification when rest is over, even with the app closed, the phone locked or music playing. No account needed.'; btn = '<button class="btn block primary" data-act="pushOn">Turn on rest alerts</button>'; }
  else body = 'iPhone only lets web apps alert you when they are installed. In Safari tap Share → Add to Home Screen, open Iron Ledger from the new icon, then turn rest alerts on here. (Until then the chime only plays while the app is open on screen.)';
  return '<div class="section"><span class="field-label">Rest alerts when the app is closed</span><div class="card section" style="gap:10px"><div class="note">' + body + '</div>' + btn + (NH.pushErr ? '<div class="note" style="color:var(--down)">' + esc(NH.pushErr) + '</div>' : '') + '</div></div>';
}
function restAlertTip() {
  var seen = ''; try { seen = localStorage.getItem('il-push-tip') || ''; } catch (e) { }
  if (seen || !webPushAvail() || webPushOn()) return '';
  if (webPushNeedsInstall()) return '<div class="banner"><span><b>Rest chime with the phone locked</b> · iPhone only allows it for installed web apps: in Safari tap Share → Add to Home Screen, open Iron Ledger from that icon, then turn on rest alerts.</span><span class="row" style="gap:6px"><button class="btn small" data-act="pushTipNo">Got it</button></span></div>';
  return '<div class="banner"><span><b>Rest alerts</b> · get a notification when rest is over, even with the app closed.</span><span class="row" style="gap:6px"><button class="btn small primary" data-act="pushOn">Turn on</button><button class="btn small" data-act="pushTipNo">Not now</button></span></div>';
}
function pushClick(a) {
  if (a === 'pushOn') {
    NH.pushErr = '';
    webPushEnable().then(function () { try { localStorage.setItem('il-push-tip', '1'); } catch (e) { } toast('Rest alerts are on'); render(); }, function (e) { NH.pushErr = e.message; toast(e.message); render(); });
    return true;
  }
  if (a === 'pushOff') { webPushOff(); webRestSend(0); WP.end = 0; toast('Rest alerts are off'); render(); return true; }
  if (a === 'pushTest') { webRestSend(Date.now() + 5000); toast('Lock the phone or switch apps — the alert comes in 5 seconds'); return true; }
  if (a === 'pushTipNo') { try { localStorage.setItem('il-push-tip', '1'); } catch (e) { } render(); return true; }
  return false;
}
