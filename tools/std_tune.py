"""Second pass on which standard each exercise is rated against (Nov 2026 audit).
Found by listing every ranked exercise's Intermediate target for a 180 lb man next to its closest relatives
and fixing the ones that were clearly out of line. Same 'class*m' convention as std_fixes.py
(target = standard x m; an exercise logged per dumbbell uses a dumbbell class, and so on).
Run last:  std_fixes.py -> sl_standards.py -> add_exercises.py -> std_tune.py   (safe to run again)"""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TUNE = {
  # good mornings were rated against the RDL (280 lb) instead of the good morning (189 lb); seated is much shorter-levered
  'Stiff Leg Barbell Good Morning': 'sl_good_morning', 'Seated Good Mornings': 'sl_good_morning*0.6',
  # one-arm landmine rows were rated like a two-handed barbell row
  'One-Arm Long Bar Row': 'sl_t_bar_row*0.55', 'Bent Over One-Arm Long Bar Row': 'sl_t_bar_row*0.55',
  'Bent Over Two-Arm Long Bar Row': 'sl_t_bar_row', 'Alternating Kettlebell Row': 'dbrow*0.75',
  # a lat movement (straight-arm, on an incline bench) that was rated as a triceps pushdown
  'Cable Incline Pushdown': 'sl_straight_arm_pulldown*0.8',
  # cable curls in weak positions were rated like a standing two-hand cable curl
  'Overhead Cable Curl': 'sl_cable_curl*0.5', 'High Cable Curls': 'sl_cable_curl*0.5',
  'Lying Cable Curl': 'sl_cable_curl*0.85', 'Cable Preacher Curl': 'sl_cable_curl*0.85', 'Lying Close-Grip Bar Curl On High Pulley': 'sl_cable_curl*0.8',
  # Olympic pulls and variants: tie them to the lift they come from, not to the RDL or squat
  'Clean Pull': 'sl_clean*1.15', 'Snatch Pull': 'sl_snatch*1.15', 'Muscle Snatch': 'sl_snatch*0.75',
  'Hang Snatch': 'sl_snatch*0.9', 'Hang Snatch - Below Knees': 'sl_snatch*0.92', 'Split Snatch': 'sl_snatch',
  # a strict press after the clean: the press is the limit
  'Clean and Press': 'sl_overhead_press',
  # presses that were rated too close to a full bench
  'Neck Press': 'bench*0.75', 'Close-Grip EZ-Bar Press': 'bench*0.85',
  'Two-Arm Kettlebell Clean': 'dbpress',
  # strength exercises that had no standard at all
  'Donkey Calf Raises': 'sl_machine_calf_raise*0.9', 'Dumbbell Seated One-Leg Calf Raise': 'sl_seated_calf_raise*0.3',
  'Front Plate Raise': 'sl_dumbbell_front_raise*1.2', 'Reverse Plate Curls': 'sl_reverse_barbell_curl*0.4',
  'Mixed Grip Chin': 'sl_pull_ups', 'Side To Side Chins': 'sl_pull_ups*0.6',
}
REPS_BW = {'pullup', 'pushup', 'dip', 'situp', 'calfbw', 'hangleg'}
def main():
    p = os.path.join(R, 'src', 'data.json'); d = json.load(open(p)); by = {e['n']: e for e in d['ex']}
    for n, k in TUNE.items():
        assert n in by, ('missing', n); cls = k.split('*')[0]; assert cls in d['std'], ('no standard', k)
        e = by[n]; e['k'] = k; e['ke'] = 1
    # rep-based standards need the exercise treated as bodyweight work (added weight becomes extra reps)
    for e in d['ex']:
        cls = (e.get('k') or '').split('*')[0]
        if cls and (cls in REPS_BW or d['std'].get(cls, {}).get('u') == 'reps'): e['bwk'] = 1
    json.dump(d, open(p, 'w'), separators=(',', ':'))
    print('tuned', len(TUNE))
if __name__ == '__main__': main()
