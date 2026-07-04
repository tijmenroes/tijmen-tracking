-- ============================================================
-- Seed – Strength exercise catalog (50 exercises)
-- Run in the Supabase SQL editor AFTER migration_002 (tags) and
-- migration_003 (aliases column). Safe to run multiple times:
--   * new tags use ON CONFLICT DO NOTHING
--   * exercises are only inserted when the name doesn't exist yet
--   * exercise_tags use the (exercise_id, tag_id) PK to skip dupes
-- Note: aliases are only set for exercises inserted by THIS run;
-- exercises you already created by hand keep their current data.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New tags for the leg machines (rest is already seeded).
-- ------------------------------------------------------------
insert into tags (name) values
  ('abductors'), ('adductors')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 2. Exercises (name, aliases). All type = 'strength'.
--    Only inserts names that don't exist yet.
-- ------------------------------------------------------------
insert into exercises (name, type, aliases)
select v.name, 'strength', v.aliases
from (values
  ('Barbell Back Squat',            array['squat','back squat']),
  ('Front Squat',                   array[]::text[]),
  ('Barbell Deadlift',              array['deadlift','conventional deadlift']),
  ('Romanian Deadlift',             array['RDL']),
  ('Barbell Bench Press',           array['bench','bench press','BB bench']),
  ('Incline Barbell Bench Press',   array['incline bench','incline barbell press']),
  ('Dumbbell Bench Press',          array['DB bench']),
  ('Overhead Press (Barbell)',      array['OHP','military press','shoulder press']),
  ('Dumbbell Shoulder Press',       array['DB shoulder press']),
  ('Barbell Bent-over Row',         array['barbell row','bent over row','BB row']),
  ('Pull-up',                       array['pullup','pull ups','chin up']),
  ('Lat Pulldown',                  array['pulldown']),
  ('Seated Cable Row',              array['cable row']),
  ('One-arm Dumbbell Row',          array['dumbbell row','DB row','one arm row']),
  ('Leg Press',                     array[]::text[]),
  ('Walking Lunge',                 array['lunge','lunges']),
  ('Bulgarian Split Squat',         array['BSS','split squat']),
  ('Leg Extension',                 array[]::text[]),
  ('Leg Curl',                      array['hamstring curl','lying leg curl']),
  ('Standing Calf Raise',           array['calf raise']),
  ('Hip Thrust',                    array['barbell hip thrust']),
  ('Barbell Biceps Curl',           array['barbell curl','BB curl']),
  ('Dumbbell Biceps Curl',          array['dumbbell curl','DB curl']),
  ('Hammer Curl',                   array[]::text[]),
  ('Triceps Pushdown',              array['pushdown','cable pushdown','tricep pushdown']),
  ('Overhead Triceps Extension',    array['overhead extension','french press']),
  ('Dips',                          array['dip']),
  ('Lateral Raise',                 array['side raise','side raises','lat raise']),
  ('Face Pull',                     array[]::text[]),
  ('Plank',                         array[]::text[]),
  ('Chest-Supported Row (Technogym)', array['technogym row','chest supported row']),
  ('Row Machine',                   array['seated row machine','plate row']),
  ('Pec Fly',                       array['pec deck','chest fly','fly']),
  ('Reverse Fly',                   array['rear delt fly','reverse pec deck','rear delts']),
  ('Push-up',                       array['pushup','push ups']),
  ('Rotator Cuff External Rotation',array['rotator cuff','external rotation','cuff']),
  ('Preacher Curl',                 array[]::text[]),
  ('Dumbbell Skull Crushers',       array['skull crusher','skullcrusher','lying tricep extension']),
  ('Farmer''s Carry',               array['farmer carry','farmers walk','farmer walk']),
  ('Hex Bar Shrug',                 array['trap bar shrug','shrug','shrugs']),
  ('Romanian Deadlift (Dumbbell)',  array['RDL dumbbell','DB RDL','dumbbell RDL']),
  ('Back Extension',                array['hyperextension','back extensions']),
  ('Hip Abduction Machine',         array['abduction','glute machine','knees out']),
  ('Hip Adduction Machine',         array['adduction','inner thigh','knees in']),
  ('Hanging Leg Raise',             array['leg raise','hanging leg raises']),
  ('Cable Crunch',                  array[]::text[]),
  ('Goblet Squat',                  array[]::text[]),
  ('Incline Dumbbell Press',        array['incline DB press']),
  ('Cable Lateral Raise',           array['cable side raise']),
  ('Decline Sit-up',                array['decline situp','situps','sit up'])
) as v(name, aliases)
where not exists (select 1 from exercises e where e.name = v.name);

