-- ============================================================
-- Migration 003 – Exercise aliases (searchable alternate names)
-- Run in the Supabase SQL editor. Adds a text[] column used by
-- the exercise picker's search box so e.g. "RDL" finds
-- "Romanian Deadlift". Run this BEFORE seed_exercises.sql.
-- ============================================================

alter table exercises
  add column if not exists aliases text[] not null default '{}';
