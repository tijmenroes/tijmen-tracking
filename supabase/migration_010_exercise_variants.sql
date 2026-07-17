-- ============================================================
-- Migration 010 – Split exercise variants into their own rows
-- Run in the Supabase SQL editor after migration_009.
--
-- Migration 009 folded a number of program movements into existing
-- exercises as aliases (cable fly, smith machine variants, grip
-- widths, ...). These are distinct enough to track separately, so
-- this migration:
--   1. Strips those aliases back off the base exercises.
--   2. Adds each variant as its own exercise (with tags).
--
-- Grip variants (wide/close) also get their own rows.
--
-- Safe to run multiple times:
--   * alias removal is a no-op once the alias is gone
--   * new exercises are only inserted when the name doesn't exist
--   * exercise_tags use the (exercise_id, tag_id) PK to skip dupes
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove the aliases added in migration 009 (order-preserving).
-- ------------------------------------------------------------
update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['cable fly','cable fly high to low','chest fly machine'])
) where name = 'Pec Fly';

update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['smith machine incline press'])
) where name = 'Incline Barbell Bench Press';

update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['cable hammer curl'])
) where name = 'Hammer Curl';

update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['smith machine shrug','smith machine shrugs'])
) where name = 'Hex Bar Shrug';

update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['overhead dumbbell extension','cable overhead tricep extension'])
) where name = 'Overhead Triceps Extension';

update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['dumbbell lateral raise'])
) where name = 'Lateral Raise';

update exercises set aliases = array(
  select a from unnest(aliases) as a
  where a <> all (array['wide grip seated row','close grip seated row'])
) where name = 'Seated Cable Row';

-- ------------------------------------------------------------
-- 2. New standalone exercises (name, aliases). type = 'strength'.
--    Only inserts names that don't exist yet.
-- ------------------------------------------------------------
insert into exercises (name, type, aliases)
select v.name, 'strength', v.aliases
from (values
  ('Cable Fly (High to Low)',        array['cable fly','high to low fly','cable fly high to low']),
  ('Smith Machine Incline Press',    array['smith incline press']),
  ('Cable Hammer Curl',              array['cable hammer curls']),
  ('Smith Machine Shrug',            array['smith machine shrugs','smith shrug']),
  ('Cable Overhead Triceps Extension', array['cable overhead extension','cable overhead tricep extension']),
  ('Dumbbell Lateral Raise',         array['db lateral raise','dumbbell lateral raises']),
  ('Wide Grip Seated Row',           array['wide grip row']),
  ('Close Grip Seated Row',          array['close grip row']),
  ('Close Grip Lat Pulldown',        array['close grip pulldown','close grip lat pull down']),
  ('Wide Grip Lat Pulldown',         array['wide grip pulldown','wide grip lat pull down']),
  ('Close Grip Row Machine',         array['close grip row machine'])
) as v(name, aliases)
where not exists (select 1 from exercises e where e.name = v.name);

-- ------------------------------------------------------------
-- 3. Link the new exercises to tags (matched by name).
-- ------------------------------------------------------------
insert into exercise_tags (exercise_id, tag_id)
select e.id, t.id
from (values
  ('Cable Fly (High to Low)','isolation'),('Cable Fly (High to Low)','chest'),
  ('Smith Machine Incline Press','compound'),('Smith Machine Incline Press','chest'),('Smith Machine Incline Press','shoulders'),('Smith Machine Incline Press','triceps'),
  ('Cable Hammer Curl','isolation'),('Cable Hammer Curl','biceps'),('Cable Hammer Curl','forearms'),
  ('Smith Machine Shrug','isolation'),('Smith Machine Shrug','shoulders'),('Smith Machine Shrug','back'),('Smith Machine Shrug','forearms'),
  ('Cable Overhead Triceps Extension','isolation'),('Cable Overhead Triceps Extension','triceps'),
  ('Dumbbell Lateral Raise','isolation'),('Dumbbell Lateral Raise','shoulders'),
  ('Wide Grip Seated Row','compound'),('Wide Grip Seated Row','back'),('Wide Grip Seated Row','lats'),('Wide Grip Seated Row','biceps'),
  ('Close Grip Seated Row','compound'),('Close Grip Seated Row','back'),('Close Grip Seated Row','lats'),('Close Grip Seated Row','biceps'),
  ('Close Grip Lat Pulldown','compound'),('Close Grip Lat Pulldown','back'),('Close Grip Lat Pulldown','lats'),('Close Grip Lat Pulldown','biceps'),
  ('Wide Grip Lat Pulldown','compound'),('Wide Grip Lat Pulldown','back'),('Wide Grip Lat Pulldown','lats'),('Wide Grip Lat Pulldown','biceps'),
  ('Close Grip Row Machine','compound'),('Close Grip Row Machine','back'),('Close Grip Row Machine','lats'),('Close Grip Row Machine','biceps')
) as m(exercise_name, tag_name)
join exercises e on e.name = m.exercise_name
join tags t on t.name = m.tag_name
on conflict (exercise_id, tag_id) do nothing;
