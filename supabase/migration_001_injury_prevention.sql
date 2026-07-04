-- ============================================================
-- Migration 001 – injury prevention & LLM export fields
-- Run in the Supabase SQL editor.
-- ============================================================

-- exercises: persistent notes (form tips, injury warnings, etc.)
alter table exercises add column if not exists notes text;

-- workout_exercises: per-session notes and optional pain scale
alter table workout_exercises add column if not exists notes text;
alter table workout_exercises add column if not exists pain_scale int check (pain_scale >= 1 and pain_scale <= 10);

-- Add update policy for workout_exercises (needed to save notes/pain_scale)
create policy "Users can update own workout_exercises"
  on workout_exercises for update
  using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- profiles: user goals, personal notes, and optional LLM prompt prefix
alter table profiles add column if not exists goals text;
alter table profiles add column if not exists notes text;
alter table profiles add column if not exists llm_prompt text;
