/* ===== timers in a workout: a hold timer for timed moves (planks, wall sits, stretches)
   and a tempo timer that paces each rep (e.g. 3 s down, 1 s up) and counts them for you ===== */
var TM = null;   // the running timer
function tmTone(freq, ms, vol) {
  if (S.settings.chime === false) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    tmTone.ctx = tmTone.ctx || new AC(); var c = tmTone.ctx; if (c.state === 'suspended') c.resume();
    var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime;
    o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (ms || 120) / 1000); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + (ms || 120) / 1000 + 0.02);
  } catch (e) { }
}
/* spoken cues. The iPhone app (1.3+) speaks them itself, so they come through on silent and over music.
   On the web, iPhone only lets a page talk after it has spoken once during a tap (tmVoiceUnlock), and
   cancel() right before speak() can make Safari drop the new phrase, so only cancel when something is still talking. */
function tmSay(t) {
  if (S.settings.voice === false) return;
  var loud = chimeLoud();
  if (typeof NATIVE !== 'undefined' && NATIVE.on && !tmSay.noNative) { nativeCall('speak', { text: t, loud: loud }).catch(function () { tmSay.noNative = true; tmSay(t); }); return; }
  if (!window.speechSynthesis) return;
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t); u.rate = 1.15; u.volume = 1; u.lang = 'en-US';
    if (tmSay.voice) u.voice = tmSay.voice;
    speechSynthesis.speak(u);
    if (speechSynthesis.paused) speechSynthesis.resume();   // iOS can leave the queue paused after the app was in the background
  } catch (e) { }
}
/* call from a tap that starts a timer */
function tmVoiceUnlock() {
  // sound through the silent switch while a timer runs, the same as the rest chime setting
  try { if (navigator.audioSession && !(typeof NATIVE !== 'undefined' && NATIVE.on)) navigator.audioSession.type = chimeLoud() ? 'playback' : 'ambient'; } catch (e) { }
  if (S.settings.voice === false || (typeof NATIVE !== 'undefined' && NATIVE.on) || !window.speechSynthesis) return;
  try {
    if (!tmSay.voice && speechSynthesis.getVoices) { var vs = speechSynthesis.getVoices().filter(function (v) { return /^en(-|_)/i.test(v.lang); }); tmSay.voice = vs.filter(function (v) { return v.localService; })[0] || vs[0] || null; }
    var u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u);
  } catch (e) { }
}
/* the set a timer fills: the first working set not ticked yet (adds one if all are done) */
function tmSetIndex(e) {
  for (var i = 0; i < e.sets.length; i++) if (!e.sets[i].done && !e.sets[i].wu) return i;
  var last = e.sets[e.sets.length - 1] || {}; e.sets.push({ w: last.w == null ? null : last.w, r: last.r || e.lo, done: false, sug: true });
  return e.sets.length - 1;
}
function tmStop() {
  if (TM) { clearInterval(TM.iv); TM = null; }
  try { if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch (e) { }
  try { if (navigator.audioSession && !(typeof NATIVE !== 'undefined' && NATIVE.on)) navigator.audioSession.type = 'ambient'; } catch (e) { }
}
function tmRing(frac, color) {
  var R = 92, C = 2 * Math.PI * R, f = Math.max(0, Math.min(1, frac));
  return '<svg viewBox="0 0 220 220" class="tmring" aria-hidden="true"><circle cx="110" cy="110" r="' + R + '" fill="none" style="stroke:var(--line2)" stroke-width="12"/>' +
    '<circle id="tmarc" cx="110" cy="110" r="' + R + '" fill="none" style="stroke:' + (color || 'var(--accent)') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - f)).toFixed(1) + '" transform="rotate(-90 110 110)"/></svg>';
}
function tmFace(big, sub, label, frac, color) {
  return '<div class="tmface">' + tmRing(frac, color) + '<div class="tmmid"><div class="tmlabel" id="tmlabel">' + esc(label || '') + '</div><div class="tmbig num" id="tmbig">' + esc(big) + '</div><div class="tmsub" id="tmsub">' + esc(sub || '') + '</div></div></div>';
}
function tmUpdate(big, sub, label, frac, color) {
  var b = $('#tmbig'), s = $('#tmsub'), l = $('#tmlabel'), a = $('#tmarc');
  if (!b) { tmStop(); return; }   // sheet was closed
  b.textContent = big; s.textContent = sub || ''; l.textContent = label || '';
  if (a) { var C = 2 * Math.PI * 92; a.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1)); if (color) a.style.stroke = color; }
}
function fmtSec(s) { s = Math.max(0, Math.round(s)); return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : String(s); }

