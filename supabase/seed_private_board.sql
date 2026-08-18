-- ============================================================
-- Private board seed
-- Run after migration_012_activity_newsboard.sql.
--
-- Replace both email addresses below before running this script.
-- Re-running it is safe: memberships and workout posts are idempotent.
-- ============================================================

do $$
declare
  v_tijmen_email text := 'REPLACE_WITH_TIJMEN_EMAIL';
  v_jasper_email text := 'REPLACE_WITH_JASPER_EMAIL';
  v_tijmen_id uuid;
  v_jasper_id uuid;
  v_board_id bigint;
begin
  select id into v_tijmen_id from auth.users where email = v_tijmen_email;
  select id into v_jasper_id from auth.users where email = v_jasper_email;

  if v_tijmen_id is null or v_jasper_id is null then
    raise exception 'Kon beide users niet vinden. Controleer de twee e-mailadressen bovenaan het script.';
  end if;

  update profiles set nickname = 'Tijmen' where id = v_tijmen_id;
  update profiles set nickname = 'Jasper' where id = v_jasper_id;

  insert into boards (name, created_by)
  values ('Tijmen & Jasper', v_tijmen_id)
  on conflict (name) do update set name = excluded.name
  returning id into v_board_id;

  insert into board_members (board_id, user_id)
  values
    (v_board_id, v_tijmen_id),
    (v_board_id, v_jasper_id)
  on conflict (board_id, user_id) do nothing;

  -- Add one initial, generic post for each member's latest saved workout.
  -- Historical PR counts deliberately stay at zero: the app's TypeScript
  -- implementation remains the source of truth for PR detection.
  insert into activity_events (
    board_id,
    actor_user_id,
    actor_nickname,
    event_type,
    workout_id,
    payload,
    occurred_at
  )
  select
    v_board_id,
    latest.user_id,
    coalesce(nullif(trim(p.nickname), ''), 'Sportmaat'),
    'workout_completed',
    latest.id,
    jsonb_build_object(
      'workout_name', coalesce(nullif(trim(latest.name), ''), nullif(trim(t.name), ''), 'workout'),
      'pr_count', 0,
      'variant', 0
    ),
    coalesce(latest.saved_at, latest.created_at)
  from (
    select distinct on (w.user_id) w.*
    from workouts w
    where w.user_id in (v_tijmen_id, v_jasper_id)
      and w.status = 'saved'
    order by w.user_id, coalesce(w.saved_at, w.created_at) desc
  ) latest
  join profiles p on p.id = latest.user_id
  left join workout_templates t on t.id = latest.template_id
  on conflict (board_id, workout_id) where workout_id is not null
  do nothing;
end;
$$;
