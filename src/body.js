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
var PHOTO_KEY = 'ironledger.photos', PHOTOS = null, PHOTO_MAX = 60, PHOTO_IDB = null;
/* photos live in IndexedDB (room for many); older versions kept a few in localStorage, which we move over once */
function idbOpen() {
  return new Promise(function (ok, bad) {
    if (!window.indexedDB) { bad(new Error('no idb')); return; }
    var r = indexedDB.open('ironledger', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
    r.onsuccess = function () { ok(r.result); }; r.onerror = function () { bad(r.error); };
  });
}
function idbGet(k) { return idbOpen().then(function (db) { return new Promise(function (ok, bad) { var q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { bad(q.error); }; }); }); }
function idbSet(k, v) { return idbOpen().then(function (db) { return new Promise(function (ok, bad) { var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = function () { ok(); }; tx.onerror = function () { bad(tx.error); }; }); }); }
function legacyPhotos() { try { var a = JSON.parse(localStorage.getItem(PHOTO_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function photosInit() {
  return idbGet('photos').then(function (a) {
    PHOTO_IDB = true; var old = legacyPhotos();
    PHOTOS = Array.isArray(a) ? a : [];
    if (old.length) { var have = {}; PHOTOS.forEach(function (x) { have[x.t] = 1; }); old.forEach(function (x) { if (!have[x.t]) PHOTOS.push(x); }); PHOTOS.sort(function (x, y) { return x.t - y.t; }); return idbSet('photos', PHOTOS).then(function () { try { localStorage.removeItem(PHOTO_KEY); } catch (e) { } }); }
  }).catch(function () { PHOTO_IDB = false; PHOTOS = legacyPhotos(); }).then(function () { if (U.tab === 'body') render(); });
}
function photosLoad() { return PHOTOS || legacyPhotos(); }
function photosSave(a) {
  if (PHOTO_IDB) { PHOTOS = a.slice(-PHOTO_MAX); idbSet('photos', PHOTOS).catch(function () { toast('Could not save the photo. Your phone may be out of space.'); }); return true; }
  try { PHOTOS = a.slice(-8); localStorage.setItem(PHOTO_KEY, JSON.stringify(PHOTOS)); return true; } catch (e) { toast('Not enough space on this phone for another photo. Delete an old one.'); return false; }
}
async function savePhotoFile(p) {
  var blob = dataURLBlob(p.d), name = 'progress-' + new Date(p.t).toISOString().slice(0, 10) + '.jpg';
  await saveBlob(blob, name, 'image/jpeg', 'Photo saved');
}
async function saveBlob(blob, name, type, okMsg) {
  try { var f = new File([blob], name, { type: type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 5000); toast(okMsg); } catch (e) { toast('Could not save it.'); }
}
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
function dataURLBlob(du) { var p = du.split(','), m = (p[0].match(/data:([^;]+)/) || [])[1] || 'image/jpeg', b = atob(p[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: m }); }

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
  AI.kind = aiKey() ? 'key' : srvOn() ? 'server' : null;
}
/* your own Anthropic API key: stored only on this phone, sent only to api.anthropic.com */
var AK_KEY = 'ironledger.ak';
function aiKey() { try { return localStorage.getItem(AK_KEY) || ''; } catch (e) { return ''; } }
function aiKeySet(k) { try { if (k) localStorage.setItem(AK_KEY, k); else localStorage.removeItem(AK_KEY); } catch (e) { } }
var AI_MODEL = 'claude-sonnet-5-5';
async function aiAnthropic(du, prompt, key) {
  var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 90000); AI.ctl = ctl;
  var r, j = null;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 900, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: (du.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg', data: du.split(',')[1] } }, { type: 'text', text: prompt }] }] }) });
  } catch (e) { clearTimeout(to); var ne = new Error(e && e.name === 'AbortError' ? 'Stopped.' : 'Could not reach Claude. Check your connection.'); ne.code = e && e.name === 'AbortError' ? 'cancelled' : 'network'; throw ne; }
  clearTimeout(to);
  try { j = await r.json(); } catch (e) { }
  if (!r.ok) {
    var msg = (j && j.error && j.error.message) || '', er = new Error(msg || 'Claude returned an error (' + r.status + ').'); er.code = 'k' + r.status;
    if (r.status === 401 || r.status === 403) er.message = 'That API key was not accepted. Check it under "Photo analysis" below.';
    else if (r.status === 429 || r.status === 529) er.message = 'Claude is busy right now. Try again in a minute.';
    else if (/credit|balance|billing/i.test(msg)) er.message = 'Your Anthropic account is out of credit. Add some at console.anthropic.com (Billing).';
    else if (r.status === 404 && /model/i.test(msg)) er.message = 'That model is not available on your account: ' + msg;
    throw er;
  }
  var txt = ((j && j.content) || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  var m = txt.match(/\{[\s\S]*\}/); if (!m) throw new Error('The answer did not come back in the expected form. Try again.');
  return JSON.parse(m[0]);
}
function keySheet() {
  var k = aiKey();
  openSheet('Photo analysis', '<div class="note">To analyze photos in this app (including from your Home Screen), connect your own Claude API key. It is stored only on this phone and is sent only to Anthropic when you tap Analyze. Each analysis costs about 1–2 cents from your API credit.</div>' +
    '<ol class="steps"><li>Go to <b>console.anthropic.com</b> and sign in (or make an account).</li><li>Open <b>Billing</b> and add a little credit, for example $5. Setting a monthly spend limit is a good idea.</li><li>Open <b>API keys</b>, tap <b>Create key</b>, name it "Iron Ledger", and copy it. It starts with <b>sk-ant-</b>.</li><li>Paste it below and tap Save.</li></ol>' +
    '<input class="input" id="akin" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="sk-ant-…" value="' + esc(k) + '" aria-label="Claude API key">' +
    '<div class="note" id="ak-err" style="color:var(--down);min-height:0"></div>' +
    '<button class="btn primary block" data-act="bodyKeySave">Save key</button>' +
    (k ? '<button class="btn block ghost danger" data-act="bodyKeyDel">Remove key from this phone</button>' : '') +
    '<div class="note">Keep the key private: anyone who has it can spend your API credit. Friends using your app link need their own key (or your friends server).</div>');
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
  if (AI.kind === 'key') return cleanAI(await aiAnthropic(du, prompt, aiKey()));
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
  FOCUS[area].ex.forEach(function (nm) { var e = BYNAME[nm]; if (e && available(e, mg) && !injuryBlocked(e) && out.length < n) out.push(e); });
  if (out.length < n) filterEx('', FOCUS[area].g, 'mine', 'strength', 'all').forEach(function (e) { if (out.length < n && out.indexOf(e) < 0 && !injuryBlocked(e)) out.push(e); });
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
    (last ? (AI.kind ? '<button class="btn primary block" data-act="bodyAnalyze"' + (AI.busy ? ' disabled' : '') + '>' + (AI.busy ? 'Looking at your photo…' : 'Analyze my latest photo') + '</button>' : '<button class="btn primary block" data-act="bodyKey">Turn on photo analysis</button><div class="note">One-time setup with your own Claude API key (about 1–2 cents per photo). Or use the self-check below.</div>') : '') +
    (last && AI.kind !== 'claude' ? '<button class="btn block" data-act="bodyChat">💬 Analyze in my Claude app</button>' : '') +
    (AI.kind === 'key' ? '<button class="linkbtn" style="font-size:13px;color:var(--muted)" data-act="bodyKey">Photo analysis settings</button>' : '') +
    (AI.busy && (AI.kind === 'claude' || AI.kind === 'key') ? '<button class="btn small ghost" data-act="bodyStop">Stop</button>' : '') +
    (AI.err ? '<div class="banner"><span>' + esc(AI.err) + '</span></div>' : '') +
    (photos.length ? '<div class="row" style="gap:8px">' + (photos.length > 1 ? '<button class="btn grow" data-act="bodyTimeline">▶ Timeline</button>' : '') + '<button class="btn grow" data-act="bodyPhotos">All photos (' + photos.length + ')</button></div>' : '') +
    '<div class="note">Photos stay on this phone. When you tap Analyze, the photo is sent once to ' + (AI.kind === 'server' ? 'your friends server\'s AI' : AI.kind === 'key' ? 'Claude (Anthropic) using your key' : 'Claude') + ' to read it, and the app does not keep it anywhere else.</div></div>';
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
  openSheet('Your photos', '<div class="pgrid">' + photos.map(function (p, i) { return '<figure><img src="' + p.d + '" alt="Photo from ' + fmtDate(p.t) + '"><figcaption>' + fmtDate(p.t) + '<span><button class="linkbtn" data-act="bodySavePhoto" data-i="' + i + '">Save</button> · <button class="linkbtn" data-act="bodyDelPhoto" data-i="' + i + '">Delete</button></span></figcaption></figure>'; }).reverse().join('') + '</div>' +
    '<div class="note">Up to ' + PHOTO_MAX + ' photos are kept in the app. Tap Save to keep a copy in your Photos or Files too' + (PHOTO_IDB ? '' : ' (this browser only allows a few, so save them)') + '.</div>');
}

/* ----- timeline video ----- */
var TL = { raf: 0, rec: null };
function tlFrames() { var ph = photosLoad(); if (ph.length <= 12) return ph; var out = [], n = 12; for (var i = 0; i < n; i++) out.push(ph[Math.round(i * (ph.length - 1) / (n - 1))]); return out; }
function tlLoadImgs(list) { return Promise.all(list.map(function (p) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = p.d; }); })); }
function tlDraw(x, W, H, imgs, list, t) {
  // t in seconds. each photo: 1.3s hold + 0.7s crossfade; then a 2.8s before/after card
  var per = 2, n = imgs.length, tot = n * per, B = profB(), u = uLabel();
  function cover(im, a) { if (!im) return; var s = Math.max(W / im.width, (H - 120) / im.height), w = im.width * s, h = im.height * s; x.globalAlpha = a; x.drawImage(im, (W - w) / 2, 70 + (H - 120 - h) / 2, w, h); x.globalAlpha = 1; }
  x.fillStyle = '#0f1113'; x.fillRect(0, 0, W, H);
  var fd = '"Barlow Condensed", "Arial Narrow", sans-serif', fb = 'Barlow, Helvetica, Arial, sans-serif';
  if (t < tot) {
    var i = Math.min(n - 1, Math.floor(t / per)), k = t - i * per, fade = k > 1.3 && i < n - 1 ? (k - 1.3) / 0.7 : 0;
    cover(imgs[i], 1); if (fade > 0) cover(imgs[i + 1], fade);
    var cur = fade > 0.5 ? i + 1 : i, p = list[cur], wk = Math.round((p.t - list[0].t) / (7 * DAY));
    x.fillStyle = 'rgba(15,17,19,.82)'; x.fillRect(0, H - 50, W, 50); x.fillRect(0, 0, W, 70);
    x.fillStyle = '#f2c230'; x.font = '700 30px ' + fd; x.fillText('IRON LEDGER', 22, 45);
    x.fillStyle = '#eceae4'; x.font = '700 34px ' + fd; x.textAlign = 'right'; x.fillText(wk ? 'Week ' + wk : 'Start', W - 22, 46); x.textAlign = 'left';
    x.fillStyle = '#eceae4'; x.font = '600 22px ' + fb; x.fillText(fmtDateLong(p.t), 22, H - 18);
    if (B) { var w = bwAt(B, p.t); if (w) { x.textAlign = 'right'; x.fillText(toDisp(w, unit()) + ' ' + u, W - 22, H - 18); x.textAlign = 'left'; } }
    // progress bar
    x.fillStyle = '#2a2f36'; x.fillRect(0, H - 52, W, 3); x.fillStyle = '#f2c230'; x.fillRect(0, H - 52, W * Math.min(1, t / tot), 3);
    return false;
  }
  // before / after
  var a = Math.min(1, (t - tot) / 0.5), half = W / 2 - 6;
  x.globalAlpha = a;
  [0, n - 1].forEach(function (idx, j) { var im = imgs[idx]; if (!im) return; var s = Math.max(half / im.width, (H - 170) / im.height), w = im.width * s, h = im.height * s; x.save(); x.beginPath(); x.rect(j * (half + 12), 80, half, H - 170); x.clip(); x.drawImage(im, j * (half + 12) + (half - w) / 2, 80 + (H - 170 - h) / 2, w, h); x.restore(); });
  x.fillStyle = '#0f1113'; x.fillRect(0, 0, W, 80); x.fillRect(0, H - 90, W, 90);
  x.fillStyle = '#f2c230'; x.font = '700 30px ' + fd; x.fillText('IRON LEDGER', 22, 48);
  var weeks = Math.max(1, Math.round((list[n - 1].t - list[0].t) / (7 * DAY)));
  x.fillStyle = '#eceae4'; x.font = '700 40px ' + fd; x.textAlign = 'right'; x.fillText(weeks + (weeks === 1 ? ' week' : ' weeks'), W - 22, 52); x.textAlign = 'left';
  x.font = '600 22px ' + fb; x.fillStyle = '#99a0a9';
  x.fillText(fmtDate(list[0].t), 22, H - 52); x.textAlign = 'right'; x.fillText(fmtDate(list[n - 1].t), W - 22, H - 52); x.textAlign = 'left';
  if (B) { var w0 = bwAt(B, list[0].t), w1 = bwAt(B, list[n - 1].t); if (w0 && w1 && Math.abs(w1 - w0) >= 0.5) { var dlt = w1 - w0; x.fillStyle = '#eceae4'; x.font = '700 26px ' + fb; x.textAlign = 'center'; x.fillText((dlt > 0 ? '+' : '−') + toDisp(Math.abs(dlt), unit()) + ' ' + u, W / 2, H - 22); x.textAlign = 'left'; } }
  x.globalAlpha = 1;
  return t > tot + 2.8;
}
function tlStop() { cancelAnimationFrame(TL.raf); TL.raf = 0; }
function timelineSheet() {
  var list = tlFrames(); if (list.length < 2) { toast('Add at least two photos first.'); return; }
  var canRec = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
  openSheet('Your timeline', '<canvas id="tlc" width="540" height="760" style="width:100%;border-radius:16px;background:#0f1113"></canvas>' +
    '<div class="row" style="gap:8px"><button class="btn grow" data-act="bodyTlPlay">↻ Replay</button>' + (canRec ? '<button class="btn primary grow" data-act="bodyTlSave" id="tlsave">Save video</button>' : '') + '</div>' +
    '<div class="note">' + list.length + ' photos from ' + fmtDate(list[0].t) + ' to ' + fmtDate(list[list.length - 1].t) + (photosLoad().length > list.length ? ' (spread evenly across all ' + photosLoad().length + ')' : '') + '. Same pose, light and spot each time makes it look best.</div>');
  tlPlay();
}
function tlPlay() {
  tlStop(); var c = $('#tlc'); if (!c) return; var x = c.getContext('2d'), list = tlFrames();
  tlLoadImgs(list).then(function (imgs) {
    var t0 = performance.now();
    (function step(now) { var c2 = $('#tlc'); if (!c2) { tlStop(); return; } var done = tlDraw(x, c.width, c.height, imgs, list, (now - t0) / 1000); if (!done) TL.raf = requestAnimationFrame(step); })(t0);
  });
}
function tlRecord() {
  var list = tlFrames(), btn = $('#tlsave'); if (TL.rec) return;
  var c = document.createElement('canvas'); c.width = 540; c.height = 760; var x = c.getContext('2d');
  var types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'], type = types.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0] || '';
  tlLoadImgs(list).then(function (imgs) {
    var stream = c.captureStream(30), rec, chunks = [];
    try { rec = type ? new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2500000 }) : new MediaRecorder(stream); } catch (e) { toast('This browser cannot make videos.'); return; }
    TL.rec = rec; if (btn) { btn.disabled = true; btn.textContent = 'Making video…'; }
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      TL.rec = null; var mt = rec.mimeType || type || 'video/webm', ext = /mp4/.test(mt) ? 'mp4' : 'webm', blob = new Blob(chunks, { type: mt.split(';')[0] });
      var b2 = $('#tlsave'); if (b2) { b2.disabled = false; b2.textContent = 'Save video'; }
      saveBlob(blob, 'iron-ledger-timeline.' + ext, mt.split(';')[0], 'Video saved');
    };
    rec.start(250);
    var t0 = performance.now();
    (function step() { var done = tlDraw(x, c.width, c.height, imgs, list, (performance.now() - t0) / 1000); if (done) { setTimeout(function () { rec.stop(); }, 150); } else setTimeout(step, 1000 / 30); })();
  });
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
    case 'bodyKey': keySheet(); return true;
    case 'bodyChat': chatSheet(); return true;
    case 'bodyChatSend': chatSend(); return true;
    case 'bodyChatCopy': copyText(chatPrompt()); return true;
    case 'bodyChatUse': {
      var tx = ($('#chatans') || {}).value || '', er = $('#chat-err'), m = tx.match(/\{[\s\S]*\}/);
      try { if (!m) throw new Error('Paste Claude\'s whole reply (it should contain a block that starts with { and ends with }).'); var res = cleanAI(JSON.parse(m[0])); if (res.ok) { res.src = 'chat'; res.at = Date.now(); } F.res = res; persist({ settings: true }); closeSheet(); render(); window.scrollTo(0, 0); toast(res.ok ? 'Focus plan added' : 'Claude could not use that photo'); }
      catch (e) { if (er) er.textContent = (e instanceof SyntaxError) ? 'That reply could not be read. Ask Claude to "reply with only the JSON" and paste again.' : e.message; }
      return true; }
    case 'bodyKeySave': { var kv = (($('#akin') || {}).value || '').trim(), ke = $('#ak-err');
      if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(kv)) { if (ke) ke.textContent = 'That does not look like a Claude API key. It should start with sk-ant-.'; return true; }
      aiKeySet(kv); if (!window.claude) AI.kind = 'key'; AI.err = ''; closeSheet(); render(); toast('Photo analysis is on'); return true; }
    case 'bodyKeyDel': aiKeySet(''); AI.kind = srvOn() ? 'server' : (window.claude ? AI.kind : null); closeSheet(); render(); toast('Key removed'); return true;
    case 'bodySavePhoto': { var sp = photosLoad()[+d.i]; if (sp) savePhotoFile(sp); return true; }
    case 'bodyTimeline': timelineSheet(); return true;
    case 'bodyTlPlay': tlPlay(); return true;
    case 'bodyTlSave': tlRecord(); return true;
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
  Promise.all([shrinkImage(file, 720, 0.8), shrinkImage(file, 1024, 0.82)]).then(function (r) {
    var p = photosLoad(); p.push({ t: Date.now(), d: r[0] });
    if (photosSave(p)) { BODY_FULL = r[1]; AI.err = ''; render(); toast('Photo saved on this phone'); }
  }, function (e) { toast(e.message); });
  return true;
}

