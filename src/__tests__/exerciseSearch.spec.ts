import { describe, it, expect } from 'vitest'
import { matchesExerciseQuery, filterExercises, sortExercises } from '@/utils/exerciseSearch'
import type { Exercise } from '@/types/fitness'

const ex: Exercise = {
  id: 1,
  name: 'Romanian Deadlift',
  type: 'strength',
  notes: null,
  aliases: ['RDL', 'stiff leg deadlift'],
  created_by: null,
  created_at: 'x',
  tags: [
    { id: 10, name: 'legs', created_at: 'x' },
    { id: 11, name: 'hamstrings', created_at: 'x' },
  ],
}

describe('matchesExerciseQuery', () => {
  it('matches everything on an empty/whitespace query', () => {
    expect(matchesExerciseQuery(ex, '')).toBe(true)
    expect(matchesExerciseQuery(ex, '   ')).toBe(true)
  })

  it('matches on name substring, case-insensitive', () => {
    expect(matchesExerciseQuery(ex, 'romanian')).toBe(true)
    expect(matchesExerciseQuery(ex, 'DEAD')).toBe(true)
  })

  it('matches on alias, case-insensitive', () => {
    expect(matchesExerciseQuery(ex, 'rdl')).toBe(true)
    expect(matchesExerciseQuery(ex, 'stiff')).toBe(true)
  })

  it('matches on an exact tag name', () => {
    expect(matchesExerciseQuery(ex, 'legs')).toBe(true)
    expect(matchesExerciseQuery(ex, 'LEGS')).toBe(true)
    expect(matchesExerciseQuery(ex, 'hamstrings')).toBe(true)
  })

  it('does NOT match a tag on a partial/substring query', () => {
    // "leg" is a substring of the tag "legs" but tag matching is exact-only.
    // (It also must not match name/alias here — the name has no "leg", aliases do
    //  via "stiff leg deadlift", so use a fragment that only overlaps the tag.)
    expect(matchesExerciseQuery({ ...ex, aliases: [] }, 'leg')).toBe(false)
    expect(matchesExerciseQuery(ex, 'hamstr')).toBe(false)
  })

  it('returns false when nothing matches', () => {
    expect(matchesExerciseQuery(ex, 'squat')).toBe(false)
  })

  it('handles a missing aliases field', () => {
    const noAliases: Exercise = { ...ex, aliases: undefined }
    expect(matchesExerciseQuery(noAliases, 'romanian')).toBe(true)
    expect(matchesExerciseQuery(noAliases, 'rdl')).toBe(false)
  })
})

describe('filterExercises', () => {
  it('filters by query and single tag together', () => {
    const list = filterExercises([ex], 'rdl', null)
    expect(list).toHaveLength(1)
    expect(filterExercises([ex], 'rdl', 99)).toHaveLength(0)
    expect(filterExercises([ex], 'rdl', 10)).toHaveLength(1)
  })
})

describe('sortExercises', () => {
  const list: Exercise[] = [
    { ...ex, id: 1, name: 'Bench' },
    { ...ex, id: 2, name: 'Row' },
    { ...ex, id: 3, name: 'Squat' },
  ]
  const counts = new Map([
    [1, 2],
    [2, 10],
    [3, 10],
  ])

  it('sorts alphabetically by name by default', () => {
    expect(sortExercises(list, 'name', counts).map((e) => e.name)).toEqual(['Bench', 'Row', 'Squat'])
  })

  it('sorts by frequency descending with name as tiebreaker', () => {
    expect(sortExercises(list, 'frequency', counts).map((e) => e.name)).toEqual(['Row', 'Squat', 'Bench'])
  })
})