/* ----- hold timer ----- */
function holdSheet(xi) {
  var e = S.draft.ex[xi], si = tmSetIndex(e), st = e.sets[si], target = +st.r || e.lo || 30;
  tmStop(); unlockAudio(); tmTone(660, 1, 0.0001); tmVoiceUnlock();
  TM = { kind: 'hold', x: xi, s: si, target: target, t0: Date.now() + 3000, last: null };
  openSheet(e.n, '<div class="note">Set ' + (si + 1) + ' · target ' + fmtSec(target) + ' s. Get in position; it starts after 3, 2, 1.</div>' +
    tmFace('3', 'get ready', 'Starting', 0) +
    '<div class="row" style="gap:8px"><button class="btn small grow" data-act="tmAdj" data-v="-5">−5 s</button><button class="btn small grow" data-act="tmAdj" data-v="5">+5 s</button></div>' +
    '<button class="btn primary block" data-act="tmDone">Stop and log it</button><button class="btn block ghost" data-act="close">Cancel</button>');
  TM.iv = setInterval(holdTick, 100); holdTick();
}
function holdTick() {
  if (!TM || TM.kind !== 'hold') return;
  var now = Date.now();
  if (now < TM.t0) {
    var c = Math.ceil((TM.t0 - now) / 1000);
    if (TM.last !== 'r' + c) { TM.last = 'r' + c; tmTone(660, 120); tmSay(['', 'one', 'two', 'three'][c] || String(c)); }
    tmUpdate(String(c), 'get ready', 'Starting', 1 - (TM.t0 - now) / 3000); return;
  }
  var el = (now - TM.t0) / 1000, left = TM.target - el;
  if (TM.last && TM.last.charAt(0) === 'r') { TM.last = 'go'; tmTone(990, 220); tmSay('Go'); haptic('tap'); }
  if (left > 0) {
    var cs = Math.ceil(left);
    if (cs <= 3 && TM.last !== 'c' + cs) { TM.last = 'c' + cs; tmTone(880, 90); }
    tmUpdate(fmtSec(left), 'of ' + fmtSec(TM.target) + ' s', 'Hold', el / TM.target);
  } else {
    if (!TM.hit) { TM.hit = true; tmTone(1320, 400); setTimeout(function () { tmTone(1760, 400); }, 180); tmSay('Done'); haptic('done'); }
    tmUpdate('+' + fmtSec(-left), 'held ' + fmtSec(el) + ' s · tap Stop to log', 'Target reached', 1, 'var(--up)');
  }
}
function holdDone() {
  if (!TM || TM.kind !== 'hold') return;
  var held = Math.max(0, Math.round((Date.now() - TM.t0) / 1000)), x = TM.x, s = TM.s;
  tmStop(); closeSheet();
  if (held < 1) { toast('Nothing logged.'); return; }
  var st = S.draft.ex[x].sets[s]; st.r = held; st.sug = false; if (st.w == null) st.w = 0;
  if (markSetDone(x, s)) toast('Logged ' + held + ' s');
}

