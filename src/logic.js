/* ===== Pure logic: no DOM here, so it can be tested in Node ===== */
var DATA = __DATA__;
var EX = DATA.ex;
var BYNAME = {};
EX.forEach(function (e, i) { e.id = i; e.eq = (e.q === 'body only' || e.q === 'none') ? 'Bodyweight' : e.q; e.gear = (e.e && e.e.length) ? e.e : ['bodyweight']; BYNAME[e.n] = e; });
var ITEMS = DATA.items, ITEM_BY = {};
ITEMS.forEach(function (it) { ITEM_BY[it.id] = it; });
var ITEM_GROUPS = ['Bodyweight & bars', 'Free weights', 'Benches & racks', 'Cables', 'Machines', 'Small gear'];
var GYM_GEAR = ITEMS.map(function (it) { return it.id; });
var HOME_GEAR = ['bodyweight', 'pullup_bar', 'dumbbell', 'bench', 'bands', 'kettlebell', 'foam_roller', 'stability_ball'];
function gearMap(list) { var m = {}; (list || []).forEach(function (g) { m[g] = 1; }); return m; }
function available(e, gm) { for (var i = 0; i < e.gear.length; i++) if (!gm[e.gear[i]]) return false; return true; }
function gearNames(e) { return e.gear.map(function (g) { return ITEM_BY[g] ? ITEM_BY[g].n : g; }); }

var GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];
var GROUP_ORDER = ['Quads', 'Back', 'Chest', 'Hamstrings', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Calves', 'Forearms', 'Core'];
var PRESETS = [
  { n: 'Push', g: ['Chest', 'Shoulders', 'Triceps'] },
  { n: 'Pull', g: ['Back', 'Biceps', 'Forearms'] },
  { n: 'Legs', g: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  { n: 'Upper', g: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] },
  { n: 'Full body', g: ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Core'] }
];
var EQUIP_LABEL = { dumbbell: 'Dumbbell', Bodyweight: 'Bodyweight', barbell: 'Barbell', cable: 'Cable', machine: 'Machine', kettlebells: 'Kettlebell', bands: 'Bands', 'e-z curl bar': 'EZ bar', 'medicine ball': 'Med ball', 'exercise ball': 'Stability ball', 'foam roll': 'Foam roller', other: 'Other' };
var CATS = { strength: 'Strength', powerlifting: 'Powerlifting', 'olympic weightlifting': 'Olympic', strongman: 'Strongman', plyometrics: 'Plyometric', stretching: 'Stretching', cardio: 'Cardio' };
var LEVEL_RANK = { beginner: 1, intermediate: 2, expert: 3 };
var GOALS = {
  strength: { n: 'Strength', cLo: 5, cHi: 8, cSets: 3, cRest: 120, aLo: 8, aHi: 12, aSets: 3, aRest: 75 },
  size: { n: 'Size', cLo: 8, cHi: 12, cSets: 3, cRest: 90, aLo: 10, aHi: 15, aSets: 3, aRest: 60 },
  lean: { n: 'Lean', cLo: 10, cHi: 15, cSets: 3, cRest: 60, aLo: 12, aHi: 20, aSets: 3, aRest: 45 }
};
var LB = 2.20462;
var ISO_NAME = /fly|flye|raise|curl|extension|kickback|shrug|crunch|calf|wrist|side bend|pullover|pushdown/i;
function isComp(e) { return e.m === 'compound' && !ISO_NAME.test(e.n); }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function round1(v) { return Math.round(v * 10) / 10; }

/* ---------- units ---------- */
function toDisp(lb, unit) { if (lb == null || lb === '') return ''; var v = unit === 'kg' ? lb / LB : lb; return String(Math.round(v * 2) / 2); }
function fromDisp(txt, unit) { var v = parseFloat(String(txt).replace(',', '.')); if (isNaN(v)) return null; return unit === 'kg' ? v * LB : v; }
function fmtW(lb, unit) { if (!lb) return '0'; return toDisp(lb, unit); }

/* ---------- strength metric ---------- */
function isBW(ex) { return ex && ex.eq === 'Bodyweight'; }
/* weighted bodyweight work: added weight is turned into "bodyweight-equivalent reps" so a vest, belt or plate counts.
   BW_FRAC is roughly how much of your bodyweight each movement moves. */
var BW_FRAC = { pullup: 1, dip: 0.95, pushup: 0.65, situp: 0.35, calfbw: 1, hangleg: 0.35 };
var metricBW = function () { return 0; };   // the UI points this at the current body weight (lb)
function bwFrac(ex) { var k = parseK(ex && ex.k); return (k && BW_FRAC[k.cls]) || 0.6; }
function bwEqReps(ex, w, r) { var B = metricBW(); if (!(w > 0) || !(B > 0)) return r; var base = bwFrac(ex) * B; return Math.min(300, 30 * w / base + r * (base + w) / base); }
function repsAtLoad(ex, eqReps, w) { var B = metricBW(); if (!(w > 0) || !(B > 0)) return eqReps; var base = bwFrac(ex) * B; return (eqReps - 30 * w / base) * base / (base + w); }
function setMetric(ex, s) {
  var r = +s.r || 0, w = +s.w || 0;
  if (r <= 0) return 0;
  if (isBW(ex)) return w > 0 ? bwEqReps(ex, w, r) : r;   // bodyweight work is tracked in (equivalent) reps
  if (w <= 0) return 0;
  return w * (1 + Math.min(r, 15) / 30);   // Epley estimated 1RM
}
function sessionBest(ex, sets) {
  var b = 0;
  for (var i = 0; i < sets.length; i++) { var m = setMetric(ex, sets[i]); if (m > b) b = m; }
  return b;
}
/* history: [{t, best, vol, topW, topR}] for an exercise, oldest first */
function exHistory(workouts, name) {
  var ex = BYNAME[name], out = [];
  workouts.forEach(function (w) {
    w.ex.forEach(function (e) {
      if (e.n !== name) return;
      var best = sessionBest(ex, e.sets);
      if (!best) return;
      var vol = 0, topW = 0, topR = 0;
      e.sets.forEach(function (s) { vol += (+s.w || 0) * (+s.r || 0); if ((+s.w || 0) > topW || ((+s.w || 0) === topW && (+s.r || 0) > topR)) { topW = +s.w || 0; topR = +s.r || 0; } });
      out.push({ t: w.t, best: best, vol: vol, topW: topW, topR: topR });
    });
  });
  out.sort(function (a, b) { return a.t - b.t; });
  return out;
}
function allHistories(workouts) {
  var names = {}, res = {};
  workouts.forEach(function (w) { w.ex.forEach(function (e) { names[e.n] = 1; }); });
  Object.keys(names).forEach(function (n) { if (BYNAME[n]) { var h = exHistory(workouts, n); if (h.length) res[n] = h; } });
  return res;
}
var DAY = 86400000;
/* index of an exercise at time t: current strength / first-session strength, as a percentage */
function exIndexAt(h, t) {
  var cur = null, i, last = -1;
  for (i = 0; i < h.length; i++) if (h[i].t <= t) last = i;
  if (last < 0) return null;
  var best = 0;
  for (i = 0; i <= last; i++) if (h[i].t >= h[last].t - 28 * DAY && h[i].best > best) best = h[i].best;
  var base = h[0].best;
  if (!base) return null;
  return { idx: clamp(best / base * 100, 40, 300), n: last + 1 };
}
/* muscle group score at time t from histories */
function groupScoreAt(hists, group, t) {
  var num = 0, den = 0, cnt = 0;
  Object.keys(hists).forEach(function (n) {
    var ex = BYNAME[n]; if (!ex) return;
    var w = ex.p.indexOf(group) >= 0 ? 1 : (ex.s.indexOf(group) >= 0 ? 0.35 : 0);
    if (!w) return;
    var r = exIndexAt(hists[n], t); if (!r) return;
    var ww = w * Math.min(r.n, 4);
    num += r.idx * ww; den += ww; cnt++;
  });
  return den ? { score: num / den, n: cnt } : null;
}
function groupSeries(hists, group, endT, weeks) {
  var pts = [];
  for (var k = weeks; k >= 0; k--) {
    var t = endT - k * 7 * DAY;
    var g = groupScoreAt(hists, group, t);
    if (g) pts.push({ t: t, v: g.score });
  }
  return pts;
}
function overallScore(hists, t) {
  var tot = 0, n = 0;
  GROUPS.forEach(function (g) { var s = groupScoreAt(hists, g, t); if (s) { tot += s.score; n++; } });
  return n ? tot / n : null;
}

/* ---------- progression ---------- */
function lastSession(workouts, name) {
  for (var i = workouts.length - 1; i >= 0; i--) {
    var w = workouts[i];
    for (var j = 0; j < w.ex.length; j++) if (w.ex[j].n === name && w.ex[j].sets.length) return { w: w, e: w.ex[j] };
  }
  return null;
}
function incrementLb(ex, unit) { return unit === 'kg' ? 2.5 * LB : 5; }
/* suggested starting weight (lb) and reps for next time */
function suggest(workouts, name, lo, hi, unit) {
  var ex = BYNAME[name], ls = lastSession(workouts, name);
  if (!ls) return { w: isBW(ex) ? 0 : null, r: lo };
  var sets = ls.e.sets, top = 0;
  sets.forEach(function (s) { if ((+s.w || 0) > top) top = +s.w || 0; });
  var atTop = sets.filter(function (s) { return (+s.w || 0) === top; });
  if (isBW(ex)) { var mr = 0; sets.forEach(function (s) { mr = Math.max(mr, +s.r || 0); }); return { w: top || 0, r: Math.max(lo, mr) }; }
  var allHit = atTop.length >= 2 && atTop.every(function (s) { return (+s.r || 0) >= hi; });
  if (allHit) return { w: top + incrementLb(ex, unit), r: lo };
  var reps = atTop.length ? Math.min.apply(null, atTop.map(function (s) { return +s.r || lo; })) : lo;
  return { w: top, r: clamp(reps + (reps < hi ? 1 : 0), lo, hi) };
}

/* ---------- workout generator ---------- */
var ENAME_WORDS = /\b(dumbbell|barbell|cable|machine|kettlebell|band|bands|ez|e-z|bar|smith|one|arm|two|alternate|alternating|seated|standing|lying|incline|decline|flat|with|on|the|a|an|and|to)\b/g;
function nameKey(n) {
  return n.toLowerCase().replace(/[^a-z ]/g, ' ').replace(ENAME_WORDS, ' ').split(/\s+/).filter(Boolean);
}
function similar(a, b) {
  var ka = nameKey(a), kb = nameKey(b); if (!ka.length || !kb.length) return false;
  var inter = ka.filter(function (x) { return kb.indexOf(x) >= 0; }).length;
  return inter / Math.max(ka.length, kb.length) >= 0.6;
}
function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
function exTimeSec(sets, rest, work) { return sets * (work + rest) + 45; }

var WEIRD = /clean|snatch|jerk|iron cross|spell caster|crucifix|manual|bear crawl|\bjump|\bbound|sprint|drag|atlas|axle|log lift|tire|stone|yoke|farmer|conan|circus|dynamic|handstand|muscle.?up|clap|assisted|windmill|turkish|twist|rotation|pull.?over|\bpullover|pronation|supination|bent.?knee hip|leg lift|butt lift|spiderman|scorpion|frog|jackknife|pass|toss|throw|slam|wrestler|hanging|roll|v-sit|dead bug|gorilla|flutter|clock|hyperextension|reverse triceps bench|rear delt row|kneeling squat|cable lift|cocoon|one-legged|scapular|rocky|anti-gravity|bench press - with bands|v-bar pullup|wide-grip rear|guillotine|reverse band|calf-machine shoulder|middle back shrug|behind the back/i;
var CLASSIC = /\b(bench press|incline dumbbell press|barbell squat|goblet squat|leg press|romanian deadlift|barbell deadlift|pulldown|pullups|chin-up|bent over barbell row|one-arm dumbbell row|bent over two-dumbbell row|seated cable rows|shoulder press|military press|side lateral raise|pushdown|barbell curl|dumbbell bicep curl|hammer curls|leg curl|leg extensions|calf raise|hip thrust|crunches|cable crunch|lunges|face pull|cable crossover|butterfly|chest press|hack squat|pushups|dumbbell flyes|skullcrusher|ez-bar curl|dips)/i;
function famKey(n) {
  n = n.toLowerCase();
  if (/pull-?ups?|chin-?ups?|pullups|chinups/.test(n)) return 'pullup';
  if (/push-?ups?|pushups/.test(n)) return 'pushup';
  if (/crunch|sit-?up|v-up/.test(n)) return 'crunch';
  if (/wrist/.test(n)) return 'wrist';
  if (/leg curl|hamstring curl/.test(n)) return 'legcurl';
  if (/curl/.test(n)) return 'curl';
  if (/calf/.test(n)) return 'calf';
  if (/squat/.test(n)) return 'squat';
  if (/deadlift/.test(n)) return 'deadlift';
  if (/lunge|split squat|step.?up/.test(n)) return 'lunge';
  if (/\brow\b|rows\b/.test(n)) return 'row';
  if (/raise/.test(n)) return 'raise';
  if (/fly|flye|crossover|butterfly/.test(n)) return 'fly';
  if (/pulldown|pull-down/.test(n)) return 'pulldown';
  if (/bench press|chest press|floor press/.test(n)) return 'bench';
  if (/shoulder press|military|overhead press/.test(n)) return 'ohp';
  if (/extension|skull|pushdown|kickback/.test(n)) return 'tri';
  if (/shrug/.test(n)) return 'shrug';
  if (/thrust|bridge/.test(n)) return 'bridge';
  return null;
}
var STAPLE = /bench press|shoulder press|overhead press|military press|incline (dumbbell )?press|row|squat|lunge|deadlift|romanian|curl|lateral raise|front raise|rear delt|flye|fly\b|extension|kickback|push.?up|pushup|pull.?up|pullup|chin.?up|dip|shrug|crunch|plank|hip thrust|glute bridge|calf raise|pulldown|step.?up|good morning|skull|press$/i;
function candidatePool(opts) {
  var gm = gearMap(opts.gear);
  var maxL = LEVEL_RANK[opts.level] || 2;
  return EX.filter(function (e) {
    if (e.c !== 'strength' && e.c !== 'powerlifting') return false;
    if (!available(e, gm)) return false;
    if (e.gear.indexOf('other_gear') >= 0 || e.gear.indexOf('cardio') >= 0) return false;
    if ((LEVEL_RANK[e.l] || 2) > maxL) return false;
    if (WEIRD.test(e.n)) return false;
    if (e.gear.length === 1 && e.gear[0] === 'bodyweight') { var txt = e.i.join(' ').toLowerCase(); if (!gm.smith && /smith machine/.test(txt)) return false; if (!gm.cable && /pulley|cable/.test(txt)) return false; if (!gm.barbell && /barbell|power rack|squat rack/.test(txt)) return false; }
    return e.p.some(function (g) { return opts.groups.indexOf(g) >= 0; });
  });
}
function generateWorkout(opts, workouts, seed) {
  var G = GOALS[opts.goal] || GOALS.strength, R = rng(seed || 1);
  var groups = GROUP_ORDER.filter(function (g) { return opts.groups.indexOf(g) >= 0; });
  var pool = candidatePool(opts);
  var hist = allHistories(workouts);
  var budget = opts.minutes * 60 - (opts.minutes >= 30 ? 240 : 120);
  var chosen = [], counts = {}, used = 0;
  groups.forEach(function (g) { counts[g] = 0; });
  function weightOf(e, g, wantCompound) {
    var s = R() * 2.2;
    if (hist[e.n]) s += 0.9;
    if (wantCompound) s += isComp(e) ? 2.5 : 0; else s += !isComp(e) ? 1 : 0;
    if (e.p[0] === g) s += 1.2;
    if (STAPLE.test(e.n)) s += 2.2;
    if (CLASSIC.test(e.n)) s += 2.5;
    if (e.q === 'bands') s -= 1.2;
    if (e.p.length > 3) s -= 1.5;
    return s;
  }
  function plan(e, wantCompound) {
    var comp = isComp(e) && wantCompound, bw = isBW(e);
    return { n: e.n, sets: comp ? G.cSets : G.aSets, lo: bw ? Math.max(10, comp ? G.cLo : G.aLo) : (comp ? G.cLo : G.aLo), hi: bw ? Math.max(15, comp ? G.cHi : G.aHi) : (comp ? G.cHi : G.aHi), rest: comp ? G.cRest : G.aRest, comp: comp, g: null };
  }
  var maxEx = clamp(Math.round(opts.minutes / 7.5), 2, 9), guard = 0;
  while (guard++ < 60 && chosen.length < maxEx) {
    // pick the group with the fewest picks (ties follow the size order)
    var g = groups.slice().sort(function (a, b) { return counts[a] - counts[b] || groups.indexOf(a) - groups.indexOf(b); })[0];
    var wantCompound = counts[g] === 0 || (counts[g] === 1 && R() < 0.35);
    var cands = pool.filter(function (e) {
      if (e.p.indexOf(g) < 0) return false;
      if (chosen.some(function (c) { return c.n === e.n || similar(c.n, e.n); })) return false;
      var fk = famKey(e.n); if (fk && chosen.filter(function (c) { return famKey(c.n) === fk; }).length >= (fk === 'shrug' ? 1 : 2)) return false;
      return true;
    });
    if (!cands.length) { counts[g] += 99; if (groups.every(function (x) { return counts[x] >= 99; })) break; continue; }
    cands.sort(function (a, b) { return weightOf(b, g, wantCompound) - weightOf(a, g, wantCompound); });
    var e = cands[0], p = plan(e, wantCompound); p.g = g;
    var t = exTimeSec(p.sets, p.rest, 40);
    if (used + t > budget) {
      // try a smaller version, otherwise stop
      p.sets = 2; t = exTimeSec(2, p.rest, 40);
      if (used + t > budget && chosen.length) { counts[g] += 99; if (groups.every(function (x) { return counts[x] >= 99; })) break; continue; }
    }
    chosen.push(p); used += t;
    e.p.forEach(function (pg) { if (counts[pg] != null && counts[pg] < 99) counts[pg] += (pg === g ? 1 : 0.5); });
  }
  // fill remaining time by adding a set to compounds, then accessories
  var guard2 = 0;
  while (guard2++ < 30 && chosen.length) {
    var left = budget - used, added = false;
    for (var i = 0; i < chosen.length; i++) {
      var c = chosen[i], per = 40 + c.rest, max = c.comp ? 5 : 4;
      if (c.sets < max && left >= per) { c.sets++; used += per; left -= per; added = true; }
    }
    if (!added) break;
  }
  // order: compounds first, then by group size order
  chosen.sort(function (a, b) {
    return (b.comp ? 1 : 0) - (a.comp ? 1 : 0) || GROUP_ORDER.indexOf(a.g) - GROUP_ORDER.indexOf(b.g);
  });
  var core = chosen.filter(function (c) { return c.g === 'Core'; });
  chosen = chosen.filter(function (c) { return c.g !== 'Core'; }).concat(core);
  var secs = 0; chosen.forEach(function (c) { secs += exTimeSec(c.sets, c.rest, 40); });
  var est = Math.round((secs + (opts.minutes >= 30 ? 240 : 120)) / 60);
  return { items: chosen, estMin: est, short: est < opts.minutes * 0.7 };
}
function swapExercise(opts, current, item, workouts, seed) {
  var R = rng(seed || 7), pool = candidatePool(opts);
  var g = item.g || opts.groups[0];
  var cands = pool.filter(function (e) {
    return e.p.indexOf(g) >= 0 && !current.some(function (c) { return c.n === e.n || similar(c.n, e.n); });
  });
  if (!cands.length) return null;
  var hasHist = {}; workouts.forEach(function (w) { w.ex.forEach(function (x) { hasHist[x.n] = 1; }); });
  var best = null, bs = -1;
  cands.forEach(function (e) {
    var s = R() * 2 + (item.comp ? (isComp(e) ? 1.5 : 0) : (!isComp(e) ? 1 : 0)) + (hasHist[e.n] ? 0.5 : 0);
    if (s > bs) { bs = s; best = e; }
  });
  return { n: best.n, sets: item.sets, lo: item.lo, hi: item.hi, rest: item.rest, comp: item.comp && best.m === 'compound', g: g };
}

/* ---------- building a live workout from a plan ---------- */
function makeWorkoutEx(workouts, item, unit) {
  var sg = suggest(workouts, item.n, item.lo, item.hi, unit);
  var sets = [];
  for (var i = 0; i < item.sets; i++) sets.push({ w: sg.w, r: sg.r, done: false, sug: true });
  return { n: item.n, lo: item.lo, hi: item.hi, rest: item.rest, sets: sets };
}
function defaultItem(name, goal) {
  var e = BYNAME[name], G = GOALS[goal] || GOALS.strength, comp = e && isComp(e), bw = e && isBW(e);
  return { n: name, sets: comp ? G.cSets : G.aSets, lo: bw ? Math.max(10, comp ? G.cLo : G.aLo) : (comp ? G.cLo : G.aLo), hi: bw ? Math.max(15, comp ? G.cHi : G.aHi) : (comp ? G.cHi : G.aHi), rest: comp ? G.cRest : G.aRest, comp: comp, g: e && e.p[0] };
}

/* ---------- finishing: turn a draft into a saved workout ---------- */
function finishDraft(draft, now) {
  var ex = [];
  draft.ex.forEach(function (e) {
    var sets = e.sets.filter(function (s) { return s.done && !s.wu && (+s.r > 0); }).map(function (s) { return { w: +s.w || 0, r: +s.r || 0 }; });
    if (sets.length) ex.push({ n: e.n, sets: sets });
  });
  return { id: draft.id, t: draft.t, dur: Math.max(60, Math.round((now - draft.t) / 1000)), ex: ex };
}
function workoutVolume(w) { var v = 0; w.ex.forEach(function (e) { e.sets.forEach(function (s) { v += (+s.w || 0) * (+s.r || 0); }); }); return v; }
function workoutSets(w) { var n = 0; w.ex.forEach(function (e) { n += e.sets.length; }); return n; }
function findPRs(prior, w) {
  var res = [];
  w.ex.forEach(function (e) {
    var ex = BYNAME[e.n], h = exHistory(prior, e.n), best = sessionBest(ex, e.sets), prev = 0;
    h.forEach(function (x) { if (x.best > prev) prev = x.best; });
    if (best > 0 && prev > 0 && best > prev * 1.0001) res.push({ n: e.n, best: best, prev: prev });
  });
  return res;
}
function groupsHit(w) {
  var s = {};
  w.ex.forEach(function (e) { var x = BYNAME[e.n]; if (x) x.p.forEach(function (g) { s[g] = 1; }); });
  return GROUPS.filter(function (g) { return s[g]; });
}

/* ---------- example history shown until the first real workout ---------- */
function sampleWorkouts(now) {
  var plans = [
    { day: 0, ex: [['Dumbbell Bench Press', 55, 8], ['Seated Dumbbell Press', 35, 8], ['Side Lateral Raise', 15, 12], ['Tricep Dumbbell Kickback', 15, 12], ['Crunches', 0, 20]] },
    { day: 2, ex: [['One-Arm Dumbbell Row', 60, 10], ['Bent Over Two-Dumbbell Row', 45, 10], ['Dumbbell Bicep Curl', 25, 10], ['Hammer Curls', 25, 10]] },
    { day: 4, ex: [['Goblet Squat', 55, 10], ['Romanian Deadlift', 95, 10], ['Dumbbell Lunges', 30, 10], ['Standing Dumbbell Calf Raise', 55, 15]] }
  ];
  var out = [], weeks = 10, wk, p, start = now - weeks * 7 * DAY;
  for (wk = 0; wk < weeks; wk++) {
    for (p = 0; p < plans.length; p++) {
      var t = start + (wk * 7 + plans[p].day) * DAY + 17 * 3600000;
      if (t > now) continue;
      if ((wk * 3 + p) % 11 === 5) continue;
      var ex = plans[p].ex.map(function (x, i) {
        var bw = x[1] === 0, step = x[1] <= 25 ? 5 : 4;
        var w = bw ? 0 : x[1] + 5 * Math.floor(wk / step);
        var dip = ((wk + i + p) % 5 === 4) ? -5 : 0;
        var sets = [];
        for (var s = 0; s < 3; s++) {
          var r = bw ? x[2] + Math.floor(wk / 2) - s : x[2] + (wk % 4 === 3 ? 1 : 0) - (s === 2 ? 1 : 0);
          sets.push({ w: bw ? 0 : Math.max(5, w + dip), r: r });
        }
        return { n: x[0], sets: sets };
      });
      out.push({ id: 'sample' + wk + p, t: t, dur: 3000 + ((wk * 7 + p) % 5) * 300, ex: ex, sample: true });
    }
  }
  return out;
}


/* ---------- body profile & rank (1-100 vs people with your height, weight and sex) ---------- */
var CLASS_NAME = { bench: 'Bench press', squat: 'Squat', deadlift: 'Deadlift', ohp: 'Overhead press', incline: 'Incline bench press', frontsquat: 'Front squat', rdl: 'Romanian deadlift', hipthrust: 'Hip thrust', bbrow: 'Barbell row', bbcurl: 'Barbell curl', bbshrug: 'Barbell shrug', dbbench: 'Dumbbell bench press', dbpress: 'Dumbbell shoulder press', dbcurl: 'Dumbbell curl', hammer: 'Hammer curl', dbtri: 'Dumbbell triceps extension', dbfly: 'Dumbbell fly', dbshrug: 'Dumbbell shrug', dbfront: 'Dumbbell front raise', dblat: 'Lateral raise', dbrow: 'Dumbbell row', dblunge: 'Dumbbell lunge', pulldown: 'Lat pulldown', cablerow: 'Seated cable row', pushdown: 'Triceps pushdown', legpress: 'Leg press', hack: 'Hack squat', chestpress: 'Chest press machine', legcurl: 'Leg curl', legext: 'Leg extension', calfmach: 'Weighted calf raise', cablecrunch: 'Cable crunch', wristcurl: 'Wrist curl', pullup: 'Pull-ups', pushup: 'Push-ups', dip: 'Dips', situp: 'Sit-ups', calfbw: 'Bodyweight calf raise', hangleg: 'Hanging leg raise' };
var Z5 = [-1.6449, -0.8416, 0, 0.8416, 1.6449];
function normCdf(z) {
  var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function parseK(k) { if (!k) return null; var a = String(k).split('*'); return { cls: a[0], m: a[1] ? +a[1] : 1 }; }
function ft2cm(ft, inch) { return ((+ft || 0) * 12 + (+inch || 0)) * 2.54; }
function cm2ftin(cm) { var tot = Math.round(cm / 2.54); return { ft: Math.floor(tot / 12), inch: tot % 12 }; }
/* the stats entered in Settings: sex 'M'|'F', height in cm, weigh-in log [{t, w(lb)}] */
function bodyReady(b) { return !!(b && (b.sex === 'M' || b.sex === 'F') && b.h > 90 && curWeightLb(b)); }
function curWeightLb(b) { if (!b) return 0; if (b.log && b.log.length) return b.log[b.log.length - 1].w; return +b.w || 0; }
function bwAt(b, t) {
  var log = b.log || [];
  if (!log.length) return +b.w || 0;
  var v = log[0].w;
  for (var i = 0; i < log.length; i++) if (log[i].t <= t) v = log[i].w;
  return v;
}
/* Boer lean-mass estimate; modest adjustment of effective bodyweight for height */
function effBW(sex, hCm, wLb) {
  var w = wLb / LB, lbm = function (W) { return sex === 'M' ? 0.407 * W + 0.267 * hCm - 19.2 : 0.252 * W + 0.473 * hCm - 48.3; };
  var wt = (sex === 'M' ? 25.5 : 23.5) * Math.pow(hCm / 100, 2);
  var f = lbm(w) / w, ft = lbm(wt) / wt;
  var fac = clamp(Math.pow(f / ft, 0.7), 0.88, 1.1);
  return wLb * fac;
}
/* standard anchors (Beginner..Elite = 5/20/50/80/95th percentile) for a lift at a bodyweight, log-log interpolated */
function stdAt(cls, sex, bw) {
  var st = DATA.std[cls]; if (!st) return null;
  var rows = st[sex], keys = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
  var x = Math.log(clamp(bw, keys[0] * 0.7, keys[2] * 1.5)), xs = keys.map(Math.log), out = [];
  for (var i = 0; i < 5; i++) {
    var ys = keys.map(function (k) { return Math.log(Math.max(rows[k][i], 0.3)); });
    var j = x <= xs[1] ? 0 : 1;
    var y = ys[j] + (ys[j + 1] - ys[j]) * (x - xs[j]) / (xs[j + 1] - xs[j]);
    out.push(Math.exp(y));
  }
  for (i = 1; i < 5; i++) if (out[i] <= out[i - 1]) out[i] = out[i - 1] * 1.02;
  return out;
}
/* z-score (rank among peers) of performance v against the anchors */
function zOf(a, v) {
  if (!(v > 0)) return -3;
  var lv = Math.log(v), la = a.map(function (x, i) { return Math.log(x) + i * 0.004; }), i;
  if (lv <= la[0]) return Math.max(-3, Z5[0] - (la[0] - lv) / (la[1] - la[0]) * (Z5[1] - Z5[0]));
  if (lv >= la[4]) return Math.min(3, Z5[4] + (lv - la[4]) / (la[4] - la[3]) * (Z5[4] - Z5[3]));
  for (i = 0; i < 4; i++) if (lv <= la[i + 1]) return Z5[i] + (lv - la[i]) / (la[i + 1] - la[i]) * (Z5[i + 1] - Z5[i]);
  return 0;
}
function pctOfZ(z) { return normCdf(z) * 100; }
function scoreOfZ(z) { return clamp(Math.round(pctOfZ(z)), 1, 100); }
function tierOf(score) { return score >= 95 ? 'Elite' : score >= 80 ? 'Advanced' : score >= 50 ? 'Intermediate' : score >= 20 ? 'Novice' : 'Beginner'; }
/* rank of one exercise at time t (best set of the trailing 28 days), or null if it has no standard */
function exerciseRank(name, h, B, t) {
  var ex = BYNAME[name], k = ex && parseK(ex.k); if (!k || !DATA.std[k.cls] || !B) return null;
  var last = -1, i, best = 0;
  for (i = 0; i < h.length; i++) if (h[i].t <= t) last = i;
  if (last < 0) return null;
  for (i = 0; i <= last; i++) if (h[i].t >= h[last].t - 28 * DAY && h[i].best > best) best = h[i].best;
  var bw = bwAt(B, t); if (!bw) return null;
  var a = stdAt(k.cls, B.sex, effBW(B.sex, B.h, bw)); if (!a) return null;
  var z = zOf(a, best / k.m);
  return { z: z, pct: pctOfZ(z), score: scoreOfZ(z), est: !!ex.ke, cls: k.cls, n: last + 1, eq: best / k.m, anchors: a };
}
function groupRankAt(hists, group, B, t) {
  var num = 0, den = 0, cnt = 0;
  Object.keys(hists).forEach(function (n) {
    var ex = BYNAME[n]; if (!ex) return;
    var w = ex.p.indexOf(group) >= 0 ? 1 : (ex.s.indexOf(group) >= 0 ? 0.35 : 0); if (!w) return;
    var r = exerciseRank(n, hists[n], B, t); if (!r) return;
    var ww = w * Math.min(r.n, 4) * (r.est ? 0.6 : 1);
    num += r.z * ww; den += ww; cnt++;
  });
  if (!den) return null;
  var z = num / den;
  return { z: z, pct: pctOfZ(z), score: scoreOfZ(z), n: cnt };
}
function groupRankSeries(hists, group, B, endT, weeks) {
  var pts = [];
  for (var k = weeks; k >= 0; k--) { var t = endT - k * 7 * DAY, g = groupRankAt(hists, group, B, t); if (g) pts.push({ t: t, v: g.pct }); }
  return pts;
}
function overallRankAt(hists, B, t) {
  var tot = 0, n = 0;
  GROUPS.forEach(function (g) { var r = groupRankAt(hists, g, B, t); if (r) { tot += r.z; n++; } });
  if (!n) return null;
  var z = tot / n;
  return { z: z, pct: pctOfZ(z), score: scoreOfZ(z), groups: n };
}


/* ---------- recovery: which muscles are tired, which are fresh ---------- */
var REC_BASE = { Chest: 72, Back: 72, Quads: 72, Hamstrings: 72, Glutes: 72, Shoulders: 48, Biceps: 48, Triceps: 48, Forearms: 36, Calves: 36, Core: 36 };
function recLoads(w) {
  var L = {};
  w.ex.forEach(function (e) {
    var x = BYNAME[e.n]; if (!x) return;
    GROUPS.forEach(function (g) {
      var wt = x.p.indexOf(g) >= 0 ? 1 : (x.s.indexOf(g) >= 0 ? 0.4 : 0);
      if (wt) L[g] = (L[g] || 0) + wt * e.sets.length;
    });
  });
  return L;
}
/* fatigue 0..1 per group at time t: each workout leaves fatigue that fades over a recovery window scaled by how much work was done */
function fatigueAt(workouts, g, t) {
  var f = 0;
  workouts.forEach(function (w) {
    var end = w.t + (w.dur || 3600) * 1000; if (end > t || t - end > 7 * DAY) return;
    var load = recLoads(w)[g]; if (!load) return;
    var need = REC_BASE[g] * clamp(0.55 + 0.1 * load, 0.55, 1.5);
    f += Math.max(0, 1 - ((t - end) / 3600000) / need);
  });
  return Math.min(1, f);
}
function recoveryState(workouts, now) {
  var res = {};
  GROUPS.forEach(function (g) {
    var f = fatigueAt(workouts, g, now), last = null, sets = 0;
    workouts.forEach(function (w) { var l = recLoads(w)[g]; if (l && w.t <= now && (last == null || w.t > last)) last = w.t; if (l && now - w.t < 4 * DAY) sets += l; });
    var ready = 0;
    if (f >= 0.2) { for (var h = 1; h <= 168; h++) { if (fatigueAt(workouts, g, now + h * 3600000) < 0.2) { ready = h; break; } ready = 168; } }
    res[g] = { fatigue: f, level: f >= 0.6 ? 2 : (f >= 0.2 ? 1 : 0), readyH: ready, last: last, sets: Math.round(sets) };
  });
  return res;
}
function readyText(h) { return h < 2 ? 'under 2 h' : h < 36 ? Math.round(h) + ' h' : (Math.round(h / 24 * 2) / 2) + ' days'; }
var LEVEL_TXT = ['Fresh', 'Recovering', 'Tired'];

/* ---------- misc ---------- */
function fmtDur(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; var h = Math.floor(m / 60); if (h) return h + ':' + String(m % 60).padStart(2, '0') + ':' + String(s).padStart(2, '0'); return m + ':' + String(s).padStart(2, '0'); }
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtDate(t) { var d = new Date(t); return MON[d.getMonth()] + ' ' + d.getDate(); }
function fmtDateLong(t) { var d = new Date(t); return DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
function monthKey(t) { var d = new Date(t); return 'm_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function titleCase(s) { return String(s).replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
