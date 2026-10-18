/* ===== Body: progress photos + "what should I focus on" =====
   Photos stay on this phone (localStorage, separate from synced settings). A photo is only sent for analysis when
   the person taps Analyze: to Claude (Claude-hosted version) or to their friends server's AI. Without either,
   a quick self-check plus the strength numbers already in the app build the same focus plan. */
var FOCUS = {
  belly: { n: 'Midsection', e: '🎯', g: ['Core'], ex: ['Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Ab Roller', 'Russian Twist', 'Dead Bug', 'Pallof Press', 'Mountain Climbers'], fat: 1,
    tip: 'Fat comes off the whole body, not one spot, so crunches alone will not shrink a gut. A steady calorie deficit does most of the work; big lifts keep your muscle, and core work makes it look tighter as the fat comes off.' },
  chest: { n: 'Chest', e: '🛡️', g: ['Chest'], ex: ['Barbell Bench Press - Medium Grip', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Pushups', 'Dips - Chest Version', 'Cable Crossover', 'Dumbbell Flyes'], tip: 'Press heavy for 6–10 reps, then add incline work for the upper chest.' },
  shoulders: { n: 'Shoulders', e: '🏔️', g: ['Shoulders'], ex: ['Standing Military Press', 'Seated Dumbbell Press', 'Side Lateral Raise', 'Arnold Dumbbell Press', 'Face Pull', 'Reverse Flyes'], tip: 'Side raises build width; do them often, 12–20 reps, with strict form.' },
  arms: { n: 'Arms', e: '💪', g: ['Biceps', 'Triceps', 'Forearms'], ex: ['Barbell Curl', 'Hammer Curls', 'EZ-Bar Curl', 'Dumbbell Bicep Curl', 'Close-Grip Barbell Bench Press', 'Triceps Pushdown', 'Dips - Triceps Version', 'EZ-Bar Skullcrusher', 'Tricep Dumbbell Kickback'], tip: 'Triceps are about two-thirds of your upper arm, so train them as hard as biceps. Arms grow well with 2–3 sessions a week.' },
  back: { n: 'Back', e: '🦅', g: ['Back'], ex: ['Pullups', 'Wide-Grip Lat Pulldown', 'Bent Over Barbell Row', 'One-Arm Dumbbell Row', 'Seated Cable Rows', 'Chin-Up'], tip: 'Pull-ups and pulldowns for width, rows for thickness. Pull with your elbows.' },
  legs: { n: 'Legs', e: '🦵', g: ['Quads', 'Hamstrings'], ex: ['Barbell Squat', 'Goblet Squat', 'Leg Press', 'Romanian Deadlift', 'Dumbbell Lunges', 'Lying Leg Curls', 'Leg Extensions'], tip: 'A squat or press for quads plus a hinge or curl for hamstrings, twice a week.' },
  glutes: { n: 'Glutes', e: '🍑', g: ['Glutes'], ex: ['Barbell Hip Thrust', 'Barbell Glute Bridge', 'Romanian Deadlift', 'Dumbbell Lunges', 'Glute Kickback', 'Step-up with Knee Raise'], tip: 'Hip thrusts and deep lunges; squeeze hard at the top of every rep.' },
  calves: { n: 'Calves', e: '🦶', g: ['Calves'], ex: ['Standing Calf Raises', 'Seated Calf Raise', 'Standing Dumbbell Calf Raise', 'Calf Press On The Leg Press Machine'], tip: 'Calves need a full stretch at the bottom and a pause at the top. Train them 3 times a week.' },
  posture: { n: 'Posture', e: '🧍', g: ['Back', 'Shoulders'], ex: ['Face Pull', 'Reverse Flyes', 'Band Pull Apart', 'Seated Cable Rows', 'Hyperextensions (Back Extensions)', 'Plank'], tip: 'Rounded shoulders usually mean the upper back and rear shoulders need work. Pull more than you push for a while.' }
};
var FOCUS_IDS = Object.keys(FOCUS);
var PHOTO_KEY = 'ironledger.photos';
function photosLoad() { try { var a = JSON.parse(localStorage.getItem(PHOTO_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function photosSave(a) { try { localStorage.setItem(PHOTO_KEY, JSON.stringify(a.slice(-8))); return true; } catch (e) { toast('Not enough space on this phone for another photo. Delete an old one.'); return false; } }
function BS() { var b = S.settings.bodyFocus; if (!b || typeof b !== 'object') b = S.settings.bodyFocus = { res: null, goal: 'both', pick: [] }; if (!b.pick) b.pick = []; return b; }

function shrinkImage(file, max, q) {
  return new Promise(function (ok, bad) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', q || 0.8));
    };
    img.onerror = function () { URL.revokeObjectURL(url); bad(new Error('Could not read that picture.')); };
    img.src = url;
  });
}
function dataURLBlob(du) { var p = du.split(','), b = atob(p[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: 'image/jpeg' }); }

/* what the strength numbers say */
function weakGroups() {
  var B = profB(), W = realWorkouts(); if (!B || !W.length) return [];
  var H = allHistories(W), now = Date.now(), out = [];
  GROUPS.forEach(function (g) { var r = groupRankAt(H, g, B, now); if (r) out.push({ g: g, s: r.score }); });
  out.sort(function (a, b) { return a.s - b.s; });
  return out;
}
function areaForGroup(g) { if (g === 'Core') return 'belly'; if (g === 'Biceps' || g === 'Triceps' || g === 'Forearms') return 'arms'; if (g === 'Quads' || g === 'Hamstrings') return 'legs'; for (var k in FOCUS) if (FOCUS[k].g[0] === g) return k; return null; }

/* ----- AI ----- */
var AI = { kind: null, busy: false, err: '', ctl: null };
async function aiDetect() {
  if (window.claude && window.claude.use) {
    try { var sm = await window.claude.use('sample'); if (sm) { var lim = await sm.limits().catch(function () { return null; }); if (lim && lim.images) { AI.kind = 'claude'; AI.sample = sm; return; } } } catch (e) { }
  }
  AI.kind = srvOn() ? 'server' : null;
}
function aiPrompt() {
  var B = profB(), wk = weakGroups(), F = BS();
  var info = B ? (B.sex === 'M' ? 'Man' : 'Woman') + ', ' + Math.round(B.h) + ' cm, ' + Math.round(curWeightLb(B) / LB) + ' kg.' : 'Sex, height and weight not given.';
  var nums = wk.length ? ' Strength ranks for their size (1–100): ' + wk.map(function (x) { return x.g + ' ' + Math.round(x.s); }).join(', ') + '.' : '';
  var goal = { lose: 'lose fat', build: 'build muscle', both: 'lose fat and build muscle' }[F.goal] || 'get fitter';
  return 'You are a strength coach looking at a progress photo the person chose to share so you can plan their training. ' + info + nums + ' Their goal: ' + goal + '.\n' +
    'Look only at the visible physique. Be factual, kind and neutral: no insults, nothing about attractiveness, no medical claims. ' +
    'If the photo does not clearly show a person\'s body (at least the torso), set "ok" to false and say why in "reason".\n' +
    'Answer with JSON only, no other text, in exactly this shape:\n' +
    '{"ok":true,"reason":"","build":"short neutral description, e.g. lean, average, carrying some extra weight around the middle, muscular","bf":"rough visual body-fat range like 18-22%, or empty if unsure","focus":[{"area":"arms","why":"under 15 words"}],"strengths":["under 8 words each"],"eat":"lose|recomp|maintain|lean","note":"one encouraging sentence"}\n' +
    'Rules: "area" must be one of: ' + FOCUS_IDS.join(', ') + '. Give 1 to 4 focus areas, most important first. Use "belly" when there is noticeable fat around the midsection. "eat" is the eating goal you would suggest.';
}
function cleanAI(o) {
  if (!o || typeof o !== 'object') throw new Error('The answer did not come back in the expected form. Try again.');
  if (o.ok === false) return { ok: false, reason: String(o.reason || 'The photo was not clear enough.').slice(0, 200) };
  var seen = {}, focus = (Array.isArray(o.focus) ? o.focus : []).filter(function (f) { return f && FOCUS[f.area] && !seen[f.area] && (seen[f.area] = 1); }).slice(0, 4).map(function (f) { return { area: f.area, why: String(f.why || '').slice(0, 140) }; });
  if (!focus.length) throw new Error('No focus areas came back. Try another photo.');
  return { ok: true, build: String(o.build || '').slice(0, 120), bf: String(o.bf || '').slice(0, 20), focus: focus, strengths: (Array.isArray(o.strengths) ? o.strengths : []).slice(0, 3).map(function (s) { return String(s).slice(0, 60); }), eat: FGOALS[o.eat] ? o.eat : null, note: String(o.note || '').slice(0, 200) };
}
async function aiAnalyze(du) {
  var prompt = aiPrompt();
  if (AI.kind === 'claude') {
    AI.ctl = new AbortController();
    var j = await AI.sample.json(prompt, { images: [dataURLBlob(du)], signal: AI.ctl.signal, cache: false });
    return cleanAI(j);
  }
  if (AI.kind === 'server') {
    var r = await srvRaw('POST', '/analyze', { image: du, prompt: prompt });
    return cleanAI(r.data);
  }
  throw new Error('Photo analysis is not available here.');
}
function aiErrText(e) {
  var c = e && e.code;
  if (c === 'not_granted') return 'Claude was not allowed to look at the photo. You can still use the self-check below.';
  if (c === 'rate_limited') return 'Too many requests right now. Try again in a few minutes.';
  if (c === 'cancelled') return '';
  if (c === 'image_rejected') return 'That picture could not be used. Try a JPEG or PNG photo.';
  if (c === 501) return 'Your friends server does not have AI turned on yet. See SERVER-SETUP.txt (step 7), or use the self-check below.';
  return (e && e.message) || 'Something went wrong. Try again.';
}

/* ----- the focus plan ----- */
function focusFromSelf() {
  var F = BS(), pick = F.pick.slice(), wk = weakGroups(), from = {};
  pick.forEach(function (a) { from[a] = 'You picked this'; });
  wk.slice(0, 2).forEach(function (x) { var a = areaForGroup(x.g); if (a && !from[a] && x.s < 45) { from[a] = 'Your ' + x.g.toLowerCase() + ' rank is ' + Math.round(x.s) + ', one of your lowest for your size'; pick.push(a); } });
  if (F.goal !== 'build' && pick.indexOf('belly') < 0 && F.goal === 'lose') { pick.unshift('belly'); from.belly = 'Your goal is to lose fat'; }
  return { ok: true, src: 'self', at: Date.now(), focus: pick.slice(0, 4).map(function (a) { return { area: a, why: from[a] }; }), eat: F.goal === 'lose' ? 'lose' : F.goal === 'build' ? 'lean' : 'recomp', build: '', bf: '', strengths: [], note: '' };
}
function focusExercises(area, n) {
  var mg = gearMap(gearList()), out = [];
  FOCUS[area].ex.forEach(function (nm) { var e = BYNAME[nm]; if (e && available(e, mg) && out.length < n) out.push(e); });
  if (out.length < n) filterEx('', FOCUS[area].g, 'mine', 'strength', 'all').forEach(function (e) { if (out.length < n && out.indexOf(e) < 0) out.push(e); });
  return out;
}
function weekSetsFor(groups) {
  var ws = weekStart(Date.now()), n = 0;
  realWorkouts().forEach(function (w) { if (w.t < ws) return; w.ex.forEach(function (e) { var x = BYNAME[e.n]; if (x && groups.indexOf(x.p[0]) >= 0) n += e.sets.length; }); });
  return n;
}
function planHTMLBody(res) {
  var wk = weakGroups(), eatGoal = res.eat || null;
  var head = '<div class="card section" style="gap:10px"><div class="mtag">' + (res.src === 'self' ? 'From your self-check' + (wk.length ? ' and strength numbers' : '') : 'From your photo') + ' · ' + fmtDate(res.at) + '</div>' +
    (res.build ? '<div class="xname" style="font-size:18px">' + esc(res.build.charAt(0).toUpperCase() + res.build.slice(1)) + '</div>' : '<div class="xname" style="font-size:18px">Your focus plan</div>') +
    (res.bf ? '<div class="note">Rough body fat from the photo: <b>' + esc(res.bf) + '</b>. Photos can be off by several points, so treat it as a ballpark.</div>' : '') +
    (res.strengths && res.strengths.length ? '<div class="chips">' + res.strengths.map(function (s) { return '<span class="tag p">✓ ' + esc(s) + '</span>'; }).join('') + '</div>' : '') +
    (res.note ? '<div class="note">' + esc(res.note) + '</div>' : '') + '</div>';
  var cards = res.focus.map(function (f, i) {
    var A = FOCUS[f.area], exs = focusExercises(f.area, 4), sets = weekSetsFor(A.g), tgt = i === 0 ? 14 : 10;
    return '<div class="card section focus"><div class="row" style="gap:12px;align-items:flex-start"><div class="fbadge">' + A.e + '</div><div class="grow"><div class="mtag">Focus ' + (i + 1) + '</div><div class="xname" style="font-size:19px">' + A.n + '</div>' + (f.why ? '<div class="xmeta">' + esc(f.why) + '</div>' : '') + '</div></div>' +
      '<div class="note">' + esc(A.tip) + '</div>' +
      '<div class="mrow"><div class="row"><span class="grow">Hard sets this week</span><span class="num" style="font-size:17px">' + sets + '<span class="faint"> / ' + tgt + '+</span></span></div><div class="mbar p"><i style="width:' + Math.min(100, sets / tgt * 100).toFixed(0) + '%"></i></div></div>' +
      '<div class="fex">' + exs.map(function (e) { return '<button class="fexr" data-act="openEx" data-n="' + esc(e.n) + '"><span class="thumb" style="width:56px">' + demoHTML(e, false) + '</span><span class="grow">' + esc(e.n) + '</span></button>'; }).join('') + '</div></div>';
  }).join('');
  var groups = []; res.focus.forEach(function (f) { FOCUS[f.area].g.forEach(function (g) { if (groups.indexOf(g) < 0) groups.push(g); }); });
  var hasBelly = res.focus.some(function (f) { return f.area === 'belly'; });
  var eatCard = eatGoal ? '<div class="card section" style="gap:10px"><div class="xname">Eating to match</div><div class="note">' + (hasBelly ? 'Losing the midsection is mostly nutrition: aim for a moderate deficit and plenty of protein so you keep muscle.' : eatGoal === 'lean' ? 'To build size, eat a little above maintenance with high protein.' : 'Keep protein high and calories near maintenance while you build the focus areas.') + '</div>' +
    '<button class="btn block" data-act="bodyEat" data-k="' + eatGoal + '">Set Eat goal to ' + FGOALS[eatGoal].n + '</button></div>' : '';
  return head + cards +
    '<button class="btn primary block" data-act="bodyTrain" data-g="' + esc(groups.join(',')) + '">Build a workout for these</button>' +
    '<div class="note">Your Train builder will start with ' + esc(groups.join(', ')) + ' selected. Aim for 12–16 hard sets a week for your top focus and 8–12 for the rest, and keep training everything else at least once a week.</div>' + eatCard;
}

/* ----- view ----- */
function viewBody() {
  var F = BS(), photos = photosLoad(), d = new Date();
  var head = '<div class="screen-head"><div><div class="sub">What to work on</div><h1>Body</h1></div></div>';
  var last = photos[photos.length - 1], first = photos[0];
  var photoCard = '<div class="card section" style="gap:12px"><h2>Progress photo</h2>' +
    (last ? '<div class="pcmp">' + (photos.length > 1 ? '<figure><img src="' + first.d + '" alt="First photo"><figcaption>' + fmtDate(first.t) + '</figcaption></figure>' : '') + '<figure><img src="' + last.d + '" alt="Latest photo"><figcaption>' + (photos.length > 1 ? 'Latest · ' : '') + fmtDate(last.t) + '</figcaption></figure></div>' : '<div class="note">Take a front photo in good light, standing relaxed, in shorts or fitted clothes. Same spot and time of day each time makes progress easy to see.</div>') +
    '<label class="btn ' + (last ? '' : 'primary ') + 'block filebtn">' + (last ? 'Add a new photo' : 'Take or choose a photo') + '<input type="file" id="bodyfile" accept="image/*" capture="user" hidden></label>' +
    (last ? (AI.kind ? '<button class="btn primary block" data-act="bodyAnalyze"' + (AI.busy ? ' disabled' : '') + '>' + (AI.busy ? 'Looking at your photo…' : 'Analyze my latest photo') + '</button>' : '<div class="note">Photo analysis works in the Claude-hosted version, or when you are signed in to a friends server with AI turned on. Use the self-check below meanwhile.</div>') : '') +
    (AI.busy && AI.kind === 'claude' ? '<button class="btn small ghost" data-act="bodyStop">Stop</button>' : '') +
    (AI.err ? '<div class="banner"><span>' + esc(AI.err) + '</span></div>' : '') +
    (photos.length ? '<button class="btn small ghost" data-act="bodyPhotos">Manage photos (' + photos.length + ')</button>' : '') +
    '<div class="note">Photos stay on this phone. When you tap Analyze, the photo is sent once to ' + (AI.kind === 'server' ? 'your friends server\'s AI' : 'Claude') + ' to read it, and the app does not keep it anywhere else.</div></div>';
  var self = '<div class="card section" style="gap:12px"><h2>Self-check</h2><div class="note">No photo needed. Tap what you want to improve. Your strength numbers fill in the rest.</div>' +
    '<div><span class="field-label">Main goal</span><div class="seg" role="group"><button aria-pressed="' + (F.goal === 'lose') + '" data-act="bodyGoal" data-k="lose">Lose fat</button><button aria-pressed="' + (F.goal === 'both') + '" data-act="bodyGoal" data-k="both">Both</button><button aria-pressed="' + (F.goal === 'build') + '" data-act="bodyGoal" data-k="build">Build muscle</button></div></div>' +
    '<div><span class="field-label">I want to improve</span><div class="chips">' + FOCUS_IDS.map(function (a) { return '<button class="chip" aria-pressed="' + (F.pick.indexOf(a) >= 0) + '" data-act="bodyPick" data-k="' + a + '">' + FOCUS[a].e + ' ' + (a === 'belly' ? 'Lose the gut' : FOCUS[a].n) + '</button>'; }).join('') + '</div></div>' +
    '<button class="btn block" data-act="bodySelf"' + (F.pick.length || weakGroups().length ? '' : ' disabled') + '>Make my focus plan</button></div>';
  var wk = weakGroups(), numbers = wk.length ? '<div class="card section" style="gap:8px"><div class="xname">What your numbers say</div><div class="note">Lowest strength ranks for your size: ' + wk.slice(0, 3).map(function (x) { return '<b>' + x.g + '</b> ' + Math.round(x.s); }).join(' · ') + '</div></div>' : '';
  var plan = F.res && F.res.ok ? '<div class="section"><h2>Your focus</h2>' + planHTMLBody(F.res) + '</div>' : (F.res && F.res.ok === false ? '<div class="banner"><span>' + esc(F.res.reason) + '</span></div>' : '');
  return '<div class="screen">' + head + plan + photoCard + self + numbers + '<div class="note">This is training advice, not a medical assessment. If you have pain, an injury or a health condition, check with a professional first.</div></div>';
}
function photosSheet() {
  var photos = photosLoad();
  openSheet('Your photos', '<div class="pgrid">' + photos.map(function (p, i) { return '<figure><img src="' + p.d + '" alt="Photo from ' + fmtDate(p.t) + '"><figcaption>' + fmtDate(p.t) + ' <button class="linkbtn" data-act="bodyDelPhoto" data-i="' + i + '">Delete</button></figcaption></figure>'; }).join('') + '</div><div class="note">Up to 8 photos are kept. The oldest is removed when you add a ninth.</div>');
}

/* ----- events ----- */
function bodyClick(a, d) {
  var F = BS();
  switch (a) {
    case 'bodyGoal': F.goal = d.k; persist({ settings: true }); render(); return true;
    case 'bodyPick': { var i = F.pick.indexOf(d.k); if (i >= 0) F.pick.splice(i, 1); else F.pick.push(d.k); persist({ settings: true }); render(); return true; }
    case 'bodySelf': F.res = focusFromSelf(); persist({ settings: true }); render(); window.scrollTo(0, 0); return true;
    case 'bodyAnalyze': {
      var ph = photosLoad(), last = ph[ph.length - 1]; if (!last || AI.busy) return true;
      AI.busy = true; AI.err = ''; render();
      aiAnalyze(BODY_FULL || last.d).then(function (res) {
        AI.busy = false;
        if (!res.ok) { F.res = res; } else { res.src = AI.kind; res.at = Date.now(); F.res = res; }
        persist({ settings: true }); render(); window.scrollTo(0, 0);
      }, function (e) { AI.busy = false; AI.err = aiErrText(e); render(); });
      return true;
    }
    case 'bodyStop': if (AI.ctl) AI.ctl.abort(); return true;
    case 'bodyPhotos': photosSheet(); return true;
    case 'bodyDelPhoto': { var p = photosLoad(); p.splice(+d.i, 1); photosSave(p); photosSheet(); render(); return true; }
    case 'bodyTrain': { var gs = d.g.split(',').filter(function (g) { return GROUPS.indexOf(g) >= 0; }); if (gs.length) S.settings.groups = gs; persist({ settings: true }); U.tab = 'train'; U.plan = null; render(); window.scrollTo(0, 0); toast('Focus muscles selected. Tap Build my workout.'); return true; }
    case 'bodyEat': { var FF = FS(); FF.goal = d.k; FF.days = {}; persist({ settings: true }); toast('Eat goal set to ' + FGOALS[d.k].n); render(); return true; }
  }
  return false;
}
var BODY_FULL = null;   // sharper copy of the newest photo, kept in memory only for analysis
function bodyChange(t) {
  if (t.id !== 'bodyfile' || !t.files || !t.files[0]) return false;
  var file = t.files[0]; t.value = '';
  Promise.all([shrinkImage(file, 520, 0.72), shrinkImage(file, 1024, 0.82)]).then(function (r) {
    var p = photosLoad(); p.push({ t: Date.now(), d: r[0] });
    if (photosSave(p)) { BODY_FULL = r[1]; AI.err = ''; render(); toast('Photo saved on this phone'); }
  }, function (e) { toast(e.message); });
  return true;
}