/* ----- tempo timer: e.g. 3 s down, 0 s pause, 1 s up, 0 s pause, for N reps ----- */
function tempoOf(name) { var t = (S.settings.tempo || {})[name]; return t && typeof t === 'object' ? t : { d: 3, b: 0, u: 1, t: 0 }; }
function tempoSheet(xi) {
  tmStop();
  var e = S.draft.ex[xi], si = tmSetIndex(e), st = e.sets[si], t = tempoOf(e.n), reps = +st.r || e.lo || 8;
  U.tempo = { x: xi, s: si, reps: reps, d: t.d, b: t.b, u: t.u, t: t.t };
  tempoSetupSheet();
}
function tempoSetupSheet() {
  var T = U.tempo, e = S.draft.ex[T.x];
  var step = function (k, label, unitTxt) {
    return '<div class="lrow"><span class="grow">' + label + '</span><span class="row" style="gap:6px;align-items:center"><button class="btn small" data-act="tpStep" data-k="' + k + '" data-v="-1" aria-label="Less">−</button>' +
      '<span class="num" style="min-width:52px;text-align:center;font-size:22px">' + T[k] + (unitTxt || '') + '</span><button class="btn small" data-act="tpStep" data-k="' + k + '" data-v="1" aria-label="More">+</button></span></div>';
  };
  var per = T.d + T.b + T.u + T.t;
  openSheet('Tempo · ' + e.n, '<div class="note">Paces each rep with beeps and voice cues, counts them, and logs the set when you finish. Lowering slowly (3 s or more) is a good way to build muscle with lighter weights.</div>' +
    '<div class="card" style="padding:0 14px">' + step('reps', 'Reps') + step('d', 'Down (lowering)', ' s') + step('b', 'Pause at the bottom', ' s') + step('u', 'Up (lifting)', ' s') + step('t', 'Pause at the top', ' s') + '</div>' +
    '<div class="note">About ' + Math.round(per * T.reps + 3) + ' s for this set · ' + T.d + '-' + T.b + '-' + T.u + '-' + T.t + ' tempo · set ' + (T.s + 1) + '</div>' +
    '<label class="row" style="gap:8px;align-items:center"><input type="checkbox" id="tpvoice"' + (S.settings.voice === false ? '' : ' checked') + '> <span class="note" style="color:var(--fg)">Say "down" and "up" out loud</span></label>' +
    '<button class="btn primary block" data-act="tpGo">Start</button><button class="btn block ghost" data-act="close">Cancel</button>');
}
function tempoGo() {
  var T = U.tempo, e = S.draft.ex[T.x];
  S.settings.tempo = S.settings.tempo || {}; S.settings.tempo[e.n] = { d: T.d, b: T.b, u: T.u, t: T.t }; persist({ settings: true });
  unlockAudio(); tmTone(660, 1, 0.0001); tmVoiceUnlock();
  var ph = [['Down', T.d, 440], ['Hold', T.b, 660], ['Up', T.u, 880], ['Hold', T.t, 660]].filter(function (p) { return p[1] > 0; });
  if (!ph.length) ph = [['Down', 2, 440], ['Up', 1, 880]];
  var per = ph.reduce(function (a, p) { return a + p[1]; }, 0);
  TM = { kind: 'tempo', x: T.x, s: T.s, reps: T.reps, ph: ph, per: per, t0: Date.now() + 3000, last: null };
  openSheet('Tempo · ' + e.n, tmFace('3', 'get ready', 'Starting', 0) +
    '<div class="note" style="text-align:center" id="tmreps">Rep 0 of ' + T.reps + '</div>' +
    '<button class="btn primary block" data-act="tmDone">Stop and log reps</button><button class="btn block ghost" data-act="close">Cancel</button>');
  TM.iv = setInterval(tempoTick, 50); tempoTick();
}
function tempoTick() {
  if (!TM || TM.kind !== 'tempo') return;
  var now = Date.now();
  if (now < TM.t0) {
    var c = Math.ceil((TM.t0 - now) / 1000);
    if (TM.last !== 'r' + c) { TM.last = 'r' + c; tmTone(660, 120); tmSay(['', 'one', 'two', 'three'][c] || String(c)); }
    tmUpdate(String(c), 'get ready', 'Starting', 1 - (TM.t0 - now) / 3000); return;
  }
  var el = (now - TM.t0) / 1000, rep = Math.floor(el / TM.per);
  if (rep >= TM.reps) {
    if (!TM.fin) { TM.fin = true; TM.done = TM.reps; tmTone(1320, 400); setTimeout(function () { tmTone(1760, 400); }, 180); tmSay('Done'); haptic('done'); setTimeout(holdDoneTempo, 900); }
    tmUpdate(String(TM.reps), 'reps done', 'Finished', 1, 'var(--up)'); return;
  }
  var into = el - rep * TM.per, i = 0, acc = 0;
  while (i < TM.ph.length - 1 && into >= acc + TM.ph[i][1]) { acc += TM.ph[i][1]; i++; }
  var p = TM.ph[i], left = p[1] - (into - acc), key = rep + ':' + i;
  // each phase starts with its word ("down", "up", "hold"), then counts the seconds left out loud: "down… 2… 1… up"
  var sec = Math.floor(into - acc), ck = key + ':' + sec;
  if (TM.last !== key && TM.lastC !== ck) { TM.last = key; TM.lastC = ck; tmTone(p[2], 140); tmSay(p[0].toLowerCase()); if (i === 0) haptic('tap'); }
  else if (TM.lastC !== ck) { TM.lastC = ck; var n = Math.round(p[1] - sec); if (n >= 1) { tmTone(p[2], 50, 0.12); tmSay(['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n)); } }
  TM.done = rep;
  tmUpdate(p[0], fmtSec(Math.ceil(left)) + ' s', 'Rep ' + (rep + 1) + ' of ' + TM.reps, (into - acc) / p[1], p[0] === 'Up' ? 'var(--up)' : p[0] === 'Down' ? 'var(--accent)' : 'var(--muted)');
  var rr = $('#tmreps'); if (rr) rr.textContent = rep + ' of ' + TM.reps + ' reps done';
}
function holdDoneTempo() {
  if (!TM || TM.kind !== 'tempo') return;
  var reps = TM.done || 0, x = TM.x, s = TM.s;
  tmStop(); closeSheet();
  if (reps < 1) { toast('No reps logged.'); return; }
  var st = S.draft.ex[x].sets[s]; st.r = reps; st.sug = false;
  if (markSetDone(x, s)) toast('Logged ' + reps + ' reps');
  else render();
}
function timerClick(a, d) {
  if (a === 'holdGo') { holdSheet(+d.x); return true; }
  if (a === 'tempoGo') { tempoSheet(+d.x); return true; }
  if (a === 'tpStep') { var T = U.tempo; if (!T) return true; var k = d.k, v = T[k] + (+d.v); T[k] = k === 'reps' ? Math.max(1, Math.min(50, v)) : Math.max(0, Math.min(10, v)); if (T.d + T.b + T.u + T.t === 0) T.u = 1; tempoSetupSheet(); return true; }
  if (a === 'tpGo') { var vc = $('#tpvoice'); if (vc) { S.settings.voice = vc.checked; } tempoGo(); return true; }
  if (a === 'tmAdj') { if (TM && TM.kind === 'hold') { TM.target = Math.max(5, TM.target + (+d.v)); TM.hit = false; } return true; }
  if (a === 'tmDone') { if (TM && TM.kind === 'hold') holdDone(); else if (TM && TM.kind === 'tempo') holdDoneTempo(); return true; }
  return false;
}
