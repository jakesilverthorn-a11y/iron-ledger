/* ===== plan the week ahead =====
   Pick your training days; each day gets a focus (Push, Pull, Legs, Upper, Lower, Full body) ordered so every
   muscle gets its rest (big muscles 72 h when possible, at least 48 h), then a full workout is built for each day. */
var WK_FOCUS = {
  Push: ['Chest', 'Shoulders', 'Triceps'],
  Pull: ['Back', 'Biceps', 'Forearms', 'Core'],
  Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  Upper: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
  Lower: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'],
  'Full body': ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Core'],
  'Core & mobility': ['Core']
};
var BIG_MUSCLE = { Chest: 1, Back: 1, Quads: 1, Hamstrings: 1, Glutes: 1 };
function wkTemplate(n, days) {
  var spread = days.length < 2 || days.every(function (d, i) { return !i || d - days[i - 1] >= 2; });
  return ({
    1: ['Full body'], 2: spread ? ['Full body', 'Full body'] : ['Upper', 'Lower'],
    3: spread ? ['Full body', 'Full body', 'Full body'] : ['Push', 'Pull', 'Legs'],
    4: ['Upper', 'Lower', 'Upper', 'Lower'], 5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
    6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'], 7: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Core & mobility']
  })[n] || [];
}
/* how badly an order breaks rest rules: day numbers are 0..6 from Monday; ready[g] = day the muscle is fresh from past workouts */
function wkPenalty(order, days, ready) {
  var last = {}, pen = 0;
  order.forEach(function (f, i) {
    var day = days[i];
    WK_FOCUS[f].forEach(function (g) {
      if (ready[g] != null && day < ready[g]) pen += BIG_MUSCLE[g] ? 6 : 3;
      if (last[g] != null) { var gap = day - last[g]; if (gap < 2) pen += BIG_MUSCLE[g] ? 20 : 10; else if (gap < 3 && BIG_MUSCLE[g]) pen += 2; }
      last[g] = day;
    });
  });
  return pen;
}
function wkPermute(a) {
  if (a.length <= 1) return [a.slice()];
  var out = [], seen = {};
  a.forEach(function (x, i) { if (seen[x]) return; seen[x] = 1; wkPermute(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); });
  return out;
}
function wkDayTime(ws, day) { var d = new Date(ws); d.setDate(d.getDate() + day); d.setHours(9, 0, 0, 0); return d.getTime(); }
/* build the plan: days = [0..6] (Mon = 0) */
function wkBuild(ws, days, minutes) {
  days = days.slice().sort(function (a, b) { return a - b; });
  var W = realWorkouts(), rec = recoveryState(W, Date.now()), ready = {};
  GROUPS.forEach(function (g) { if (rec[g].readyH) { var t = Date.now() + rec[g].readyH * 3600e3; ready[g] = (t - ws) / DAY; } });
  var best = null, bp = Infinity;
  wkPermute(wkTemplate(days.length, days)).forEach(function (o) { var p = wkPenalty(o, days, ready); if (p < bp) { bp = p; best = o; } });
  var st = S.settings, plan = { ws: ws, minutes: minutes, days: {} }, hist = W.slice();
  (best || []).forEach(function (f, i) {
    var t = wkDayTime(ws, days[i]);
    var r = generateWorkout({ minutes: minutes, groups: WK_FOCUS[f], gear: gearList(), level: st.level, goal: st.goal, now: t }, hist, (t % 100003) + i + 1);
    plan.days[days[i]] = { f: f, t: t, items: r.items, est: r.estMin };
    // later days see the earlier planned ones as done, so exercises vary across the week
    hist = hist.concat([{ id: 'plan' + i, t: t, dur: minutes * 60, ex: r.items.map(function (it) { return { n: it.n, sets: [{ w: 0, r: it.lo }] }; }) }]);
  });
  return plan;
}
function wkPlan() { var p = S.settings.week; return p && p.ws === weekStart(Date.now()) ? p : (p && p.ws === weekStart(Date.now() + 7 * DAY) ? p : null); }
function wkDone(t) { var a = new Date(t).toDateString(); return realWorkouts().some(function (w) { return new Date(w.t).toDateString() === a; }); }
/* rest warnings for one day of the plan, e.g. "Chest: 1 day after Tue" */
function wkWarnings(p, day) {
  var me = p.days[day]; if (!me) return [];
  var out = [];
  Object.keys(p.days).forEach(function (k) {
    k = +k; if (k === day) return;
    var gap = Math.abs(day - k); if (gap >= 2) return;
    WK_FOCUS[p.days[k].f].forEach(function (g) { if (WK_FOCUS[me.f].indexOf(g) >= 0 && out.indexOf(g) < 0) out.push(g); });
  });
  return out;
}

