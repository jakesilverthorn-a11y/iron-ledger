"""Use Strength Level's published table for every exercise they publish.

Inputs (checked into tools/):
  sl_data.json  Strength Level tables as collected: for each of their exercises, the five levels
                (Beginner..Elite) for men at 150/180/220 lb and women at 120/150/180 lb bodyweight,
                or an all-bodyweights average ("all") when only a comparison page was available.
  sl_map.json   which Iron Ledger exercises are the same lift as each Strength Level exercise.

For each mapped exercise:
  * full, sane bodyweight table  -> its own standard class 'sl_<slug>' (exact published numbers)
  * only averages / a noisy table -> keep the related standard, refit its multiplier so Novice to
                                     Advanced match the published numbers
Every exercise that does not use a published table directly is marked as estimated (ke=1), so the app
shows it with a ≈ and weighs it less in muscle-group ranks.

Run order:  std_fixes.py  ->  add_exercises.py  ->  sl_standards.py   (all idempotent)"""
import json, math, os, re
T = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(T)
LV = 5
# share of bodyweight moved, for turning added weight into extra reps on bodyweight moves
BF = {'Pull Ups': 1, 'Chin Ups': 1, 'Neutral Grip Pull Ups': 1, 'Muscle Ups': 1.05, 'Inverted Row': 0.6, 'Push Ups': 0.65, 'Diamond Push Ups': 0.65,
      'Decline Push Up': 0.72, 'Incline Push Up': 0.5, 'One Arm Push Ups': 0.65, 'Handstand Push Ups': 0.95, 'Dips': 0.95, 'Bench Dips': 0.6,
      'Sit Ups': 0.35, 'Crunches': 0.3, 'Hanging Leg Raise': 0.35, 'Hanging Knee Raise': 0.3, 'Bodyweight Squat': 0.8, 'Lunge': 0.8,
      'Back Extension': 0.5, 'Glute Bridge': 0.5}

def num(v):
    if isinstance(v, str): return 0.5 if '<' in v else float(re.sub(r'[^0-9.\-]', '', v) or 0)
    return float(v)

def table(s):
    """the published table in our layout, or None when incomplete"""
    out = {}
    for sex, keys in (('M', ('150', '180', '220')), ('F', ('120', '150', '180'))):
        rows = (s.get(sex) or {})
        if not all(k in rows and isinstance(rows[k], list) and len(rows[k]) == LV for k in keys): return None
        out[sex] = {k: [max(0.5, round(num(x), 1)) for x in rows[k]] for k in keys}
    return out

def sane(tb, reps):
    """reject tables that would make a poor yardstick: not rising level to level, or an implausibly long tail"""
    why = []
    for sex in tb:
        for bw, r in tb[sex].items():
            if any(r[i + 1] < r[i] for i in range(LV - 1)): why.append(sex + bw + ' not rising')
            if r[2] > 0 and r[4] / r[2] > (4.0 if reps else 2.8): why.append(sex + bw + ' elite %.1fx intermediate' % (r[4] / r[2]))
    for sex in tb:
        ks = sorted(tb[sex], key=float); lo, hi = tb[sex][ks[0]][2], tb[sex][ks[-1]][2]
        if not reps and not (0.9 * lo <= hi <= 1.9 * lo): why.append(sex + ' odd bodyweight trend')
    return why

def main():
    p = os.path.join(R, 'src', 'data.json'); d = json.load(open(p)); by = {e['n']: e for e in d['ex']}; std = d['std']
    SL = json.load(open(os.path.join(T, 'sl_data.json'))); MAP = json.load(open(os.path.join(T, 'sl_map.json')))
    exec(open(os.path.join(T, 'std_math.py')).read(), globals())   # stdAt() mirroring logic.js
    for k in [k for k in std if k.startswith('sl_')]: del std[k]
    direct, refit, skipped, log = set(), {}, [], []
    for sl, names in MAP.items():
        s = SL.get(sl)
        if not s or not names: continue
        reps = (s.get('unit') == 'reps') or s.get('per') == 'reps'
        tb = table(s); why = sane(tb, reps) if tb else ['no bodyweight table']
        slug = 'sl_' + re.sub(r'[^a-z0-9]+', '_', (s.get('url') or sl).rstrip('/').split('/strength-standards/')[-1].replace('/lb', '').lower()).strip('_')
        if not why:
            std[slug] = {'u': 'reps' if reps else 'lb', 'pd': 1 if 'per' in s and re.search(r'dumbbell|kettlebell', s['per'] or '') else 0,
                         'name': s.get('sl_name') or sl, 'src': s.get('url'), 'M': tb['M'], 'F': tb['F']}
            if reps: std[slug]['bf'] = BF.get(sl, 0.6)
            for n in names:
                if n in by: by[n]['k'] = slug; direct.add(n)
            log.append('direct  %-34s %s' % (sl, ', '.join(names)))
            continue
        # fall back: refit the multiplier of the exercise's current standard to the published Novice..Advanced
        for n in names:
            e = by.get(n); k = e and e.get('k')
            if not k: skipped.append(n + ' (' + sl + ': ' + '; '.join(why) + ')'); continue
            cls, m = (k.split('*') + ['1'])[:2]; m = float(m)
            if std[cls].get('u') == 'reps' and not reps: skipped.append(n + ' (published only as weight)'); continue
            lg = c = 0
            pts = []
            for sex, keys in (('M', ('150', '180', '220')), ('F', ('120', '150', '180'))):
                for bw in keys:
                    r = (s.get(sex) or {}).get(bw)
                    if isinstance(r, list) and len(r) == LV: pts.append((sex, float(bw), [num(x) for x in r]))
            if not pts and s.get('all'):
                for sex, bw in (('M', 185.0), ('F', 150.0)):
                    r = s['all'].get(sex)
                    if isinstance(r, list) and len(r) == LV: pts.append((sex, bw, [num(x) for x in r]))
            for sex, bw, r in pts:
                a = stdAt(std[cls], sex, bw)
                for i in (1, 2, 3):
                    if r[i] > 0: lg += math.log(a[i] * m / r[i]); c += 1
            if not c: skipped.append(n + ' (no usable numbers)'); continue
            g = math.exp(lg / c); nm = round(m / g, 3)
            e['k'] = cls + ('*' + str(nm) if abs(nm - 1) > 1e-9 else ''); refit[n] = (k, e['k'])
            log.append('refit   %-34s %s: %s -> %s  (%s)' % (sl, n, k, e['k'], '; '.join(why)))
    # honesty: anything not on a published table of its own is an estimate
    for e in d['ex']:
        if e.get('k'):
            if e['n'] in direct: e.pop('ke', None)
            else: e['ke'] = 1
            cls = e['k'].split('*')[0]
            if std[cls].get('u') == 'reps': e['bwk'] = 1
            else: e.pop('bwk', None)
        else:
            e.pop('ke', None); e.pop('bwk', None)
    json.dump(d, open(p, 'w'), separators=(',', ':'))
    open(os.path.join(T, 'sl_log.txt'), 'w').write('\n'.join(log + ['', 'skipped:'] + skipped) + '\n')
    print('direct tables:', len(direct), '· refit:', len(refit), '· skipped:', len(skipped), '· estimated:', sum(1 for e in d['ex'] if e.get('ke')))
if __name__ == '__main__': main()
