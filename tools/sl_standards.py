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

# close variants of a published lift: follow that lift's table with a ratio (still shown as estimates)
LINK = {
  'Standing Leg Curl': ('Lying Leg Curl', 0.5), 'Incline Hammer Curls': ('Incline Dumbbell Curl', 1.05), 'Kettlebell Arnold Press': ('Arnold Press', 1),
  'Cable Rear Delt Fly': ('Dumbbell Reverse Fly', 1), 'Dumbbell Lying Rear Lateral Raise': ('Dumbbell Reverse Fly', 1), 'Dumbbell Lying One-Arm Rear Lateral Raise': ('Dumbbell Reverse Fly', 1),
  'Front Cable Raise': ('Dumbbell Front Raise', 1), 'Front Incline Dumbbell Raise': ('Dumbbell Front Raise', 0.85), 'Side Laterals to Front Raise': ('Dumbbell Front Raise', 0.85),
  'Standing Dumbbell Straight-Arm Front Delt Raise Above Head': ('Dumbbell Front Raise', 0.75), 'Romanian Deadlift from Deficit': ('Romanian Deadlift', 0.92),
  'Smith Machine Upright Row': ('Upright Row', 1), 'Smith Machine One-Arm Upright Row': ('Upright Row', 0.47),
  'Calf Raise On A Dumbbell': ('Dumbbell Calf Raise', 1), 'Reverse Cable Curl': ('Reverse Barbell Curl', 1),
  'Reverse Barbell Preacher Curls': ('Reverse Barbell Curl', 0.95), 'Cable Rope Rear-Delt Rows': ('Face Pull', 1),
  'Cable Incline Triceps Extension': ('Cable Overhead Tricep Extension', 1), 'Cable Lying Triceps Extension': ('Cable Overhead Tricep Extension', 1),
  'Kneeling Cable Triceps Extension': ('Cable Overhead Tricep Extension', 1), 'Low Cable Triceps Extension': ('Cable Overhead Tricep Extension', 1),
  'Machine Triceps Extension': ('Cable Overhead Tricep Extension', 1), 'Cable One Arm Tricep Extension': ('Cable Overhead Tricep Extension', 0.45),
  'Standing Low-Pulley One-Arm Triceps Extension': ('Cable Overhead Tricep Extension', 0.45),
  'Cable Triceps Kickback': ('Dumbbell Tricep Kickback', 1), 'Seated Bent-Over One-Arm Dumbbell Triceps Extension': ('Dumbbell Tricep Kickback', 1),
  'Seated Bent-Over Two-Arm Dumbbell Triceps Extension': ('Dumbbell Tricep Kickback', 1), 'Standing Bent-Over One-Arm Dumbbell Triceps Extension': ('Dumbbell Tricep Kickback', 1),
  'Standing Bent-Over Two-Arm Dumbbell Triceps Extension': ('Dumbbell Tricep Kickback', 1),
  'Wide-Grip Decline Barbell Pullover': ('Barbell Pullover', 1), 'Rack Pull with Bands': ('Rack Pull', 0.85),
  'Box Squat with Bands': ('Box Squat', 0.85), 'Box Squat with Chains': ('Box Squat', 0.85), 'Reverse Band Box Squat': ('Box Squat', 1.1), 'Speed Box Squat': ('Box Squat', 0.6),
  'Split Jerk': ('Clean and Jerk', 1.05), 'Power Jerk': ('Clean and Jerk', 1), 'Squat Jerk': ('Clean and Jerk', 0.95), 'Jerk Balance': ('Clean and Jerk', 0.9),
  'Clean and Press': ('Clean and Jerk', 0.85), 'Cable Hip Adduction': ('Hip Adduction', 0.35),
  'Knee/Hip Raise On Parallel Bars': ('Hanging Knee Raise', 1), 'Close-Grip Push-Up off of a Dumbbell': ('Diamond Push Ups', 1),
  'Dumbbell Squat To A Bench': ('Dumbbell Squat', 1), 'Plie Dumbbell Squat': ('Goblet Squat', 1), 'Dumbbell Walking Lunge': ('Dumbbell Lunge', 1),
  'Dumbbell Step Ups': ('Dumbbell Lunge', 1), 'Dumbbell Lateral Lunge': ('Dumbbell Lunge', 0.8), 'Single-Leg Dumbbell Romanian Deadlift': ('Dumbbell Romanian Deadlift', 0.53),
  'Hammer Grip Incline DB Bench Press': ('Incline Dumbbell Bench Press', 1), 'Incline Dumbbell Bench With Palms Facing In': ('Incline Dumbbell Bench Press', 1),
  'Incline Dumbbell Flyes - With A Twist': ('Incline Dumbbell Fly', 1), 'Zottman Preacher Curl': ('Zottman Curl', 0.9),
  'Bent Over Dumbbell Rear Delt Raise With Head On Bench': ('Dumbbell Reverse Fly', 1), 'Lying Rear Delt Raise': ('Dumbbell Reverse Fly', 1),
  'Reverse Flyes With External Rotation': ('Dumbbell Reverse Fly', 1), 'Dumbbell One-Arm Upright Row': ('Dumbbell Upright Row', 0.95),
  'Palms-Down Dumbbell Wrist Curl Over A Bench': ('Dumbbell Reverse Wrist Curl', 1), 'Seated One-Arm Dumbbell Palms-Down Wrist Curl': ('Dumbbell Reverse Wrist Curl', 1),
  'Seated One-Arm Dumbbell Palms-Up Wrist Curl': ('Dumbbell Wrist Curl', 1),
  'Leverage Incline Chest Press': ('Chest Press', 0.9), 'Leverage Decline Chest Press': ('Chest Press', 1.05), 'Cable Chest Press': ('Chest Press', 1),
  'Incline Cable Chest Press': ('Chest Press', 0.9), 'Standing Cable Chest Press': ('Chest Press', 0.9),
  'Single-Arm Cable Crossover': ('Cable Fly', 1), 'Flat Bench Cable Flyes': ('Cable Fly', 1), 'Incline Cable Flye': ('Cable Fly', 1), 'Cable Iron Cross': ('Cable Fly', 1),
  'Cable Shoulder Press': ('Machine Shoulder Press', 1), 'Seated Cable Shoulder Press': ('Machine Shoulder Press', 1),
  'Smith Machine Overhead Shoulder Press': ('Machine Shoulder Press', 1), 'Alternating Cable Shoulder Press': ('Machine Shoulder Press', 0.46),
  'Cable Preacher Curl': ('Cable Bicep Curl', 1), 'High Cable Curls': ('Cable Bicep Curl', 1), 'Lying Cable Curl': ('Cable Bicep Curl', 1),
  'Overhead Cable Curl': ('Cable Bicep Curl', 1), 'Lying Close-Grip Bar Curl On High Pulley': ('Cable Bicep Curl', 1),
  'Standing One-Arm Cable Curl': ('Cable Bicep Curl', 0.45), 'Bayesian Cable Curl': ('Cable Bicep Curl', 0.42),
  'Sumo Deadlift with Bands': ('Sumo Deadlift', 0.85), 'Sumo Deadlift with Chains': ('Sumo Deadlift', 0.85), 'Reverse Band Sumo Deadlift': ('Sumo Deadlift', 1.1),
  'Smith Machine Close-Grip Bench Press': ('Smith Machine Bench Press', 0.95), 'Smith Machine Decline Press': ('Smith Machine Bench Press', 1.05),
  'Smith Machine Incline Bench Press': ('Smith Machine Bench Press', 0.85), 'Decline Smith Press': ('Smith Machine Bench Press', 1.05),
  'Barbell Side Split Squat': ('Barbell Lunge', 1), 'Barbell Step Ups': ('Barbell Lunge', 1), 'Elevated Back Lunge': ('Barbell Lunge', 1),
  'Decline EZ Bar Triceps Extension': ('Lying Tricep Extension (skull crusher)', 1), 'Incline Barbell Triceps Extension': ('Lying Tricep Extension (skull crusher)', 1),
  'Lying Close-Grip Barbell Triceps Extension Behind The Head': ('Lying Tricep Extension (skull crusher)', 1),
  'Lying Close-Grip Barbell Triceps Press To Chin': ('Lying Tricep Extension (skull crusher)', 1),
  'Standing Overhead Barbell Triceps Extension': ('Lying Tricep Extension (skull crusher)', 1),
  'Floor Press with Chains': ('Floor Press', 0.85), 'Board Press': ('Floor Press', 1.05), 'Pin Presses': ('Floor Press', 1.05),
  'Lying T-Bar Row': ('T-Bar Row', 1), 'Good Morning off Pins': ('Good Morning', 1), 'Hanging Bar Good Morning': ('Good Morning', 1), 'Seated Good Mornings': ('Good Morning', 1),
  'Push Press - Behind the Neck': ('Push Press', 1), 'Power Clean from Blocks': ('Power Clean', 1), 'Clean from Blocks': ('Clean', 1),
  'Hang Clean - Below the Knees': ('Hang Clean', 1.03), 'Split Clean': ('Clean', 1), 'Snatch from Blocks': ('Snatch', 1), 'Power Snatch from Blocks': ('Power Snatch', 1),
  'Smith Machine Stiff-Legged Deadlift': ('Stiff Leg Deadlift', 1), 'Wide Stance Stiff Legs': ('Stiff Leg Deadlift', 1), 'Romanian Deadlift from Deficit': ('Romanian Deadlift', 1),
  'Machine Preacher Curls': ('Machine Bicep Curl', 1),
}

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
    slug_of, exk = {}, {}
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
            slug_of[sl] = slug
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
        if sl not in slug_of and names and names[0] in by and by[names[0]].get('k'): exk[sl] = by[names[0]]['k']
    for n, (sl, m) in LINK.items():
        e = by.get(n); assert e, ('LINK: no exercise', n)
        if n in direct: continue
        if sl in slug_of: base, bm = slug_of[sl], 1.0
        elif sl in exk: c, mm = (exk[sl].split('*') + ['1'])[:2]; base, bm = c, float(mm)
        else: skipped.append(n + ' (link target ' + sl + ' unpublished)'); continue
        nm = round(bm * m, 3); old = e.get('k'); e['k'] = base + ('*' + str(nm) if abs(nm - 1) > 1e-9 else '')
        log.append('link    %-34s %s: %s -> %s' % (sl, n, old, e['k']))
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
