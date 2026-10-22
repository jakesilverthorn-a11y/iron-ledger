"""Adds common gym exercises the original library lacked, plus everyday nicknames for existing ones.
Each new exercise borrows a cartoon demo ('fx') and, when it is the same movement, the photos ('ph') of an existing one.
Run after std_fixes.py:  python3 tools/add_exercises.py   (idempotent)"""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def X(n, q, l, m, p, s, pm, e, i, fx, ph=False, k=None, c='strength'):
    return dict(n=n, q=q, l=l, m=m, c=c, p=p, s=s, pm=pm, e=e, i=i, fx=fx, ph=ph, k=k)

NEW = [
  # --- hinges ---
  X('Dumbbell Deadlift', 'dumbbell', 'beginner', 'compound', ['Hamstrings'], ['Back', 'Glutes', 'Quads', 'Forearms'], ['hamstrings'], ['dumbbell'],
    ['Stand with feet hip-width apart, a dumbbell in each hand at your sides or in front of your thighs.', 'Push your hips back and bend your knees to lower the dumbbells along your legs until they reach mid-shin, keeping your back flat and chest up.', 'Drive through your feet and squeeze your glutes to stand up tall.', 'Lower under control and repeat.'],
    'Stiff-Legged Dumbbell Deadlift', True, 'deadlift*0.38'),
  X('Dumbbell Romanian Deadlift', 'dumbbell', 'beginner', 'compound', ['Hamstrings'], ['Back', 'Glutes', 'Forearms'], ['hamstrings'], ['dumbbell'],
    ['Stand tall holding a dumbbell in each hand in front of your thighs, knees slightly bent.', 'Keeping your back flat, push your hips back and slide the dumbbells down the front of your legs until you feel a strong stretch in your hamstrings (usually just below the knee).', 'Drive your hips forward to return to standing, squeezing your glutes at the top.', 'Keep the dumbbells close to your legs the whole time.'],
    'Stiff-Legged Dumbbell Deadlift', True, 'rdl*0.42'),
  X('Single-Leg Dumbbell Romanian Deadlift', 'dumbbell', 'intermediate', 'compound', ['Hamstrings'], ['Glutes', 'Back', 'Core'], ['hamstrings'], ['dumbbell'],
    ['Hold a dumbbell in one hand and stand on the opposite leg with a soft knee.', 'Hinge at the hip, reaching the dumbbell toward the floor while your free leg extends straight behind you.', 'Keep your hips square to the floor and your back flat; stop when your torso is about parallel to the floor or you feel a deep hamstring stretch.', 'Squeeze the glute of the standing leg to return upright. Finish all reps, then switch sides.'],
    'Kettlebell One-Legged Deadlift', True, 'rdl*0.22'),
  X('Kettlebell Deadlift', 'kettlebells', 'beginner', 'compound', ['Hamstrings'], ['Glutes', 'Back', 'Quads', 'Forearms'], ['hamstrings'], ['kettlebell'],
    ['Stand with the kettlebell between your feet, feet a little wider than hip-width.', 'Push your hips back, bend your knees and grab the handle with both hands, back flat.', 'Stand up by driving through your feet and squeezing your glutes, keeping the bell close.', 'Hinge back down and touch the bell to the floor between reps.'],
    'Kettlebell Dead Clean', False, 'deadlift*0.3'),
  X('Kettlebell Swing', 'kettlebells', 'beginner', 'compound', ['Hamstrings'], ['Glutes', 'Shoulders', 'Core', 'Back'], ['hamstrings'], ['kettlebell'],
    ['Stand with feet shoulder-width apart, the kettlebell a foot in front of you. Hinge and grab the handle with both hands.', 'Hike the bell back between your legs, then snap your hips forward to swing it to chest height. Your arms just guide it.', 'Let the bell fall back between your legs as you hinge again, and go straight into the next rep.', 'Keep your back flat and finish each rep standing tall with glutes squeezed.'],
    'One-Arm Kettlebell Swings', True, 'rdl*0.25'),
  X('Dumbbell Hip Thrust', 'dumbbell', 'beginner', 'compound', ['Glutes'], ['Hamstrings'], ['glutes'], ['dumbbell', 'bench'],
    ['Sit on the floor with your upper back against the edge of a bench and a dumbbell resting across your hips. Hold it in place with both hands.', 'Plant your feet flat, about hip-width apart, knees bent.', 'Drive through your heels to lift your hips until your body forms a straight line from shoulders to knees, squeezing your glutes hard.', 'Lower your hips under control and repeat.'],
    'Barbell Hip Thrust', False, 'hipthrust*0.35'),
  X('Machine Hip Thrust', 'machine', 'beginner', 'compound', ['Glutes'], ['Hamstrings'], ['glutes'], ['machine_other'],
    ['Set up in the hip thrust (glute drive) machine with the pad across your hips and upper back on the backrest.', 'Place your feet flat on the platform, about hip-width apart.', 'Drive your hips up until they are fully extended and squeeze your glutes at the top.', 'Lower under control and repeat.'],
    'Barbell Hip Thrust', False, 'hipthrust*1'),
  # --- squats and lunges ---
  X('Dumbbell Bulgarian Split Squat', 'dumbbell', 'intermediate', 'compound', ['Quads'], ['Glutes', 'Hamstrings'], ['quadriceps'], ['dumbbell', 'bench'],
    ['Stand about two feet in front of a bench holding a dumbbell in each hand. Reach one foot back and rest its top on the bench.', 'Lower straight down by bending your front knee until your back knee nearly touches the floor.', 'Keep your torso upright and your front knee tracking over your toes.', 'Drive through your front heel to stand back up. Finish all reps, then switch legs.'],
    'Split Squat with Dumbbells', True, 'dblunge*0.9'),
  X('Bulgarian Split Squat', 'body only', 'beginner', 'compound', ['Quads'], ['Glutes', 'Hamstrings'], ['quadriceps'], ['bodyweight', 'bench'],
    ['Stand about two feet in front of a bench and rest the top of one foot on it behind you.', 'Lower straight down by bending your front knee until your back knee nearly touches the floor.', 'Keep your chest up and your front knee in line with your toes.', 'Push through your front heel to stand back up. Finish all reps, then switch legs.'],
    'Split Squats', True),
  X('Dumbbell Walking Lunge', 'dumbbell', 'beginner', 'compound', ['Quads'], ['Glutes', 'Hamstrings', 'Calves'], ['quadriceps'], ['dumbbell'],
    ['Stand tall with a dumbbell in each hand at your sides.', 'Take a long step forward and lower until both knees are bent about 90 degrees.', 'Push through your front foot and bring your back foot forward into the next step.', 'Keep walking, alternating legs. Count each step as one rep, or each pair as one, the same way every time.'],
    'Dumbbell Lunges', True, 'dblunge*1'),
  X('Dumbbell Goblet Squat', 'dumbbell', 'beginner', 'compound', ['Quads'], ['Glutes', 'Hamstrings', 'Core'], ['quadriceps'], ['dumbbell'],
    ['Hold one dumbbell vertically against your chest, cupping the top end with both hands.', 'Stand with feet slightly wider than shoulder-width, toes turned out a little.', 'Sit down between your heels, keeping your chest up and elbows inside your knees.', 'Drive through your feet to stand back up.'],
    'Goblet Squat', True, 'dblunge*1.2'),
  X('Dumbbell Front Squat', 'dumbbell', 'intermediate', 'compound', ['Quads'], ['Glutes', 'Hamstrings', 'Core'], ['quadriceps'], ['dumbbell'],
    ['Hold a dumbbell in each hand and rest one end of each on the front of your shoulders, elbows pointing forward.', 'Stand with feet about shoulder-width apart.', 'Squat down until your thighs are at least parallel to the floor, keeping your chest tall.', 'Drive back up through your whole foot.'],
    'Goblet Squat', False, 'dblunge*1.1'),
  X('Dumbbell Lateral Lunge', 'dumbbell', 'beginner', 'compound', ['Quads'], ['Glutes', 'Hamstrings'], ['adductors'], ['dumbbell'],
    ['Stand tall holding a dumbbell at your chest or one in each hand.', 'Take a big step out to the side and sit your hips back over that foot, keeping the other leg straight.', 'Keep your chest up and the bent knee over your toes.', 'Push off the outside foot to return to standing. Alternate sides or do all reps on one side first.'],
    'Barbell Side Split Squat', False, 'dblunge*0.8'),
  X('Curtsy Lunge', 'body only', 'beginner', 'compound', ['Glutes'], ['Quads', 'Hamstrings'], ['glutes'], ['bodyweight'],
    ['Stand with feet hip-width apart, hands on hips or clasped at your chest.', 'Step one foot back and across behind the other, like a curtsy, and bend both knees.', 'Lower until your front thigh is about parallel to the floor.', 'Push through the front heel to return. Alternate sides.'],
    'Crossover Reverse Lunge', True),
  X('Wall Sit', 'body only', 'beginner', 'isolation', ['Quads'], ['Glutes'], ['quadriceps'], ['bodyweight'],
    ['Stand with your back flat against a wall and slide down until your knees are bent about 90 degrees.', 'Keep your knees over your ankles and your back pressed into the wall.', 'Hold the position. Log the seconds you held as the reps.', 'Stand up by sliding back up the wall.'],
    'Barbell Squat To A Bench', False),
  # --- back ---
  X('Pendlay Row', 'barbell', 'intermediate', 'compound', ['Back'], ['Biceps', 'Shoulders', 'Forearms'], ['middle back'], ['barbell'],
    ['Set up like a deadlift with the bar over mid-foot, then bend over until your torso is close to parallel with the floor, back flat.', 'Grip the bar just outside shoulder width.', 'Row the bar explosively to your lower chest, leading with your elbows.', 'Lower it all the way back to the floor and reset before each rep.'],
    'Bent Over Barbell Row', True, 'bbrow*0.95'),
  X('Seated Machine Row', 'machine', 'beginner', 'compound', ['Back'], ['Biceps', 'Shoulders'], ['middle back'], ['row_machine'],
    ['Sit at the row machine with your chest against the pad and feet planted. Grab the handles with arms straight.', 'Pull the handles toward your body, driving your elbows back and squeezing your shoulder blades together.', 'Pause briefly, then let your arms straighten under control.', 'Keep your chest on the pad the whole time.'],
    'Seated Cable Rows', False, 'cablerow*1'),
  X('Machine Assisted Pull-Up', 'machine', 'beginner', 'compound', ['Back'], ['Biceps', 'Forearms'], ['lats'], ['machine_other'],
    ['Set the assistance weight, then kneel or stand on the platform and grab the handles.', 'Pull yourself up until your chin clears the handles, driving your elbows down toward your ribs.', 'Lower under control until your arms are straight.', 'Use less assistance over time as you get stronger.'],
    'Pullups', False),
  X('Neutral-Grip Pull-Up', 'body only', 'intermediate', 'compound', ['Back'], ['Biceps', 'Forearms'], ['lats'], ['pullup_bar'],
    ['Hang from parallel handles with your palms facing each other and arms straight.', 'Pull yourself up until your chin clears the handles, keeping your chest up.', 'Lower all the way down under control.', 'Add weight with a belt or vest once bodyweight reps get easy.'],
    'Pullups', True, 'pullup*1.05'),
  X("Dumbbell Farmer's Carry", 'dumbbell', 'beginner', 'compound', ['Forearms'], ['Back', 'Core', 'Glutes', 'Quads'], ['forearms'], ['dumbbell'],
    ['Pick up a heavy dumbbell in each hand and stand tall, shoulders back.', 'Walk with short, quick steps, keeping your core braced and the dumbbells still at your sides.', 'Go for a set distance or time. Log the seconds or steps as reps.', 'Set the dumbbells down with a flat back.'],
    'Dumbbell Shrug', "Farmer's Walk"),
  # --- shoulders ---
  X('Cable Lateral Raise', 'cable', 'beginner', 'isolation', ['Shoulders'], [], ['shoulders'], ['cable'],
    ['Set a handle at the bottom of a cable and stand side-on to it, holding the handle in the far hand.', 'With a slight bend in the elbow, raise your arm out to the side until it is level with your shoulder.', 'Lower slowly, keeping tension on the cable.', 'Finish all reps, then switch sides.'],
    'Cable Seated Lateral Raise', True, 'dblat*1'),
  X('Machine Lateral Raise', 'machine', 'beginner', 'isolation', ['Shoulders'], [], ['shoulders'], ['shoulder_machine'],
    ['Sit in the lateral raise machine with the pads against the outside of your arms and the pivot lined up with your shoulders.', 'Raise your arms out to the sides until they are level with your shoulders.', 'Lower slowly.', 'Keep your shoulders down, away from your ears.'],
    'Side Lateral Raise', False, 'dblat*1.8'),
  X('Dumbbell Y-Raise', 'dumbbell', 'beginner', 'isolation', ['Shoulders'], ['Back'], ['shoulders'], ['dumbbell', 'bench'],
    ['Lie chest-down on an incline bench with a light dumbbell in each hand, arms hanging.', 'With thumbs up, raise the dumbbells up and out to form a Y with your body.', 'Pause at the top, squeezing your upper back.', 'Lower slowly.'],
    'Front Incline Dumbbell Raise', False, 'dblat*0.6'),
  X('Dumbbell Push Press', 'dumbbell', 'intermediate', 'compound', ['Shoulders'], ['Triceps', 'Quads'], ['shoulders'], ['dumbbell'],
    ['Stand holding a dumbbell in each hand at shoulder height, palms in.', 'Dip slightly by bending your knees, then drive up through your legs.', 'Use that momentum to press the dumbbells overhead until your arms are straight.', 'Lower them back to your shoulders and repeat.'],
    'Dumbbell Shoulder Press', False, 'dbpress*1.2'),
  X('Landmine Press', 'barbell', 'beginner', 'compound', ['Shoulders'], ['Chest', 'Triceps', 'Core'], ['shoulders'], ['barbell', 'landmine'],
    ['Wedge one end of a barbell into a landmine or corner. Hold the other end at your shoulder with one hand.', 'Stand in a staggered stance and brace your core.', 'Press the bar up and forward until your arm is straight.', 'Lower it back to your shoulder. Finish all reps, then switch sides. Log the plates you added.'],
    'Standing Military Press', False),
  # --- arms ---
  X('Bayesian Cable Curl', 'cable', 'intermediate', 'isolation', ['Biceps'], ['Forearms'], ['biceps'], ['cable'],
    ['Set a handle at the bottom of a cable. Face away from it and hold the handle with your arm reaching slightly behind your body.', 'Step forward until you feel a stretch in your biceps.', 'Curl the handle up, keeping your elbow still and slightly behind you.', 'Lower slowly into the stretch. Finish all reps, then switch arms.'],
    'Standing One-Arm Cable Curl', False, 'bbcurl*0.42'),
  X('Cable Triceps Kickback', 'cable', 'beginner', 'isolation', ['Triceps'], [], ['triceps'], ['cable'],
    ['Set a handle (or just the cable end) low. Hinge forward and hold it in one hand with your upper arm tucked against your side.', 'Straighten your elbow to push the handle back until your arm is fully extended.', 'Pause, squeezing your triceps.', 'Bend your elbow to return slowly. Finish all reps, then switch arms.'],
    'Tricep Dumbbell Kickback', False, 'dbtri*0.4'),
  # --- chest / bodyweight ---
  X('Knee Push-Up', 'body only', 'beginner', 'compound', ['Chest'], ['Shoulders', 'Triceps'], ['chest'], ['bodyweight'],
    ['Start in a push-up position with your knees on the floor and your body in a straight line from head to knees.', 'Lower your chest to just above the floor, elbows about 45 degrees from your body.', 'Push back up until your arms are straight.', 'Move on to full push-ups once you can do 15 or more.'],
    'Pushups', True, 'pushup*2'),
  X('Burpee', 'body only', 'beginner', 'compound', ['Quads'], ['Chest', 'Shoulders', 'Core'], ['quadriceps'], ['bodyweight'],
    ['Stand tall, then squat down and place your hands on the floor.', 'Jump your feet back into a push-up position and do a push-up.', 'Jump your feet back toward your hands.', 'Explode up into a jump with your arms overhead. Land softly and go into the next rep.'],
    'Freehand Jump Squat', False, None, 'plyometrics'),
  # --- core ---
  X('Hanging Knee Raise', 'body only', 'beginner', 'isolation', ['Core'], [], ['abdominals'], ['pullup_bar'],
    ['Hang from a pull-up bar with your arms straight.', 'Bring your knees up toward your chest by curling your pelvis up, not just lifting your legs.', 'Pause at the top.', 'Lower slowly without swinging.'],
    'Hanging Leg Raise', True, 'hangleg*1.8'),
  X('Toes To Bar', 'body only', 'expert', 'isolation', ['Core'], ['Back', 'Forearms'], ['abdominals'], ['pullup_bar'],
    ['Hang from a pull-up bar with your arms straight.', 'Keeping your legs as straight as you can, lift your feet up until your toes touch the bar.', 'Lower under control without swinging.', 'Use hanging leg raises until you can reach the bar.'],
    'Hanging Leg Raise', False, 'hangleg*0.7'),
  X('Decline Sit-Up', 'body only', 'intermediate', 'isolation', ['Core'], [], ['abdominals'], ['decline_bench'],
    ['Hook your feet under the pads of a decline bench and lie back, hands across your chest or behind your head.', 'Curl your torso up until your chest comes close to your thighs.', 'Lower slowly back down.', 'Hold a plate on your chest to make it harder.'],
    'Decline Crunch', False, 'situp*0.8'),
  X('Dragon Flag', 'body only', 'expert', 'isolation', ['Core'], ['Back'], ['abdominals'], ['bench'],
    ['Lie on a bench and grip it behind your head.', 'Lift your whole body up onto your upper back so you are in a straight line from shoulders to toes.', 'Lower your body slowly as one piece, keeping your hips straight, until it hovers just above the bench.', 'Raise back up. Start with bent knees if needed.'],
    'Flat Bench Lying Leg Raise', False, 'hangleg*0.5'),
  X('Hollow Body Hold', 'body only', 'beginner', 'isolation', ['Core'], [], ['abdominals'], ['bodyweight'],
    ['Lie on your back with arms overhead and legs straight.', 'Press your lower back into the floor and lift your arms, shoulders and legs a few inches off the ground.', 'Hold, keeping your lower back flat. Log the seconds held as reps.', 'Bend your knees to make it easier.'],
    'Reverse Crunch', False),
  X('L-Sit', 'body only', 'expert', 'isolation', ['Core'], ['Triceps', 'Quads'], ['abdominals'], ['dip_bars'],
    ['Support yourself on dip bars or parallettes with straight arms.', 'Lift your legs straight out in front of you until they are level with your hips.', 'Hold, keeping your shoulders pushed down. Log the seconds held as reps.', 'Tuck your knees to make it easier.'],
    'Knee/Hip Raise On Parallel Bars', False),
  X('Bird Dog', 'body only', 'beginner', 'isolation', ['Core'], ['Glutes', 'Back'], ['lower back'], ['bodyweight'],
    ['Start on your hands and knees, hands under shoulders and knees under hips.', 'Reach one arm forward and the opposite leg back until both are level with your body.', 'Pause for a second without letting your hips rotate.', 'Return and switch sides. Each side counts as one rep.'],
    'Plank', 'Glute Kickback'),
  # --- calves ---
  X('Single-Leg Calf Raise', 'body only', 'beginner', 'isolation', ['Calves'], [], ['calves'], ['bodyweight'],
    ['Stand on one foot on the edge of a step, holding something for balance.', 'Lower your heel below the step for a full stretch.', 'Rise up onto your toes as high as you can and pause.', 'Finish all reps, then switch legs. Hold a dumbbell to add weight.'],
    'Standing Dumbbell Calf Raise', False, 'calfbw*0.5'),
  X('Tibialis Raise', 'body only', 'beginner', 'isolation', ['Calves'], [], ['calves'], ['bodyweight'],
    ['Stand with your back against a wall and your feet about a foot in front of you.', 'Lift your toes as high as you can toward your shins, keeping your heels down.', 'Lower slowly.', 'Step your feet further from the wall to make it harder.'],
    'Smith Machine Reverse Calf Raises', False),
  # --- full body ---
  X('Dumbbell Thruster', 'dumbbell', 'intermediate', 'compound', ['Quads'], ['Shoulders', 'Glutes', 'Triceps'], ['quadriceps'], ['dumbbell'],
    ['Hold a dumbbell in each hand at your shoulders.', 'Squat down until your thighs are about parallel to the floor.', 'Drive up hard and use that momentum to press the dumbbells overhead in one smooth motion.', 'Lower the dumbbells back to your shoulders as you go into the next squat.'],
    'Kettlebell Thruster', False, 'dbpress*0.7'),
  X('Dumbbell Snatch', 'dumbbell', 'intermediate', 'compound', ['Shoulders'], ['Hamstrings', 'Glutes', 'Back', 'Quads'], ['shoulders'], ['dumbbell'],
    ['Stand over a dumbbell, hinge and grab it with one hand.', 'Drive your hips forward explosively and pull the dumbbell up close to your body.', 'Punch it overhead in one motion, finishing with your arm straight.', 'Lower it back down under control. Alternate arms or finish one side first.'],
    'Dumbbell Clean', False, 'dbpress*0.75'),
]

