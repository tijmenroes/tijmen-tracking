import type { ExerciseSet } from '@/types/fitness'

/**
 * Cap on previous-session sets that are carried into a new session. The same
 * number is hardcoded in the `exercise_session_refs` RPC
 * (`supabase/migration_014_previous_sets_limit.sql`) — keep the two in sync.
 */
export const MAX_PREVIOUS_SETS = 5

/** Last N sets by `set_number` (ascending), for input prefill. */
export function takeLastSets(sets: ExerciseSet[], max = MAX_PREVIOUS_SETS): ExerciseSet[] {
  if (max <= 0 || sets.length === 0) return []
  return [...sets].sort((a, b) => a.set_number - b.set_number).slice(-max)
}

/**
 * Heaviest set by `weight_kg`. Tie-break: more reps, then higher id (newer).
 * Sets without weight are ignored.
 */
export function pickHeaviestSet(sets: ExerciseSet[]): ExerciseSet | null {
  let best: ExerciseSet | null = null
  for (const s of sets) {
    if (s.weight_kg == null) continue
    if (!best || s.weight_kg > (best.weight_kg ?? -Infinity)) {
      best = s
      continue
    }
    if (s.weight_kg !== best.weight_kg) continue
    const reps = s.reps ?? -1
    const bestReps = best.reps ?? -1
    if (reps > bestReps || (reps === bestReps && s.id > best.id)) best = s
  }
  return best
}

export function hasLoggedSetMetrics(
  sets: Array<Pick<ExerciseSet, 'weight_kg' | 'reps' | 'duration_seconds' | 'distance_km'>>,
): boolean {
  return sets.some(
    (s) =>
      s.weight_kg != null || s.reps != null || s.duration_seconds != null || s.distance_km != null,
  )
}

/** Auto-prefill last-session sets only when current inputs are still empty. */
export function shouldPrefillPreviousSets(
  currentSets: Array<Pick<ExerciseSet, 'weight_kg' | 'reps' | 'duration_seconds' | 'distance_km'>>,
  previousSets: ExerciseSet[],
  alreadyPrefill: boolean,
): boolean {
  if (alreadyPrefill) return false
  if (previousSets.length === 0) return false
  return !hasLoggedSetMetrics(currentSets)
}

export interface ExerciseSessionRefRow {
  exercise_id: number
  best_set: ExerciseSet | null
  last_sets: ExerciseSet[] | null
}

export function mapSessionRefRows(rows: ExerciseSessionRefRow[]): {
  bestSetByExercise: Map<number, ExerciseSet>
  previousSetsByExercise: Map<number, ExerciseSet[]>
} {
  const bestSetByExercise = new Map<number, ExerciseSet>()
  const previousSetsByExercise = new Map<number, ExerciseSet[]>()
  for (const row of rows) {
    if (row.best_set) bestSetByExercise.set(row.exercise_id, row.best_set)
    previousSetsByExercise.set(
      row.exercise_id,
      takeLastSets(row.last_sets ?? [], MAX_PREVIOUS_SETS),
    )
  }
  return { bestSetByExercise, previousSetsByExercise }
}

/**
 * Split off empty sets that sit before a filled one. Those are leftovers from a
 * set whose insert was still in flight when the last-session prefill replaced
 * the sets, and they show up as a phantom empty first set. A *trailing* empty
 * set is the row the user is about to fill in, so it is kept.
 */
export function splitPhantomEmptySets(sets: ExerciseSet[]): {
  kept: ExerciseSet[]
  phantom: ExerciseSet[]
} {
  let lastFilled = -1
  sets.forEach((s, i) => {
    if (hasLoggedSetMetrics([s])) lastFilled = i
  })
  if (lastFilled <= 0) return { kept: sets, phantom: [] }

  const kept: ExerciseSet[] = []
  const phantom: ExerciseSet[] = []
  sets.forEach((s, i) => {
    if (i < lastFilled && !hasLoggedSetMetrics([s])) phantom.push(s)
    else kept.push(s)
  })
  return { kept, phantom }
}
