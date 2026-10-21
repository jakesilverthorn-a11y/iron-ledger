/* Guards against rating an exercise against a standard logged a different way.
   Run: node tools/check_standards.js   (exits 1 on a problem) */
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', 'src') + '/';
const logic = fs.readFileSync(R + 'logic.js', 'utf8').replace('__DATA__', fs.readFileSync(R + 'data.json', 'utf8'));
const ui = fs.readFileSync(R + 'ui.js', 'utf8'), li = ui.slice(ui.indexOf('function loadInfo(ex)'), ui.indexOf('function loadSuffix'));
const BAR = ['bench', 'squat', 'deadlift', 'ohp', 'incline', 'frontsquat', 'rdl', 'hipthrust', 'bbrow', 'bbcurl', 'bbshrug', 'wristcurl'];
eval(logic + '\nfunction uLabel(){return "lb"}\n' + li + `
var bad = [];
EX.forEach(function (e) {
  var k = parseK(e.k); if (!k) return;
  if (!DATA.std[k.cls]) { bad.push(e.n + ': unknown standard ' + k.cls); return; }
  var h = loadInfo(e).h, pd = DATA.std[k.cls].pd === 1, reps = DATA.std[k.cls].u === 'reps', perDb = /EACH|1 DB/.test(h) || (/kettlebell/.test(e.q) && h === 'LB');
  if (reps && !isBW(e)) bad.push(e.n + ': rated in reps but logged as weight');
  if (!reps && isBW(e)) bad.push(e.n + ': logged as bodyweight but rated by weight');
  if (perDb && BAR.indexOf(k.cls) >= 0 && k.m > 0.6) bad.push(e.n + ': logged per dumbbell/bell but rated against a barbell total (' + e.k + ')');
  if (/TOTAL/.test(h) && pd && k.m < 1.4) bad.push(e.n + ': logged as a bar total but rated per dumbbell (' + e.k + ')');
  if (!(k.m > 0)) bad.push(e.n + ': bad multiplier ' + e.k);
});
if (bad.length) { console.log(bad.join('\\n')); process.exit(1); } else console.log('standards OK (' + EX.filter(function (e) { return e.k; }).length + ' exercises)');
`);
