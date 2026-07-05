-- ============================================================
-- Migration 007 – template_exercises update policy
-- Run in the Supabase SQL editor after migration_006.
--
-- Reordering template exercises PATCHes sort_order, but migration 005
-- only defined select/insert/delete policies — updates were silently
-- blocked by RLS.
-- ============================================================

create policy "Users can update own template_exercises"
  on template_exercises for update
  using (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()));
