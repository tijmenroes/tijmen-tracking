import type { Exercise } from '@/types/fitness'

/**
 * Case-insensitive match of an exercise against a search query.
 * Matches on:
 *   - name (substring)
 *   - any alias (substring)
 *   - any tag name (exact match only, e.g. "legs" → exercises tagged "legs")
 * An empty query matches everything.
 */
export function matchesExerciseQuery(ex: Exercise, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (ex.name.toLowerCase().includes(q)) return true
  if ((ex.aliases ?? []).some((alias) => alias.toLowerCase().includes(q))) return true
  return (ex.tags ?? []).some((tag) => tag.name.toLowerCase() === q)
}

export type ExerciseSortMode = 'name' | 'frequency'

/** Filter exercises by text query and optional single-tag filter (same rules as admin beheer). */
export function filterExercises(
  exercises: Exercise[],
  query: string,
  filterTagId: number | null,
): Exercise[] {
  return exercises.filter((ex) => {
    if (!matchesExerciseQuery(ex, query)) return false
    if (filterTagId !== null && !(ex.tags ?? []).some((t) => t.id === filterTagId)) return false
    return true
  })
}

/** Sort filtered exercises by name or workout frequency (desc), with name as tiebreaker. */
export function sortExercises(
  exercises: Exercise[],
  sortBy: ExerciseSortMode,
  usageCounts: ReadonlyMap<number, number>,
): Exercise[] {
  const sorted = [...exercises]
  if (sortBy === 'frequency') {
    sorted.sort((a, b) => {
      const diff = (usageCounts.get(b.id) ?? 0) - (usageCounts.get(a.id) ?? 0)
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  }
  return sorted
}
