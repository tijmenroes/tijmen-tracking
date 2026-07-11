export type CelebrationTier = 'normal' | 'pr' | 'milestone' | 'epic'

/**
 * Workout numbers that earn a milestone celebration. The small early numbers
 * are explicit; from 50 onwards every round 50 counts (50, 100, 150, …) so the
 * list stays "round" without needing to be maintained forever.
 */
export const DEFAULT_MILESTONES = [5, 10, 25, 50, 75, 100]

export function isMilestone(workoutNumber: number, milestones: number[] = DEFAULT_MILESTONES): boolean {
  if (workoutNumber <= 0) return false
  if (milestones.includes(workoutNumber)) return true
  // Every round 50 beyond the explicit list also feels like a milestone.
  return workoutNumber >= 50 && workoutNumber % 50 === 0
}

/**
 * Pick the celebration tier from what the user achieved. A PR always lifts the
 * celebration above `normal`; hitting a milestone workout number and a PR in
 * the same session is `epic`.
 *
 * Priority: epic > milestone > pr > normal.
 */
export function celebrationTier(opts: {
  prCount: number
  workoutNumber: number
  milestones?: number[]
}): CelebrationTier {
  const hasPr = opts.prCount > 0
  const milestone = isMilestone(opts.workoutNumber, opts.milestones)
  if (hasPr && milestone) return 'epic'
  if (milestone) return 'milestone'
  if (hasPr) return 'pr'
  return 'normal'
}
