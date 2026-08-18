import { describe, it, expect } from 'vitest'
import type { ExerciseSet } from '@/types/fitness'
import {
  takeLastSets,
  pickHeaviestSet,
  shouldPrefillPreviousSets,
  mapSessionRefRows,
} from '@/utils/sessionRefs'

function set(partial: Partial<ExerciseSet>): ExerciseSet {
  return {
    id: 1,
    workout_exercise_id: 1,
    set_number: 1,
    weight_kg: null,
    reps: null,
    duration_seconds: null,
    distance_km: null,
    created_at: 'x',
    ...partial,
  }
}

describe('takeLastSets', () => {
  it('returns the last N sets by set_number, keeping ascending order', () => {
    const sets = [
      set({ id: 1, set_number: 1, weight_kg: 60 }),
      set({ id: 2, set_number: 2, weight_kg: 70 }),
      set({ id: 3, set_number: 3, weight_kg: 80 }),
      set({ id: 4, set_number: 4, weight_kg: 85 }),
    ]
    expect(takeLastSets(sets, 2).map((s) => s.set_number)).toEqual([3, 4])
  })

  it('returns all sets when there are fewer than max', () => {
    expect(takeLastSets([set({ set_number: 1 })], 2)).toHaveLength(1)
  })

  it('returns an empty array for empty input', () => {
    expect(takeLastSets([], 2)).toEqual([])
  })

  it('sorts by set_number even when input is unordered', () => {
    const sets = [
      set({ id: 3, set_number: 3, weight_kg: 80 }),
      set({ id: 1, set_number: 1, weight_kg: 60 }),
      set({ id: 2, set_number: 2, weight_kg: 70 }),
    ]
    expect(takeLastSets(sets, 2).map((s) => s.id)).toEqual([2, 3])
  })
})

describe('pickHeaviestSet', () => {
  it('picks the set with the highest weight_kg', () => {
    const sets = [
      set({ id: 1, weight_kg: 80, reps: 8 }),
      set({ id: 2, weight_kg: 90, reps: 4 }),
      set({ id: 3, weight_kg: 85, reps: 6 }),
    ]
    expect(pickHeaviestSet(sets)?.id).toBe(2)
  })

  it('tie-breaks equal weight by more reps, then higher id', () => {
    const sameReps = [
      set({ id: 1, weight_kg: 100, reps: 5 }),
      set({ id: 2, weight_kg: 100, reps: 5 }),
    ]
    expect(pickHeaviestSet(sameReps)?.id).toBe(2)

    const moreReps = [
      set({ id: 3, weight_kg: 100, reps: 3 }),
      set({ id: 4, weight_kg: 100, reps: 6 }),
    ]
    expect(pickHeaviestSet(moreReps)?.id).toBe(4)
  })

  it('ignores sets without weight', () => {
    expect(
      pickHeaviestSet([set({ duration_seconds: 60 }), set({ weight_kg: 50, reps: 8 })])?.weight_kg,
    ).toBe(50)
    expect(pickHeaviestSet([set({ reps: 10 })])).toBeNull()
    expect(pickHeaviestSet([])).toBeNull()
  })
})

describe('shouldPrefillPreviousSets', () => {
  it('prefills when current sets are empty and previous sets exist', () => {
    expect(shouldPrefillPreviousSets([set({})], [set({ weight_kg: 80, reps: 8 })], false)).toBe(
      true,
    )
  })

  it('does not prefill when the user already logged metrics', () => {
    expect(
      shouldPrefillPreviousSets(
        [set({ weight_kg: 60, reps: 8 })],
        [set({ weight_kg: 80, reps: 8 })],
        false,
      ),
    ).toBe(false)
  })

  it('does not prefill twice or without previous sets', () => {
    expect(shouldPrefillPreviousSets([set({})], [set({ weight_kg: 80 })], true)).toBe(false)
    expect(shouldPrefillPreviousSets([set({})], [], false)).toBe(false)
  })
})

describe('mapSessionRefRows', () => {
  it('maps one best set and caps last sets at 2', () => {
    const { bestSetByExercise, previousSetsByExercise } = mapSessionRefRows([
      {
        exercise_id: 3,
        best_set: set({ id: 9, weight_kg: 120, reps: 3 }),
        last_sets: [
          set({ id: 1, set_number: 1, weight_kg: 80 }),
          set({ id: 2, set_number: 2, weight_kg: 85 }),
          set({ id: 3, set_number: 3, weight_kg: 90 }),
        ],
      },
    ])

    expect(bestSetByExercise.get(3)?.weight_kg).toBe(120)
    expect(previousSetsByExercise.get(3)?.map((s) => s.set_number)).toEqual([2, 3])
  })

  it('skips a missing best set and treats null last_sets as empty', () => {
    const { bestSetByExercise, previousSetsByExercise } = mapSessionRefRows([
      { exercise_id: 7, best_set: null, last_sets: null },
    ])
    expect(bestSetByExercise.has(7)).toBe(false)
    expect(previousSetsByExercise.get(7)).toEqual([])
  })
})
