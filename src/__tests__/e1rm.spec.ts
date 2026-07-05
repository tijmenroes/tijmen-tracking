import { describe, it, expect } from 'vitest'
import { epley1RM, bestSetE1RM, roundE1RM } from '@/utils/e1rm'
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

describe('epley1RM', () => {
  it('applies the Epley formula w × (1 + reps/30)', () => {
    expect(epley1RM(70, 12)).toBeCloseTo(98)
    expect(epley1RM(75, 9)).toBeCloseTo(97.5)
  })

  it('returns the weight itself at 0 reps... but guards against non-positive reps', () => {
    expect(epley1RM(100, 0)).toBeNull()
  })

  it('returns null for missing or non-positive inputs', () => {
    expect(epley1RM(null, 10)).toBeNull()
    expect(epley1RM(80, null)).toBeNull()
    expect(epley1RM(0, 10)).toBeNull()
    expect(epley1RM(-5, 10)).toBeNull()
  })
})

describe('bestSetE1RM', () => {
  it('picks the highest e1RM across sets regardless of order', () => {
    const sets = [
      set({ set_number: 1, weight_kg: 70, reps: 12 }), // 98
      set({ set_number: 2, weight_kg: 75, reps: 9 }), // 97.5
      set({ set_number: 3, weight_kg: 60, reps: 8 }), // 76
    ]
    expect(bestSetE1RM(sets)).toBeCloseTo(98)
  })

  it('ignores sets without usable weight/reps', () => {
    const sets = [
      set({ set_number: 1, weight_kg: null, reps: 10 }),
      set({ set_number: 2, weight_kg: 50, reps: 10 }), // 66.67
    ]
    expect(bestSetE1RM(sets)).toBeCloseTo(66.667, 2)
  })

  it('returns null when no set is usable', () => {
    expect(bestSetE1RM([set({ duration_seconds: 60 })])).toBeNull()
    expect(bestSetE1RM([])).toBeNull()
  })
})

describe('roundE1RM', () => {
  it('rounds to the nearest 0.5 kg', () => {
    expect(roundE1RM(98)).toBe(98)
    expect(roundE1RM(97.5)).toBe(97.5)
    expect(roundE1RM(66.667)).toBe(66.5)
    expect(roundE1RM(66.8)).toBe(67)
  })
})
