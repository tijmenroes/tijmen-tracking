import type { ExerciseSet } from '@/types/fitness'

type WeightRepsSet = Pick<ExerciseSet, 'weight_kg' | 'reps'>

/**
 * Total training volume for a set of strength sets: `Σ (weight_kg × reps)`.
 * Only sets with both a positive weight and positive rep count contribute —
 * bodyweight/empty/endurance sets are ignored.
 */
export function strengthVolume(sets: WeightRepsSet[]): number {
  let total = 0
  for (const s of sets) {
    if (s.weight_kg != null && s.reps != null && s.weight_kg > 0 && s.reps > 0) {
      total += s.weight_kg * s.reps
    }
  }
  return total
}

/**
 * Workout duration in whole minutes, from when the draft started
 * (`created_at`) to when it was finished (`saved_at`). Returns null when
 * we can't produce a sensible value (missing saved_at, unparseable, or a
 * negative span from clock skew).
 */
export function workoutDurationMinutes(createdAt: string, savedAt: string | null): number | null {
  if (!savedAt) return null
  const start = new Date(createdAt).getTime()
  const end = new Date(savedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const ms = end - start
  if (ms < 0) return null
  return Math.round(ms / 60000)
}
