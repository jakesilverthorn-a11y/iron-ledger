/* ===== insights: weekly sets per muscle, stalled lifts, body measurements ===== */

/* ----- hard sets per muscle this week (primary muscle 1 set, secondary ½), against the 10–20 that most research supports for growth ----- */
var SET_TARGET = { lo: 10, hi: 20 };
function weekSets(W, from, to) {
  var n = {}; GROUPS.forEach(function (g) { n[g] = 0; });
  W.forEach(function (w) {
    if (w.t < from || w.t >= to) return;
    w.ex.forEach(function (e) {
      var x = BYNAME[e.n]; if (!x || x.c === 'stretching') return;
      var k = e.sets.length;
      x.p.forEach(function (g) { if (n[g] != null) n[g] += k; });
      x.s.forEach(function (g) { if (n[g] != null && x.p.indexOf(g) < 0) n[g] += k * 0.5; });
    });
  });
  return n;
}
function weeklySetsCard() {
  var W = realWorkouts(); if (!W.length) return '';
  var ws = weekStart(Date.now()), cur = weekSets(W, ws, weekStart(ws + 10 * DAY)), prev = weekSets(W, weekStart(ws - 3 * DAY), ws);
  var max = Math.max(24, Math.max.apply(null, GROUPS.map(function (g) { return cur[g]; })));
  var rows = GROUPS.map(function (g) {
    var v = Math.round(cur[g] * 2) / 2, p = Math.round(prev[g]), zone = v >= SET_TARGET.hi ? 'hi' : v >= SET_TARGET.lo ? 'ok' : 'lo';
    return '<div class="wsrow"><span class="wsn">' + g + '</span><span class="wsbar"><i class="z" style="left:' + (SET_TARGET.lo / max * 100) + '%;width:' + ((SET_TARGET.hi - SET_TARGET.lo) / max * 100) + '%"></i><i class="v ' + zone + '" style="width:' + Math.min(100, v / max * 100) + '%"></i></span><span class="num wsv">' + v + '</span><span class="wsp faint">' + (p ? 'last ' + p : '') + '</span></div>';
  }).join('');
  var low = GROUPS.filter(function (g) { return cur[g] < SET_TARGET.lo && g !== 'Forearms'; });
  var dleft = 7 - Math.floor((Date.now() - ws) / DAY);
  return '<div class="card section" style="gap:10px"><div class="row"><h2 class="grow" style="font-size:22px">Sets this week</h2><span class="note">' + dleft + ' day' + (dleft === 1 ? '' : 's') + ' left</span></div>' +
    '<div class="note">Hard sets per muscle (a set for a helper muscle counts as half). The shaded band is 10–20 sets, the range most people grow best in.</div>' +
    '<div class="wsl">' + rows + '</div>' +
    (low.length && low.length < GROUPS.length ? '<button class="btn small block" data-act="setsTrain" data-g="' + esc(low.slice(0, 3).join(',')) + '">Build a workout for ' + esc(low.slice(0, 3).join(', ')) + '</button>' : '') + '</div>';
}

