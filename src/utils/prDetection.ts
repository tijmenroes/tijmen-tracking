import { roundE1RM } from '@/utils/e1rm'

/**
 * Whether this session's best e1RM is a new personal record: strictly better
 * than the best e1RM across all *previous* saved sessions of the same exercise.
 *
 * Comparison is done on the rounded (0.5 kg) display value so floating-point
 * noise doesn't produce a "PR" for what is really an identical lift, and an
 * equal e1RM does not count as a PR.
 *
 * The first time an exercise is ever logged there is no prior best, so it is
 * deliberately *not* a PR — there is nothing to beat yet.
 */
export function isNewE1RMPr(currentBest: number | null, priorBest: number | null): boolean {
  if (currentBest == null || priorBest == null) return false
  return roundE1RM(currentBest) > roundE1RM(priorBest)
}

/**
 * Percentage change of this session's best e1RM versus the previous session
 * of the same exercise. Positive = stronger than last time, negative = weaker.
 * Returns null when there is no comparable previous session.
 */
export function e1rmDeltaPct(currentBest: number | null, previousBest: number | null): number | null {
  if (currentBest == null || previousBest == null || previousBest <= 0) return null
  return ((currentBest - previousBest) / previousBest) * 100
}
