-- ============================================================
-- Migration 004 – Workout sessions (multiple workouts per day)
-- Run in the Supabase SQL editor.
-- Drops the one-workout-per-day constraint so a workout becomes
-- an explicit session, and adds an optional session name.
-- ============================================================

-- Allow multiple workouts per user per day
alter table workouts drop constraint if exists workouts_user_id_date_key;

-- Optional session name (e.g. "Push A", or a template name)
alter table workouts add column if not exists name text;
