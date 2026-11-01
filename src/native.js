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
window.ILNativeEvent = function (name) { if (name === 'foreground') { nativeHealthSync(false); if (typeof tick === 'function') tick(); } };

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
  if (!NATIVE.on) return;
  var r = U.rest, end = r && !r.done ? Math.round(r.end) : 0;
  if (end !== NATIVE.restEnd) {
    NATIVE.restEnd = end;
    if (end) nativeCall('restStart', { sec: Math.max(1, (end - Date.now()) / 1000), body: 'Time for your next set.' }).catch(function () { });
    else nativeCall('restCancel').catch(function () { });
  }
  var aw = !!S.draft;
  if (aw !== NATIVE.awake) { NATIVE.awake = aw; nativeCall('awake', { on: aw }).catch(function () { }); }
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
      'Iron Ledger reads your weight, body fat, resting heart rate, HRV, sleep, steps and active energy straight from Apple Health. Nothing is written to Health, and only you can see these numbers.') + '</div>' +
    (on ? '<button class="btn primary block" data-act="nhSync"' + (NH.busy ? ' disabled' : '') + '>' + (NH.busy ? 'Reading Apple Health…' : 'Update now') + '</button>'
      : '<button class="btn primary block" data-act="nhConnect"' + (NH.busy ? ' disabled' : '') + '>' + (NH.busy ? 'Connecting…' : 'Connect Apple Health') + '</button>') + '</div>' +
    '<div class="note">What it\'s used for: your weigh-ins go into your body log (a weigh-in you type yourself that day wins), so ranks use your weight on each day. Active energy sets your daily calories on the Eat tab, and body fat makes the calorie estimate more exact. Sleep, resting heart rate and HRV adjust the recovery map.</div>' +
    '<div class="note">To change what Iron Ledger can read: Settings app → Health → Data Access &amp; Devices → Iron Ledger. If a number never shows up, check it is switched on there.</div>');
}
function nativeClick(a) {
  if (a === 'nhConnect') {
    NH.busy = true; NH.err = ''; nativeHealthSheet();
    nativeCall('healthAuth', {}, 600000).then(function () { nhSet('', '1'); NH.busy = false; return nativeHealthSync(true); }, function (e) { NH.busy = false; NH.err = e.message; })
      .then(function () { if (sheetOpen()) nativeHealthSheet(); render(); });
    return true;
  }
  if (a === 'nhSync') { nativeHealthSync(true); NH.busy = true; nativeHealthSheet(); return true; }
  return false;
}