/* ----- screens ----- */
var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function weekPlanCard() {
  var p = wkPlan(), ws = weekStart(Date.now()), today = Math.floor((Date.now() - ws) / DAY);
  if (!p) return '<div class="card section" style="gap:10px"><div class="row"><h2 class="grow" style="font-size:24px">Plan your week</h2></div><div class="note">Pick your training days and get a workout for each, ordered so every muscle gets 2–3 days of rest before you train it again.</div><button class="btn block" data-act="wkSetup">Plan my week</button></div>';
  var next = p.ws > ws;
  var rows = [0, 1, 2, 3, 4, 5, 6].map(function (i) {
    var dd = p.days[i], t = wkDayTime(p.ws, i), past = !next && i < today, isToday = !next && i === today, done = dd && wkDone(t);
    return '<button class="wkrow' + (isToday ? ' today' : '') + (past ? ' past' : '') + '" data-act="wkDay" data-i="' + i + '"' + (dd ? '' : ' disabled') + '><span class="wkd">' + WD[i] + '</span><span class="grow">' + (dd ? '<b>' + esc(dd.f) + '</b> · ' + dd.items.length + ' exercises · ~' + dd.est + ' min' : '<span class="faint">Rest</span>') + '</span>' + (done ? '<span class="tag p">✓ Done</span>' : isToday && dd ? '<span class="tag p">Today</span>' : '') + '</button>';
  }).join('');
  var td = !next && p.days[today] && !wkDone(wkDayTime(p.ws, today)) ? '<button class="btn primary block" data-act="wpStart" data-i="' + today + '" data-wk="1">Start today\'s ' + esc(p.days[today].f) + ' workout</button>' : '';
  return '<div class="card section" style="gap:10px"><div class="row"><h2 class="grow" style="font-size:24px">' + (next ? 'Next week' : 'This week') + '</h2><button class="btn small" data-act="wkSetup">Edit</button></div>' +
    '<div class="wklist">' + rows + '</div>' + td + '<div class="note">Each muscle gets at least 2 days of rest (3 for big muscles when the week allows).</div></div>';
}
function wkSetupSheet() {
  var p = wkPlan(), ws = weekStart(Date.now()), today = Math.floor((Date.now() - ws) / DAY);
  if (!U.wk) {
    var sel = p ? Object.keys(p.days).map(Number) : ({ 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] })[S.settings.weekGoal || 3];
    U.wk = { days: sel, next: p ? p.ws > ws : today >= 5, minutes: p ? p.minutes : S.settings.minutes };
  }
  var W = U.wk, base = W.next ? weekStart(Date.now() + 7 * DAY) : ws;
  var chips = WD.map(function (n, i) { var gone = !W.next && i < today; return '<button class="chip" aria-pressed="' + (W.days.indexOf(i) >= 0) + '" data-act="wkPick" data-i="' + i + '"' + (gone ? ' disabled' : '') + '>' + n + '</button>'; }).join('');
  var label = function (t) { var d = new Date(t); return MON[d.getMonth()] + ' ' + d.getDate(); };
  openSheet('Plan your week', '<div class="seg" role="group" aria-label="Which week"><button aria-pressed="' + !W.next + '" data-act="wkWhich" data-k="this">This week</button><button aria-pressed="' + W.next + '" data-act="wkWhich" data-k="next">Next week</button></div>' +
    '<div class="note">' + label(base) + ' to ' + label(base + 6 * DAY) + '</div>' +
    '<div><span class="field-label">Training days</span><div class="chips">' + chips + '</div></div>' +
    '<div><span class="field-label">Minutes per workout</span><div class="seg" role="group">' + [30, 45, 60, 75, 90].map(function (m) { return '<button aria-pressed="' + (W.minutes === m) + '" data-act="wkMin" data-v="' + m + '">' + m + '</button>'; }).join('') + '</div></div>' +
    '<div class="note">Uses your ' + profName().toLowerCase() + ' equipment and your ' + (GOALS[S.settings.goal] || GOALS.strength).n.toLowerCase() + ' goal. Workouts you already did recently are taken into account.</div>' +
    '<button class="btn primary block" data-act="wkMake"' + (W.days.length ? '' : ' disabled') + '>Make my plan</button>' +
    (p ? '<button class="btn block ghost danger" data-act="wkClear">Clear the plan</button>' : ''));
}
function wkDaySheet(i) {
  var p = wkPlan(); if (!p || !p.days[i]) return;
  var dd = p.days[i], warn = wkWarnings(p, i), t = wkDayTime(p.ws, i), d = new Date(t);
  U.wkDay = i;
  var rows = dd.items.map(function (it, k) { var ex = BYNAME[it.n]; return '<div class="plan-item"><button class="thumb" data-act="openEx" data-n="' + esc(it.n) + '">' + demoHTML(ex, false) + '</button><div class="grow"><div class="xname">' + esc(it.n) + '</div><div class="xmeta">' + it.sets + ' × ' + it.lo + '–' + it.hi + (isTimed(ex) ? ' s' : '') + ' · rest ' + fmtDur(it.rest) + '</div></div><button class="icon-btn" data-act="wkSwap" data-k="' + k + '" aria-label="Swap">' + ico('shuffle') + '</button></div>'; }).join('');
  openSheet(WD[i] + ' · ' + dd.f, '<div class="note">' + DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + ' · ~' + dd.est + ' min · ' + WK_FOCUS[dd.f].join(', ') + '</div>' +
    (warn.length ? '<div class="banner"><span>Only 1 day of rest for ' + esc(warn.join(', ')) + '. Consider moving this day.</span></div>' : '') +
    '<div><span class="field-label">Focus</span><div class="chips">' + Object.keys(WK_FOCUS).map(function (f) { return '<button class="chip" aria-pressed="' + (f === dd.f) + '" data-act="wkFocus" data-f="' + esc(f) + '">' + esc(f) + '</button>'; }).join('') + '</div></div>' +
    '<div class="card" style="padding:0 14px">' + rows + '</div>' +
    '<button class="btn primary block" data-act="wpStart" data-i="' + i + '">Start this workout</button>' +
    '<div class="row"><button class="btn grow" data-act="wkRedo">Shuffle exercises</button><button class="btn grow" data-act="wkLoad">Edit in builder</button></div>');
}
function wkRegen(i, focus) {
  var p = wkPlan(), dd = p.days[i], st = S.settings, t = wkDayTime(p.ws, i);
  var r = generateWorkout({ minutes: p.minutes, groups: WK_FOCUS[focus], gear: gearList(), level: st.level, goal: st.goal, now: t }, realWorkouts(), (Date.now() % 100003) + 1);
  p.days[i] = { f: focus, t: t, items: r.items, est: r.estMin };
  persist({ settings: true });
}
function plannerClick(a, d) {
  if (a === 'wkSetup') { U.wk = null; wkSetupSheet(); return true; }
  if (a === 'wkPick') { var i = +d.i, k = U.wk.days.indexOf(i); if (k >= 0) U.wk.days.splice(k, 1); else U.wk.days.push(i); wkSetupSheet(); return true; }
  if (a === 'wkWhich') { U.wk.next = d.k === 'next'; if (!U.wk.next) { var td = Math.floor((Date.now() - weekStart(Date.now())) / DAY); U.wk.days = U.wk.days.filter(function (x) { return x >= td; }); } wkSetupSheet(); return true; }
  if (a === 'wkMin') { U.wk.minutes = +d.v; wkSetupSheet(); return true; }
  if (a === 'wkMake') {
    var ws = U.wk.next ? weekStart(Date.now() + 7 * DAY) : weekStart(Date.now());
    S.settings.week = wkBuild(ws, U.wk.days, U.wk.minutes); U.wk = null;
    persist({ settings: true }); closeSheet(); render(); toast('Week planned'); return true;
  }
  if (a === 'wkClear') { S.settings.week = null; U.wk = null; persist({ settings: true }); closeSheet(); render(); return true; }
  if (a === 'wkDay') { wkDaySheet(+d.i); return true; }
  if (a === 'wkFocus') { wkRegen(U.wkDay, d.f); wkDaySheet(U.wkDay); render(); return true; }
  if (a === 'wkRedo') { wkRegen(U.wkDay, wkPlan().days[U.wkDay].f); wkDaySheet(U.wkDay); render(); return true; }
  if (a === 'wkSwap') {
    var p = wkPlan(), dd = p.days[U.wkDay], it = dd.items[+d.k], st = S.settings;
    var n = swapExercise({ minutes: p.minutes, groups: WK_FOCUS[dd.f], gear: gearList(), level: st.level, goal: st.goal }, dd.items, it, realWorkouts(), Date.now() % 9973);
    if (n) { dd.items[+d.k] = n; persist({ settings: true }); wkDaySheet(U.wkDay); } else toast('No other matching exercise.');
    return true;
  }
  if (a === 'wkLoad') { var dd2 = wkPlan().days[U.wkDay]; U.plan = { items: dd2.items.map(function (x) { return Object.assign({}, x); }), estMin: dd2.est, short: false }; closeSheet(); U.tab = 'train'; render(); var pl = $('.plan-item'); if (pl) pl.scrollIntoView({ block: 'center' }); return true; }
  if (a === 'wpStart' && wkPlan()) {
    if (S.draft) { toast('Finish or discard the current workout first.'); return true; }
    var dd3 = wkPlan().days[+d.i]; if (!dd3) return true;
    closeSheet(); newDraft(dd3.items); render(); window.scrollTo(0, 0); return true;
  }
  return false;
}
