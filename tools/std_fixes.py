"""Corrections to which strength standard each exercise is rated against.

Each value is 'class*m' or None (no standard). m converts the weight you log for that exercise into the
standard lift's units:  equivalent = logged / m. The standard lift's convention matters:
  barbell classes (bench, squat, deadlift, rdl, ohp, bbcurl, bbrow, ...) = total on the bar
  dumbbell classes (dbbench, dbpress, dbcurl, dbrow, dblunge, dblat, ...) = weight of ONE dumbbell
  machine classes (pulldown, cablerow, legpress, ...) = stack number / plates loaded
  bodyweight classes (pullup, pushup, dip, situp, hangleg, calfbw) = reps, with added weight converted to reps
So an exercise logged per dumbbell must never use a barbell class with m = 1, and so on.
Ratios come from comparing intermediate standards (e.g. dumbbell bench per hand is about 0.40 of a barbell bench).
Run:  python3 tools/std_fixes.py   (edits src/data.json in place; safe to run again)"""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = {
  # --- logged per dumbbell / kettlebell, but rated against a barbell total ---
  'Stiff-Legged Dumbbell Deadlift': 'rdl*0.42',
  'Dumbbell Clean': 'rdl*0.3',
  'Dumbbell Squat': 'dblunge*1.2', 'Dumbbell Squat To A Bench': 'dblunge*1.2', 'Plie Dumbbell Squat': 'dblunge*1.2',
  'Goblet Squat': 'dblunge*1.2',
  'Front Squats With Two Kettlebells': 'frontsquat*0.23',
  'Kettlebell One-Legged Deadlift': 'rdl*0.2',
  'Alternating Hang Clean': 'rdl*0.18', 'Kettlebell Dead Clean': 'rdl*0.18', 'Kettlebell Hang Clean': 'rdl*0.18',
  'One-Arm Kettlebell Clean': 'rdl*0.18', 'One-Arm Kettlebell Swings': 'rdl*0.18', 'One-Arm Open Palm Kettlebell Clean': 'rdl*0.18',
  'Open Palm Kettlebell Clean': 'rdl*0.18', 'Double Kettlebell Alternating Hang Clean': 'rdl*0.18',
  'One-Arm Overhead Kettlebell Squats': 'dbpress*0.55',
  'Kettlebell Pistol Squat': None, 'Kettlebell Turkish Get-Up (Squat style)': None, 'Kettlebell Turkish Get-Up (Lunge style)': None,
  'Lunge Pass Through': None,
  'Palms-Up Dumbbell Wrist Curl Over A Bench': 'wristcurl*0.45',
  'Seated Dumbbell Palms-Up Wrist Curl': 'wristcurl*0.45',
  'Seated One-Arm Dumbbell Palms-Up Wrist Curl': 'wristcurl*0.5',
  'Dumbbell Lying Pronation': None, 'Dumbbell Lying Supination': None, 'Wrist Rotations with Straight Bar': None,
  # --- dumbbell or barbell calf work against the calf machine ---
  'Standing Dumbbell Calf Raise': 'calfmach*0.3', 'Calf Raise On A Dumbbell': 'calfmach*0.3', 'Dumbbell Seated One-Leg Calf Raise': None,
  'Standing Barbell Calf Raise': 'calfmach*0.8', 'Rocking Standing Calf Raise': 'calfmach*0.8', 'Barbell Seated Calf Raise': 'calfmach*0.5',
  'Smith Machine Reverse Calf Raises': None, 'Calf Press': 'calfmach*1.3', 'Calf Press On The Leg Press Machine': 'calfmach*1.3',
  'Seated Calf Raise': 'calfmach*0.7',
  # --- wrong family entirely ---
  'Spell Caster': None, 'Bent Press': None, 'Kettlebell Figure 8': None, 'Kettlebell Pass Between The Legs': None, "Landmine 180's": None,
  'Smith Machine Hip Raise': None, 'Smith Machine Hang Power Clean': 'deadlift*0.55', 'Barbell Hack Squat': 'deadlift*0.6',
  'Decline Smith Press': 'bench*0.95', 'Smith Machine Leg Press': 'legpress*0.5',
  'Bear Crawl Sled Drags': None, 'Sled Drag - Harness': None, 'Sled Overhead Backward Walk': None, 'Sled Overhead Triceps Extension': None,
  'Sled Push': None, 'Sled Reverse Flye': None, 'Sled Row': None,
  'Barbell Rear Delt Row': 'bbrow*0.6', 'Standing Front Barbell Raise Over Head': 'dbfront*1.6', 'Lunge Sprint': None,
  'Smith Single-Leg Split Squat': 'dblunge*2.2',
  # --- weighted or equipment moves scored as if they were bodyweight reps ---
  'Advanced Kettlebell Windmill': None, 'Kettlebell Windmill': None, 'Double Kettlebell Windmill': None,
  'Dumbbell Side Bend': None, 'Barbell Side Bend': None, 'One-Arm High-Pulley Cable Side Bends': None, 'Weighted Ball Side Bend': None,
  'Cable Russian Twists': None, 'Plate Twist': None, 'Reverse Hyperextension': None, 'Jerk Dip Squat': None,
  'Rope Crunch': 'cablecrunch*1', 'Standing Rope Crunch': 'cablecrunch*1',
  # --- cable / machine moves ---
  'Standing One-Arm Cable Curl': 'bbcurl*0.45', 'Cable Hammer Curls - Rope Attachment': 'hammer*1.5',
  'Pull Through': 'hipthrust*0.3', 'Cable Deadlifts': 'deadlift*0.6',
  'Calf-Machine Shoulder Shrug': 'bbshrug*1', 'Alternating Cable Shoulder Press': 'ohp*0.6', 'Chair Squat': None,
  'Cable Internal Rotation': 'dblat*0.5', 'External Rotation with Cable': 'dblat*0.5', 'Cable Rope Rear-Delt Rows': 'dblat*1.8',
  'Reverse Machine Flyes': 'dblat*1.8', 'One-Legged Cable Kickback': None,
  'Cable One Arm Tricep Extension': 'dbtri*0.5', 'Standing Low-Pulley One-Arm Triceps Extension': 'dbtri*0.5',
  'Pallof Press': None, 'Pallof Press With Rotation': None, 'Cable Judo Flip': None, 'Standing Cable Lift': None,
  'Standing Cable Wood Chop': None, 'Bosu Ball Cable Crunch With Side Bends': None, 'Cable Reverse Crunch': None,
  'Upright Cable Row': 'cablerow*0.6', 'Low Pulley Row To Neck': 'cablerow*0.7',
  'Kneeling Single-Arm High Pulley Row': 'cablerow*0.5', 'Seated One-arm Cable Pulley Rows': 'cablerow*0.5', 'Shotgun Row': 'cablerow*0.5',
  'Glute Ham Raise': None, 'Single-Leg Leg Extension': 'legext*0.5', 'Cable Hip Adduction': 'legext*0.3',
  'One Arm Lat Pulldown': 'pulldown*0.5', 'Straight-Arm Pulldown': 'pulldown*0.5', 'Rope Straight-Arm Pulldown': 'pulldown*0.5',
  # --- one dumbbell / per-dumbbell moves with the wrong ratio ---
  'Dumbbell Raise': 'dbfront*1.6', 'Single Dumbbell Raise': 'dbfront*1.6', 'Dumbbell One-Arm Upright Row': 'dblat*1.3',
  'Bent-Arm Dumbbell Pullover': 'dbrow*0.6', 'Straight-Arm Dumbbell Pullover': 'dbrow*0.6',
  'Dumbbell One-Arm Triceps Extension': 'dbtri*0.5', 'One Arm Pronated Dumbbell Triceps Extension': 'dbtri*0.5',
  'One Arm Supinated Dumbbell Triceps Extension': 'dbtri*0.5', 'Seated Bent-Over One-Arm Dumbbell Triceps Extension': 'dbtri*0.5',
  'Seated Bent-Over Two-Arm Dumbbell Triceps Extension': 'dbtri*0.5', 'Standing Bent-Over One-Arm Dumbbell Triceps Extension': 'dbtri*0.5',
  'Standing Bent-Over Two-Arm Dumbbell Triceps Extension': 'dbtri*0.5', 'Standing One-Arm Dumbbell Triceps Extension': 'dbtri*0.5',
  'Decline Dumbbell Triceps Extension': 'dbtri*0.6', 'Dumbbell Tricep Extension -Pronated Grip': 'dbtri*0.6',
  'Lying Dumbbell Tricep Extension': 'dbtri*0.6', 'Standing Dumbbell Triceps Extension': 'dbtri*1', 'Tricep Dumbbell Kickback': 'dbtri*0.5',
  'Seated Triceps Press': 'dbtri*1', 'Tate Press': 'dbtri*0.6', 'Close-Grip Dumbbell Press': 'dbbench*0.7', 'Dumbbell Floor Press': 'dbbench*0.9',
  'Kettlebell Halo': 'dbpress*0.35', 'Kettlebell Pirate Ships': 'dbpress*0.35', 'Kettlebell Sumo High Pull': 'dbrow*0.6',
  'Dumbbell Incline Row': 'dbrow*1', 'Dumbbell Incline Shoulder Raise': None, 'Front Incline Dumbbell Raise': 'dbfront*1',
  'Incline Dumbbell Flyes': 'dbfly*1', 'Incline Dumbbell Flyes - With A Twist': 'dbfly*1', 'Decline Dumbbell Flyes': 'dbfly*1',
  'Around The Worlds': 'dbfly*0.4',
  'Cuban Press': 'dblat*0.6', 'Dumbbell Scaption': 'dblat*1', 'External Rotation': 'dblat*0.5', 'Iron Cross': 'dblat*0.8',
  'Power Partials': 'dblat*1', 'Alternating Deltoid Raise': 'dblat*1', 'Standing Dumbbell Upright Row': 'dblat*1.4',
  'Middle Back Shrug': 'dbshrug*0.5',
  # --- barbell moves with the wrong lift or ratio ---
  'Board Press': 'bench*0.95', 'Floor Press': 'bench*0.9', 'Floor Press with Chains': 'bench*0.9', 'Pin Presses': 'bench*0.95',
  'JM Press': 'bench*0.6', 'One Arm Floor Press': None, 'Close-Grip EZ Bar Curl': 'bbcurl*1', 'Close-Grip EZ-Bar Curl with Band': 'bbcurl*1',
  'Bodyweight Flyes': None, 'Decline Close-Grip Bench To Skull Crusher': 'bench*0.6', 'Reverse Triceps Bench Press': 'bench*0.9',
  'Barbell Guillotine Bench Press': 'bench*0.8',
  'Bent-Arm Barbell Pullover': 'bbrow*0.4', 'Wide-Grip Decline Barbell Pullover': 'bbrow*0.4', 'Front Raise And Pullover': None,
  'Upright Barbell Row': 'ohp*0.75', 'Smith Machine Upright Row': 'ohp*0.75', 'Smith Machine One-Arm Upright Row': 'ohp*0.35',
  'Seated Barbell Twist': None, 'Barbell Incline Shoulder Raise': None, 'Anti-Gravity Press': None, 'Car Drivers': None,
  'Landmine Linear Jammer': None, 'Single-Arm Linear Jammer': None, 'Rack Delivery': None, 'Smith Incline Shoulder Raise': None,
  'Straight Raises on Incline Bench': None, 'Jerk Balance': 'ohp*1.1', 'Bradford/Rocky Presses': 'ohp*0.8', 'Standing Bradford Press': 'ohp*0.8',
  'One-Arm Side Deadlift': 'deadlift*0.4',
  'Clean': 'rdl*0.75', 'Power Clean': 'rdl*0.73', 'Power Clean from Blocks': 'rdl*0.75', 'Hang Snatch': 'rdl*0.5',
  'Hang Snatch - Below Knees': 'rdl*0.52', 'Muscle Snatch': 'rdl*0.45', 'Power Snatch': 'rdl*0.55', 'Snatch Pull': 'rdl*0.8',
  'Split Snatch': 'rdl*0.55',
  'Clean Pull': 'squat*0.9', 'Clean from Blocks': 'squat*0.7', 'Hang Clean': 'squat*0.64', 'Hang Clean - Below the Knees': 'squat*0.66',
  'Heaving Snatch Balance': 'squat*0.5', 'Power Jerk': 'ohp*1.15', 'Power Snatch from Blocks': 'squat*0.5', 'Snatch': 'squat*0.55',
  'Snatch Balance': 'squat*0.55', 'Snatch from Blocks': 'squat*0.55', 'Split Clean': 'squat*0.68', 'Split Jerk': 'ohp*1.2',
  'Squat Jerk': 'ohp*1.1', 'Weighted Jump Squat': 'squat*0.3', 'Kneeling Jump Squat': 'squat*0.3', 'Speed Squats': 'squat*0.6',
  'Speed Box Squat': 'squat*0.6', 'Weighted Sissy Squat': None, 'One Leg Barbell Squat': 'squat*0.5', 'Overhead Squat': 'squat*0.6',
  'Frankenstein Squat': 'frontsquat*0.8', 'Jefferson Squats': 'deadlift*0.8', 'Smith Machine Pistol Squat': 'squat*0.45',
  # --- bodyweight moves that use equipment but where the load is your body ---
  'Barbell Ab Rollout - On Knees': 'hangleg*1', 'Barbell Rollout from Bench': 'hangleg*1',
  # --- bodyweight variants: m scales reps (logged reps / m = standard reps), so easier moves get m > 1 ---
  'Handstand Push-Ups': 'pushup*0.2', 'Single-Arm Push-Up': 'pushup*0.15', 'Incline Push-Up': 'pushup*1.3', 'Incline Push-Up Close-Grip': 'pushup*1.2',
  'Incline Push-Up Medium': 'pushup*1.3', 'Incline Push-Up Reverse Grip': 'pushup*1.2', 'Incline Push-Up Wide': 'pushup*1.3',
  'Decline Push-Up': 'pushup*0.8', 'Push-Ups With Feet Elevated': 'pushup*0.8', 'Push-Ups - Close Triceps Position': 'pushup*0.85',
  'Close-Grip Push-Up off of a Dumbbell': 'pushup*0.85', 'Plyo Kettlebell Pushups': 'pushup*0.7', 'Suspended Push-Up': 'pushup*0.8',
  'One Arm Chin-Up': 'pullup*0.12', 'Gironda Sternum Chins': 'pullup*0.7', 'Inverted Row': 'pullup*1.6', 'Scapular Pull-Up': None,
  'Bench Dips': 'dip*2', 'Weighted Bench Dip': 'dip*2',
  'Flutter Kicks': 'hangleg*2.5', 'Leg Pull-In': 'hangleg*2.5', 'Flat Bench Leg Pull-In': 'hangleg*2.5', 'Seated Flat Bench Leg Pull-In': 'hangleg*2.5',
  'Flat Bench Lying Leg Raise': 'hangleg*2', 'Reverse Crunch': 'hangleg*2', 'Decline Reverse Crunch': 'hangleg*1.5', 'Jackknife Sit-Up': 'hangleg*1.5',
  'Side Jackknife': 'hangleg*1.5', 'Knee/Hip Raise On Parallel Bars': 'hangleg*1.3', 'Hanging Pike': 'hangleg*0.6', 'Barbell Ab Rollout': 'hangleg*0.2',
  'Side Bridge': None, 'Spider Crawl': None, 'Wind Sprints': None, 'Butt Lift (Bridge)': 'situp*1.5', 'Gorilla Chin/Crunch': 'situp*0.3',
  # --- second-pass ratio fixes ---
  'Palms-Down Wrist Curl Over A Bench': 'wristcurl*0.55', 'Seated Palms-Down Barbell Wrist Curl': 'wristcurl*0.55',
  'Palms-Down Dumbbell Wrist Curl Over A Bench': 'wristcurl*0.25', 'Seated Dumbbell Palms-Down Wrist Curl': 'wristcurl*0.25',
  'Seated One-Arm Dumbbell Palms-Down Wrist Curl': 'wristcurl*0.28',
}
BW_CLS = {'pullup', 'pushup', 'dip', 'situp', 'calfbw', 'hangleg'}

def main():
    p = os.path.join(R, 'src', 'data.json'); d = json.load(open(p)); names = {e['n'] for e in d['ex']}
    missing = [n for n in FIX if n not in names]
    assert not missing, missing
    ch = 0
    for e in d['ex']:
        if e['n'] in FIX:
            v = FIX[e['n']]
            if v is None:
                if 'k' in e: del e['k']; ch += 1
            elif e.get('k') != v: e['k'] = v; ch += 1
        k = e.get('k')
        # rated in reps -> it is a bodyweight move, whatever gear it uses (weight entered = added load)
        if k and k.split('*')[0] in BW_CLS: e['bwk'] = 1
        elif 'bwk' in e: del e['bwk']
    json.dump(d, open(p, 'w'), separators=(',', ':'))
    print('changed', ch, 'of', len(FIX))
if __name__ == '__main__': main()