ALIAS = {
  'Butterfly': ['Pec Deck', 'Machine Fly'], 'Reverse Machine Flyes': ['Reverse Pec Deck', 'Rear Delt Machine'],
  'Thigh Abductor': ['Hip Abduction Machine'], 'Thigh Adductor': ['Hip Adduction Machine'],
  'Push-Ups - Close Triceps Position': ['Diamond Push-Up'], 'Air Bike': ['Bicycle Crunch'], 'Jackknife Sit-Up': ['V-Up'],
  'Side Bridge': ['Side Plank'], 'Natural Glute Ham Raise': ['Nordic Hamstring Curl', 'Nordic Curl'],
  'One-Legged Cable Kickback': ['Cable Glute Kickback'], 'Dumbbell Incline Row': ['Chest-Supported Dumbbell Row', 'Incline Dumbbell Row'],
  'Romanian Deadlift': ['RDL'], 'Dumbbell Romanian Deadlift': ['DB RDL'],
  'Single-Leg Dumbbell Romanian Deadlift': ['Single-Leg RDL', 'Single Leg Deadlift'], 'Kettlebell One-Legged Deadlift': ['Single-Leg RDL', 'Kettlebell Single-Leg Deadlift'], 'Standing Military Press': ['Overhead Press', 'OHP'],
  'Plie Dumbbell Squat': ['Dumbbell Sumo Squat'], 'Dips - Chest Version': ['Weighted Dips', 'Chest Dips'],
  'One-Arm Dumbbell Row': ['Single-Arm Dumbbell Row'], 'EZ-Bar Skullcrusher': ['Skull Crusher', 'Lying Triceps Extension'],
  'Wide-Grip Lat Pulldown': ['Lat Pulldown'], 'Seated Cable Rows': ['Cable Row'], 'Triceps Pushdown - Rope Attachment': ['Rope Pushdown'],
  'Barbell Hip Thrust': ['Hip Thrust'], 'Standing Calf Raises': ['Calf Raise Machine'], 'Cable Crossover': ['Cable Fly'],
  "Farmer's Walk": ['Farmer Carry'], 'Butt Lift (Bridge)': ['Glute Bridge'], 'Stiff-Legged Dumbbell Deadlift': ['Dumbbell Stiff-Leg Deadlift'],
  'Hyperextensions (Back Extensions)': ['Back Extension'], 'Kettlebell Swing': ['Russian Swing'],
}