/* ----- stalled lifts: no new best in the last 3 sessions, still training it ----- */
function plateauOf(h) {
  if (!h || h.length < 5 || h[0].dist != null || h[0].sec != null) return null;   // not for runs and rides
  var last = h[h.length - 1]; if (Date.now() - last.t > 28 * DAY) return null;
  var before = Math.max.apply(null, h.slice(0, -3).map(function (x) { return x.best; }));
  var recent = Math.max.apply(null, h.slice(-3).map(function (x) { return x.best; }));
  if (recent > before * 1.005) return null;
  var since = h.slice().reverse().find(function (x) { return x.best >= before * 0.999; });
  return { n: 3, best: before, since: since ? since.t : h[0].t };
}
function plateauTips(name) {
  var ex = BYNAME[name], bw = isBW(ex), alt = [];
  try { alt = similarExercises(name, { gear: gearList(), exclude: [name] }).slice(0, 2).map(function (e) { return e.n; }); } catch (e) { }
  var tips = bw ? ['Add a little weight (a vest or a dumbbell between your feet) and work back up in reps.', 'Try slower reps: 3 seconds down with the Tempo timer.']
    : ['Take a lighter week: about 10% less weight, same reps, then build back up.', 'Change the rep range for a few weeks (for example 8–12 if you have been doing 5–8).', 'Lower the weight slowly (3 seconds) with the Tempo timer.'];
  if (alt.length) tips.push('Swap in a similar lift for a month: ' + alt.join(' or ') + '.');
  return tips;
}
function plateauBanner(name, h) {
  var p = plateauOf(h); if (!p) return '';
  return '<div class="card section stall" style="gap:8px"><div class="xname">Stalled for 3 sessions</div><div class="note">No new best since ' + esc(fmtDate(p.since)) + '. That happens to everyone. A few ways to get moving again:</div><ul class="tips">' + plateauTips(name).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
}
function stalledList(H) {
  return Object.keys(H).filter(function (n) { return plateauOf(H[n]); });
}
function stalledCard(H) {
  var s = stalledList(H); if (!s.length) return '';
  return '<div class="card section stall" style="gap:8px"><div class="xname">' + s.length + ' lift' + (s.length > 1 ? 's have' : ' has') + ' stalled</div><div class="note">No new best in the last 3 sessions: ' + s.slice(0, 4).map(function (n) { return '<button class="linkbtn accent" data-act="openLift" data-n="' + esc(n) + '">' + esc(n) + '</button>'; }).join(', ') + (s.length > 4 ? ' and ' + (s.length - 4) + ' more' : '') + '. Tap one for ideas.</div></div>';
}

