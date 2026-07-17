-- ============================================================
-- Migration 011 – Per template-exercise note
-- Run in the Supabase SQL editor after migration_010.
--
-- Free-text note per exercise in a template, e.g. a rep-range hint
-- like "max" or "6-8". Nullable; existing rows default to null.
-- Existing RLS policies on template_exercises already cover this
-- column (select/insert/update are scoped to the owning template).
-- ============================================================

alter table template_exercises
  add column if not exists note text;