/* ----- analyze through the Claude app (uses your Claude subscription; no key) ----- */
function chatPrompt() { return 'Iron Ledger photo check. ' + aiPrompt() + '\n\nReply with only the JSON so I can paste it back into the app.'; }
async function chatSend() {
  var ph = photosLoad(), last = ph[ph.length - 1]; if (!last) return;
  var prompt = chatPrompt();
  try { if (navigator.clipboard) await navigator.clipboard.writeText(prompt); } catch (e) { }
  var blob = dataURLBlob(BODY_FULL || last.d), file = new File([blob], 'progress-photo.jpg', { type: 'image/jpeg' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file], text: prompt })) { await navigator.share({ files: [file], text: prompt }); U.chatSent = true; chatSheet(); return; }
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); U.chatSent = true; chatSheet(); toast('The instructions are copied. Paste them into the chat with the photo.'); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  await saveBlob(blob, 'progress-photo.jpg', 'image/jpeg', 'Photo saved'); U.chatSent = true; chatSheet();
  toast('Photo saved and instructions copied. Attach the photo in a Claude chat and paste.');
}
function chatSheet() {
  openSheet('Analyze in Claude', '<div class="note">Uses your Claude account (no API key). It takes two steps because the Claude app cannot write into this app directly.</div>' +
    '<div class="card section" style="gap:8px"><div class="xname">1 · Send the photo to Claude</div><div class="note">Tap below and pick <b>Claude</b> in the share sheet. The photo and the instructions go into a new chat (the instructions are also copied, in case you need to paste them).</div><button class="btn primary block" data-act="bodyChatSend">' + (U.chatSent ? 'Send again' : 'Send photo to Claude') + '</button><button class="linkbtn" style="font-size:13px" data-act="bodyChatCopy">Copy the instructions only</button></div>' +
    '<div class="card section" style="gap:8px"><div class="xname">2 · Paste Claude\'s reply here</div><div class="note">When Claude answers, press and hold its reply, tap <b>Copy</b>, come back and paste it below.</div><textarea class="input" id="chatans" rows="5" style="padding:10px 14px;min-height:120px;font-size:13px" placeholder="Paste Claude\'s reply"></textarea><div class="note" id="chat-err" style="color:var(--down);min-height:0"></div><button class="btn primary block" data-act="bodyChatUse">Use this analysis</button></div>');
}
