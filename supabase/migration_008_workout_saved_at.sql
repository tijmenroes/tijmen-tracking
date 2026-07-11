-- ============================================================
-- Migration 008 – Workout saved_at (finish timestamp)
-- Run in the Supabase SQL editor after migration_007.
--
-- Records the moment a draft workout is finished ("saved"). Together
-- with created_at (when the draft started) this gives the workout
-- duration shown on the celebration screen.
-- ============================================================

alter table workouts
  add column if not exists saved_at timestamptz;

-- Backfill existing saved workouts so they have a non-null finish time.
-- created_at is the best approximation we have for historical rows.
update workouts
  set saved_at = created_at
  where status = 'saved' and saved_at is null;