-- ------------------------------------------------------------
-- 3. Link exercises to tags (matched by name).
-- ------------------------------------------------------------
insert into exercise_tags (exercise_id, tag_id)
select e.id, t.id
from (values
  ('Barbell Back Squat','compound'),('Barbell Back Squat','legs'),('Barbell Back Squat','quads'),('Barbell Back Squat','glutes'),
  ('Front Squat','compound'),('Front Squat','legs'),('Front Squat','quads'),('Front Squat','core'),
  ('Barbell Deadlift','compound'),('Barbell Deadlift','back'),('Barbell Deadlift','lower back'),('Barbell Deadlift','hamstrings'),('Barbell Deadlift','glutes'),('Barbell Deadlift','forearms'),
  ('Romanian Deadlift','compound'),('Romanian Deadlift','hamstrings'),('Romanian Deadlift','glutes'),('Romanian Deadlift','lower back'),
  ('Barbell Bench Press','compound'),('Barbell Bench Press','chest'),('Barbell Bench Press','triceps'),('Barbell Bench Press','shoulders'),
  ('Incline Barbell Bench Press','compound'),('Incline Barbell Bench Press','chest'),('Incline Barbell Bench Press','shoulders'),('Incline Barbell Bench Press','triceps'),
  ('Dumbbell Bench Press','compound'),('Dumbbell Bench Press','chest'),('Dumbbell Bench Press','triceps'),('Dumbbell Bench Press','shoulders'),
  ('Overhead Press (Barbell)','compound'),('Overhead Press (Barbell)','shoulders'),('Overhead Press (Barbell)','triceps'),
  ('Dumbbell Shoulder Press','compound'),('Dumbbell Shoulder Press','shoulders'),('Dumbbell Shoulder Press','triceps'),
  ('Barbell Bent-over Row','compound'),('Barbell Bent-over Row','back'),('Barbell Bent-over Row','lats'),('Barbell Bent-over Row','lower back'),('Barbell Bent-over Row','biceps'),
  ('Pull-up','compound'),('Pull-up','back'),('Pull-up','lats'),('Pull-up','biceps'),
  ('Lat Pulldown','compound'),('Lat Pulldown','back'),('Lat Pulldown','lats'),('Lat Pulldown','biceps'),
  ('Seated Cable Row','compound'),('Seated Cable Row','back'),('Seated Cable Row','lats'),('Seated Cable Row','biceps'),
  ('One-arm Dumbbell Row','compound'),('One-arm Dumbbell Row','back'),('One-arm Dumbbell Row','lats'),('One-arm Dumbbell Row','biceps'),
  ('Leg Press','compound'),('Leg Press','legs'),('Leg Press','quads'),('Leg Press','glutes'),
  ('Walking Lunge','compound'),('Walking Lunge','legs'),('Walking Lunge','quads'),('Walking Lunge','glutes'),('Walking Lunge','hamstrings'),
  ('Bulgarian Split Squat','compound'),('Bulgarian Split Squat','legs'),('Bulgarian Split Squat','quads'),('Bulgarian Split Squat','glutes'),
  ('Leg Extension','isolation'),('Leg Extension','quads'),
  ('Leg Curl','isolation'),('Leg Curl','hamstrings'),
  ('Standing Calf Raise','isolation'),('Standing Calf Raise','calves'),
  ('Hip Thrust','compound'),('Hip Thrust','glutes'),('Hip Thrust','hamstrings'),
  ('Barbell Biceps Curl','isolation'),('Barbell Biceps Curl','biceps'),
  ('Dumbbell Biceps Curl','isolation'),('Dumbbell Biceps Curl','biceps'),
  ('Hammer Curl','isolation'),('Hammer Curl','biceps'),('Hammer Curl','forearms'),
  ('Triceps Pushdown','isolation'),('Triceps Pushdown','triceps'),
  ('Overhead Triceps Extension','isolation'),('Overhead Triceps Extension','triceps'),
  ('Dips','compound'),('Dips','chest'),('Dips','triceps'),('Dips','shoulders'),
  ('Lateral Raise','isolation'),('Lateral Raise','shoulders'),
  ('Face Pull','isolation'),('Face Pull','shoulders'),('Face Pull','back'),
  ('Plank','core'),('Plank','abs'),('Plank','isolation'),
  ('Chest-Supported Row (Technogym)','compound'),('Chest-Supported Row (Technogym)','back'),('Chest-Supported Row (Technogym)','lats'),('Chest-Supported Row (Technogym)','biceps'),
  ('Row Machine','compound'),('Row Machine','back'),('Row Machine','lats'),('Row Machine','biceps'),
  ('Pec Fly','isolation'),('Pec Fly','chest'),
  ('Reverse Fly','isolation'),('Reverse Fly','shoulders'),
  ('Push-up','compound'),('Push-up','chest'),('Push-up','triceps'),('Push-up','shoulders'),
  ('Rotator Cuff External Rotation','isolation'),('Rotator Cuff External Rotation','shoulders'),
  ('Preacher Curl','isolation'),('Preacher Curl','biceps'),
  ('Dumbbell Skull Crushers','isolation'),('Dumbbell Skull Crushers','triceps'),
  ('Farmer''s Carry','compound'),('Farmer''s Carry','forearms'),('Farmer''s Carry','core'),('Farmer''s Carry','full body'),
  ('Hex Bar Shrug','isolation'),('Hex Bar Shrug','back'),('Hex Bar Shrug','shoulders'),('Hex Bar Shrug','forearms'),
  ('Romanian Deadlift (Dumbbell)','compound'),('Romanian Deadlift (Dumbbell)','hamstrings'),('Romanian Deadlift (Dumbbell)','glutes'),('Romanian Deadlift (Dumbbell)','lower back'),
  ('Back Extension','isolation'),('Back Extension','lower back'),('Back Extension','glutes'),('Back Extension','hamstrings'),
  ('Hip Abduction Machine','isolation'),('Hip Abduction Machine','glutes'),('Hip Abduction Machine','abductors'),
  ('Hip Adduction Machine','isolation'),('Hip Adduction Machine','adductors'),('Hip Adduction Machine','legs'),
  ('Hanging Leg Raise','isolation'),('Hanging Leg Raise','abs'),('Hanging Leg Raise','core'),
  ('Cable Crunch','isolation'),('Cable Crunch','abs'),('Cable Crunch','core'),
  ('Goblet Squat','compound'),('Goblet Squat','legs'),('Goblet Squat','quads'),('Goblet Squat','glutes'),
  ('Incline Dumbbell Press','compound'),('Incline Dumbbell Press','chest'),('Incline Dumbbell Press','shoulders'),('Incline Dumbbell Press','triceps'),
  ('Cable Lateral Raise','isolation'),('Cable Lateral Raise','shoulders'),
  ('Decline Sit-up','isolation'),('Decline Sit-up','abs'),('Decline Sit-up','core')
) as m(exercise_name, tag_name)
join exercises e on e.name = m.exercise_name
join tags t on t.name = m.tag_name
on conflict (exercise_id, tag_id) do nothing;
