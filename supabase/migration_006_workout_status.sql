-- ============================================================
-- Migration 006 – Workout status (active vs saved)
-- Run in the Supabase SQL editor after migration_005.
--
-- A workout is now an explicit draft ("active") while it is being
-- logged, and only becomes part of the history once it is "saved".
-- This prevents half-empty / accidental workouts from showing up.
-- ============================================================

-- status: 'active' = draft in progress, 'saved' = finished & in history
alter table workouts
  add column if not exists status text not null default 'active'
  check (status in ('active', 'saved'));

-- All pre-existing workouts are historical → mark them as saved.
update workouts set status = 'saved';

-- Enforce at most one active (draft) workout per user at the database
-- level. The app also guards against this, but this is a hard safety net.
create unique index if not exists one_active_workout_per_user
  on workouts (user_id)
  where status = 'active';