def main():
    p = os.path.join(R, 'src', 'data.json'); d = json.load(open(p)); by = {e['n']: e for e in d['ex']}
    added = 0
    for x in NEW:
        assert x['fx'] in by, ('missing donor', x['fx'])
        if x['n'] in by: continue
        e = {k: x[k] for k in ('n', 'q', 'l', 'm', 'c', 'p', 's', 'pm', 'i', 'e')}
        e['fx'] = x['fx']
        if x['ph']:   # True = same photos as the cartoon donor; a name = photos from that exercise
            src = by[x['fx'] if x['ph'] is True else x['ph']]
            for k in ('a', 'r', 'a2', 'r2'): e[k] = src[k]
        if x['k']: e['k'] = x['k']
        d['ex'].append(e); by[e['n']] = e; added += 1
    for n, al in ALIAS.items():
        assert n in by, ('alias target missing', n)
        by[n]['al'] = al
    BW = {'pullup', 'pushup', 'dip', 'situp', 'calfbw', 'hangleg'}
    for e in d['ex']:
        k = e.get('k')
        if k and k.split('*')[0] in BW: e['bwk'] = 1
    # keep the library alphabetical; equipment tiles point at exercises by position, so remap them by name
    ph = {it['id']: d['ex'][it['ph']]['n'] for it in d['items'] if isinstance(it.get('ph'), int)}
    d['ex'].sort(key=lambda e: e['n'].lower())
    pos = {e['n']: i for i, e in enumerate(d['ex'])}
    for it in d['items']:
        if it['id'] in ph: it['ph'] = pos[ph[it['id']]]
    json.dump(d, open(p, 'w'), separators=(',', ':'))
    print('added', added, '· total', len(d['ex']))
if __name__ == '__main__': main()
