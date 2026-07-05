import type { ExerciseSet } from '@/types/fitness'

/**
 * Estimated one-rep max (e1RM) via the Epley formula: `w × (1 + reps/30)`.
 *
 * Epley is simple and accurate up to ~10-12 reps, which fits an 8-12 rep
 * training range. Above that all e1RM formulas start to overestimate.
 *
 * Returns null when the set can't produce a meaningful estimate (no weight,
 * no reps, or a bodyweight/zero-load set).
 */
export function epley1RM(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null) return null
  if (weightKg <= 0 || reps <= 0) return null
  return weightKg * (1 + reps / 30)
}

/**
 * The highest e1RM across a session's sets. This is the "best set" — usually
 * the first set taken to failure, but querying the max makes it robust to the
 * odd session where a later set turns out stronger.
 */
export function bestSetE1RM(sets: ExerciseSet[]): number | null {
  let best: number | null = null
  for (const s of sets) {
    const e = epley1RM(s.weight_kg, s.reps)
    if (e != null && (best == null || e > best)) best = e
  }
  return best
}

/** Round an e1RM to a sensible display precision (0.5 kg steps). */
export function roundE1RM(value: number): number {
  return Math.round(value * 2) / 2
}