/* ----- body measurements (stored in cm) ----- */
var MEAS = [['waist', 'Waist'], ['chest', 'Chest'], ['arm', 'Arm'], ['thigh', 'Thigh'], ['hips', 'Hips'], ['neck', 'Neck']];
function measLog() { var b = S.settings.body || {}; return Array.isArray(b.meas) ? b.meas : []; }
function measUnit() { return unit() === 'kg' ? 'cm' : 'in'; }
function measDisp(cm) { return cm == null ? '' : unit() === 'kg' ? String(Math.round(cm * 10) / 10) : String(Math.round(cm / 2.54 * 10) / 10); }
function measLatest(k, before) { var L = measLog(); for (var i = L.length - 1; i >= 0; i--) if (L[i][k] != null && (!before || L[i].t <= before)) return L[i]; return null; }
/* US Navy body-fat estimate: needs height, neck and waist (and hips for women) */
function navyBF() {
  var B = profB(), n = measLatest('neck'), w = measLatest('waist'); if (!B || !n || !w) return null;
  var h = B.h, lg = Math.log10, bf;
  if (B.sex === 'M') { if (w.waist <= n.neck) return null; bf = 495 / (1.0324 - 0.19077 * lg(w.waist - n.neck) + 0.15456 * lg(h)) - 450; }
  else { var hp = measLatest('hips'); if (!hp || w.waist + hp.hips <= n.neck) return null; bf = 495 / (1.29579 - 0.35004 * lg(w.waist + hp.hips - n.neck) + 0.221 * lg(h)) - 450; }
  return bf > 2 && bf < 60 ? Math.round(bf * 10) / 10 : null;
}
function measCard() {
  var L = measLog(), u = measUnit();
  if (!L.length) return '<div class="card section" style="gap:10px"><h2 style="font-size:22px">Measurements</h2><div class="note">Track your waist, chest, arms and more. The tape often shows progress the scale hides: a smaller waist with the same weight means fat lost and muscle gained.</div><button class="btn block" data-act="measAdd">Log measurements</button></div>';
  var tiles = MEAS.map(function (m) {
    var cur = measLatest(m[0]); if (!cur) return '';
    var old = measLatest(m[0], cur.t - 25 * DAY), d = old && old !== cur ? cur[m[0]] - old[m[0]] : null;
    return '<div class="htile"><div class="mtag">' + m[1] + '</div><div class="num" style="font-size:24px">' + measDisp(cur[m[0]]) + ' <span class="faint" style="font-size:14px">' + u + '</span></div>' + (d != null && Math.abs(d) >= 0.2 ? '<div class="xmeta">' + (d > 0 ? '+' : '−') + measDisp(Math.abs(d)) + ' ' + u + ' in a month</div>' : '<div class="xmeta">' + fmtDate(cur.t) + '</div>') + '</div>';
  }).join('');
  var bf = navyBF(), wp = L.filter(function (x) { return x.waist != null; }).map(function (x) { return { t: x.t, v: unit() === 'kg' ? x.waist : x.waist / 2.54 }; });
  return '<div class="section"><div class="row"><h2 class="grow">Measurements</h2><button class="btn small" data-act="measAdd">+ Log</button></div><div class="hgrid">' + tiles + '</div>' +
    (bf ? '<div class="note">Estimated body fat from your tape measurements (US Navy method): <b>' + bf + '%</b>. Good for tracking the trend; it can be a few points off.</div>' : '') +
    (wp.length > 1 ? '<div class="card section" style="gap:6px"><div class="xname">Waist</div>' + lineChart(wp, { unit: unit() === 'kg' ? ' cm' : ' in', label: 'Waist trend', fmt: function (v) { return Math.round(v * 10) / 10; } }) + '</div>' : '') + '</div>';
}
function measSheet() {
  var u = measUnit(), last = {};
  MEAS.forEach(function (m) { var c = measLatest(m[0]); if (c) last[m[0]] = c[m[0]]; });
  openSheet('Log measurements', '<div class="note">Measure in the morning, relaxed, tape snug but not tight. Waist: at the belly button. Arm and thigh: the widest part. Skip any you don\'t want to track.</div>' +
    '<div class="grid2">' + MEAS.map(function (m) { return '<label><span class="field-label">' + m[1] + ' (' + u + ')</span><input class="input" id="ms-' + m[0] + '" inputmode="decimal" placeholder="' + (last[m[0]] != null ? measDisp(last[m[0]]) : u) + '" aria-label="' + m[1] + ' in ' + u + '"></label>'; }).join('') + '</div>' +
    '<div class="note" id="ms-err" style="color:var(--down);min-height:0"></div><button class="btn primary block" data-act="measSave">Save</button>' +
    (measLog().length ? '<div class="section"><h3 style="font-size:20px">Past entries</h3>' + measLog().slice(-6).reverse().map(function (x) { return '<div class="lrow"><span class="grow">' + fmtDate(x.t) + '</span><span class="note">' + MEAS.filter(function (m) { return x[m[0]] != null; }).map(function (m) { return m[1] + ' ' + measDisp(x[m[0]]); }).join(' · ') + '</span><button class="icon-btn" style="width:30px;height:30px" data-act="measDel" data-t="' + x.t + '" aria-label="Delete entry">' + ico('x') + '</button></div>'; }).join('') + '</div>' : ''));
}
function measSave() {
  var row = { t: Date.now() }, any = false, bad = false;
  MEAS.forEach(function (m) {
    var el = $('#ms-' + m[0]), v = el && String(el.value).replace(',', '.').trim(); if (!v) return;
    var n = parseFloat(v); if (!(n > 0)) { bad = true; return; }
    var cm = unit() === 'kg' ? n : n * 2.54;
    if (cm < 15 || cm > 250) { bad = true; return; }
    row[m[0]] = Math.round(cm * 10) / 10; any = true;
  });
  var er = $('#ms-err');
  if (bad) { if (er) er.textContent = 'One of the numbers looks off. Use ' + measUnit() + '.'; return; }
  if (!any) { if (er) er.textContent = 'Enter at least one measurement.'; return; }
  var b = S.settings.body; b.meas = measLog().concat([row]).slice(-400);
  persist({ settings: true }); closeSheet(); render(); toast('Measurements saved');
}
function insightsClick(a, d) {
  if (a === 'measAdd') { measSheet(); return true; }
  if (a === 'measSave') { measSave(); return true; }
  if (a === 'measDel') { var b = S.settings.body, gone = measLog().filter(function (x) { return String(x.t) === d.t; })[0]; if (gone && gone.h) b.mdel = (b.mdel || []).concat([dayKey(gone.t)]).slice(-200); b.meas = measLog().filter(function (x) { return String(x.t) !== d.t; }); persist({ settings: true }); measSheet(); render(); return true; }
  if (a === 'setsTrain') { var gs = d.g.split(',').filter(function (g) { return GROUPS.indexOf(g) >= 0; }); if (gs.length) S.settings.groups = gs; persist({ settings: true }); U.tab = 'train'; U.plan = null; render(); window.scrollTo(0, 0); toast('Muscles selected. Tap Build my workout.'); return true; }
  return false;
}
