-- ============================================================
-- Migration 009 – Program exercises (5-day PPL + Upper/Legs)
-- Run in the Supabase SQL editor after migration_008.
--
-- Adds the exercises from the training program that were missing
-- from the catalog, and extends aliases on existing exercises so
-- the program's naming (cable fly, smith machine variants, ...)
-- matches by search.
--
-- Safe to run multiple times:
--   * new exercises are only inserted when the name doesn't exist
--   * alias updates de-duplicate via distinct unnest
--   * exercise_tags use the (exercise_id, tag_id) PK to skip dupes
-- ============================================================

-- ------------------------------------------------------------
-- 1. New exercises (name, aliases). All type = 'strength'.
--    Only inserts names that don't exist yet.
-- ------------------------------------------------------------
insert into exercises (name, type, aliases)
select v.name, 'strength', v.aliases
from (values
  ('JM Press',              array['jm press smith machine','smith machine jm press']),
  ('Machine Shoulder Press',array['shoulder press machine']),
  ('Straight-arm Pulldown', array['straight arm pulldown','straight arm rope pull down','straight arm pull down','rope pulldown']),
  ('Hack Squat',            array['hack squat machine']),
  ('Machine Chest Press',   array['machine press','chest press machine']),
  ('Standing Calf Raise',   array['standing calf raise','smith machine calf raise','smith machine calf raises']),
  ('Incline Dumbbell Curl', array['incline db curl'])
) as v(name, aliases)
where not exists (select 1 from exercises e where e.name = v.name);

-- ------------------------------------------------------------
-- 2. Link the new exercises to tags (matched by name).
-- ------------------------------------------------------------
insert into exercise_tags (exercise_id, tag_id)
select e.id, t.id
from (values
  ('JM Press','compound'),('JM Press','triceps'),
  ('Machine Shoulder Press','compound'),('Machine Shoulder Press','shoulders'),('Machine Shoulder Press','triceps'),
  ('Straight-arm Pulldown','isolation'),('Straight-arm Pulldown','back'),('Straight-arm Pulldown','lats'),
  ('Hack Squat','compound'),('Hack Squat','legs'),('Hack Squat','quads'),('Hack Squat','glutes'),
  ('Machine Chest Press','compound'),('Machine Chest Press','chest'),('Machine Chest Press','shoulders'),('Machine Chest Press','triceps'),
  ('Standing Calf Raise','isolation'),('Standing Calf Raise','calves'),
  ('Incline Dumbbell Curl','isolation'),('Incline Dumbbell Curl','biceps')
) as m(exercise_name, tag_name)
join exercises e on e.name = m.exercise_name
join tags t on t.name = m.tag_name
on conflict (exercise_id, tag_id) do nothing;

-- ------------------------------------------------------------
-- 3. Extend aliases on existing exercises so program names match.
--    Appends new aliases and de-duplicates.
-- ------------------------------------------------------------
update exercises set aliases = array(select distinct unnest(aliases || array['cable fly','cable fly high to low','chest fly machine']))
  where name = 'Pec Fly';

update exercises set aliases = array(select distinct unnest(aliases || array['smith machine incline press']))
  where name = 'Incline Barbell Bench Press';

update exercises set aliases = array(select distinct unnest(aliases || array['cable hammer curl']))
  where name = 'Hammer Curl';

update exercises set aliases = array(select distinct unnest(aliases || array['smith machine shrug','smith machine shrugs']))
  where name = 'Hex Bar Shrug';

update exercises set aliases = array(select distinct unnest(aliases || array['overhead dumbbell extension','cable overhead tricep extension']))
  where name = 'Overhead Triceps Extension';

update exercises set aliases = array(select distinct unnest(aliases || array['dumbbell lateral raise']))
  where name = 'Lateral Raise';

update exercises set aliases = array(select distinct unnest(aliases || array['wide grip seated row','close grip seated row']))
  where name = 'Seated Cable Row';
