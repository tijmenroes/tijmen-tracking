import type { CelebrationTier } from '@/utils/celebrationTier'

/**
 * Headline pools per tier. Deliberately informal and energetic — the
 * celebration screen is the one place the app is allowed to be loud.
 * `{n}` is replaced with the workout number.
 */
const HEADLINES: Record<CelebrationTier, string[]> = {
  normal: ['Lekker bezig!', 'Dat was hem!', 'Klaar. Sterk werk.', 'Weer een erbij 💪'],
  pr: ['Nieuwe PR!', 'Record verbroken 🔥', 'Je bent sterker geworden', 'Persoonlijk record!'],
  milestone: ['{n} workouts!', 'Mijlpaal gehaald 🎉', 'Wat een reeks', 'Dat tikt lekker door'],
  epic: ['PR én {n} workouts!', 'Beast mode 🔥', 'On fire vandaag', 'Dit was een topsessie'],
}

/**
 * Deterministically pick a headline for a workout so it stays stable across
 * reloads of the same celebration (the tier is recomputed live, but we don't
 * want the copy to flicker). `seed` is typically the workout id.
 */
export function pickHeadline(tier: CelebrationTier, workoutNumber: number, seed: number): string {
  const pool = HEADLINES[tier]
  const index = Math.abs(Math.trunc(seed)) % pool.length
  return pool[index]!.replace('{n}', String(workoutNumber))
}

/** Ordinal-ish subtext, always stating the exact workout number. */
export function workoutNumberSubtext(workoutNumber: number): string {
  return `Dat was je ${workoutNumber}e workout`
}
