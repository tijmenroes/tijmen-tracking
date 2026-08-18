-- ============================================================
-- Migration 013 – Session reference RPC (best KG + last sets)
-- Run in the Supabase SQL editor after migration_012.
-- ============================================================

create index if not exists workout_exercises_exercise_created_idx
  on workout_exercises (exercise_id, created_at desc);

create index if not exists exercise_sets_we_set_number_idx
  on exercise_sets (workout_exercise_id, set_number desc);

create index if not exists exercise_sets_we_weight_idx
  on exercise_sets (workout_exercise_id, weight_kg desc)
  where weight_kg is not null;

create or replace function public.exercise_session_refs(
  p_exercise_ids bigint[],
  p_exclude_workout_id bigint
)
returns table (
  exercise_id bigint,
  best_set jsonb,
  last_sets jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with best as (
    select distinct on (we.exercise_id)
      we.exercise_id,
      jsonb_build_object(
        'id', es.id,
        'workout_exercise_id', es.workout_exercise_id,
        'set_number', es.set_number,
        'weight_kg', es.weight_kg,
        'reps', es.reps,
        'duration_seconds', es.duration_seconds,
        'distance_km', es.distance_km,
        'created_at', es.created_at
      ) as best_set
    from exercise_sets es
    join workout_exercises we on we.id = es.workout_exercise_id
    join workouts w on w.id = we.workout_id
    where we.exercise_id = any (p_exercise_ids)
      and we.workout_id is distinct from p_exclude_workout_id
      and w.status = 'saved'
      and es.weight_kg is not null
    order by we.exercise_id, es.weight_kg desc, es.reps desc nulls last, es.id desc
  ),
  latest_we as (
    select distinct on (we.exercise_id)
      we.exercise_id,
      we.id as workout_exercise_id
    from workout_exercises we
    where we.exercise_id = any (p_exercise_ids)
      and we.workout_id is distinct from p_exclude_workout_id
    order by we.exercise_id, we.created_at desc
  ),
  last as (
    select
      latest_we.exercise_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', es.id,
            'workout_exercise_id', es.workout_exercise_id,
            'set_number', es.set_number,
            'weight_kg', es.weight_kg,
            'reps', es.reps,
            'duration_seconds', es.duration_seconds,
            'distance_km', es.distance_km,
            'created_at', es.created_at
          )
          order by es.set_number
        ) filter (where es.id is not null),
        '[]'::jsonb
      ) as last_sets
    from latest_we
    left join lateral (
      select
        es.id,
        es.workout_exercise_id,
        es.set_number,
        es.weight_kg,
        es.reps,
        es.duration_seconds,
        es.distance_km,
        es.created_at
      from exercise_sets es
      where es.workout_exercise_id = latest_we.workout_exercise_id
      order by es.set_number desc
      limit 2
    ) es on true
    group by latest_we.exercise_id
  )
  select
    ids.exercise_id,
    b.best_set,
    coalesce(l.last_sets, '[]'::jsonb) as last_sets
  from (select distinct unnest(p_exercise_ids) as exercise_id) ids
  left join best b on b.exercise_id = ids.exercise_id
  left join last l on l.exercise_id = ids.exercise_id
$$;

revoke all on function public.exercise_session_refs(bigint[], bigint) from public;
grant execute on function public.exercise_session_refs(bigint[], bigint) to authenticated;
