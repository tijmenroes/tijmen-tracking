import { describe, it, expect } from 'vitest'
import { strengthVolume, workoutDurationMinutes } from '@/utils/volume'
import type { ExerciseSet } from '@/types/fitness'

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

describe('strengthVolume', () => {
  it('sums weight × reps across sets', () => {
    expect(strengthVolume([set({ weight_kg: 100, reps: 5 }), set({ weight_kg: 90, reps: 8 })])).toBe(1220)
  })

  it('ignores sets missing weight or reps', () => {
    expect(
      strengthVolume([
        set({ weight_kg: 100, reps: 5 }),
        set({ weight_kg: null, reps: 5 }),
        set({ weight_kg: 100, reps: null }),
      ]),
    ).toBe(500)
  })

  it('ignores endurance-only and zero-load sets', () => {
    expect(
      strengthVolume([set({ duration_seconds: 600, distance_km: 3 }), set({ weight_kg: 0, reps: 10 })]),
    ).toBe(0)
  })

  it('returns 0 for an empty list', () => {
    expect(strengthVolume([])).toBe(0)
  })
})

describe('workoutDurationMinutes', () => {
  it('rounds the span to whole minutes', () => {
    expect(workoutDurationMinutes('2026-07-11T10:00:00Z', '2026-07-11T10:45:00Z')).toBe(45)
    expect(workoutDurationMinutes('2026-07-11T10:00:00Z', '2026-07-11T10:45:40Z')).toBe(46)
  })

  it('returns null without a saved_at', () => {
    expect(workoutDurationMinutes('2026-07-11T10:00:00Z', null)).toBeNull()
  })

  it('returns null on a negative span (clock skew)', () => {
    expect(workoutDurationMinutes('2026-07-11T10:00:00Z', '2026-07-11T09:00:00Z')).toBeNull()
  })

  it('returns null on unparseable input', () => {
    expect(workoutDurationMinutes('nonsense', 'also nonsense')).toBeNull()
  })
})
