import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExerciseSets } from '@/composables/useExerciseSets'
import { supabase } from '@/lib/supabase'

const mockSetsEqOrder = vi.fn()
const mockPrevWeMaybeSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'exercise_sets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: mockSetsEqOrder })),
          })),
        }
      }
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({ maybeSingle: mockPrevWeMaybeSingle })),
                })),
              })),
            })),
          })),
        }
      }
      return {}
    }),
  },
}))

describe('useExerciseSets.fetchPreviousSets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sets from the most recent other workout session for this exercise', async () => {
    mockPrevWeMaybeSingle.mockResolvedValue({ data: { id: 55 }, error: null })
    mockSetsEqOrder.mockResolvedValue({
      data: [
        { id: 1, workout_exercise_id: 55, set_number: 1, weight_kg: 20, reps: 8, duration_seconds: null, distance_km: null, created_at: 'x' },
      ],
      error: null,
    })

    const { previousSets, fetchPreviousSets } = useExerciseSets()
    await fetchPreviousSets(3, 11)

    expect(previousSets.value).toHaveLength(1)
    expect(previousSets.value[0]?.weight_kg).toBe(20)
  })

  it('returns empty when there is no previous session', async () => {
    mockPrevWeMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { previousSets, fetchPreviousSets } = useExerciseSets()
    await fetchPreviousSets(3, 11)

    expect(previousSets.value).toEqual([])
  })

  it('applyPreviousSets replaces current sets with previous values', async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const mockInsertSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 10, workout_exercise_id: 99, set_number: 1, weight_kg: 80, reps: 10, duration_seconds: null, distance_km: null, created_at: 'x' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 11, workout_exercise_id: 99, set_number: 2, weight_kg: 80, reps: 8, duration_seconds: null, distance_km: null, created_at: 'x' },
        error: null,
      })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'exercise_sets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: mockSetsEqOrder })),
          })),
          delete: vi.fn(() => ({ eq: mockDeleteEq })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsertSingle })) })),
        } as never
      }
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({ maybeSingle: mockPrevWeMaybeSingle })),
                })),
              })),
            })),
          })),
        } as never
      }
      return {} as never
    })

    mockPrevWeMaybeSingle.mockResolvedValue({ data: { id: 55 }, error: null })
    mockSetsEqOrder.mockResolvedValue({
      data: [{ id: 1, workout_exercise_id: 99, set_number: 1, weight_kg: null, reps: null, duration_seconds: null, distance_km: null, created_at: 'x' }],
      error: null,
    })

    const { previousSets, sets, fetchPreviousSets, fetchSets, applyPreviousSets } = useExerciseSets()
    await fetchSets(99)
    await fetchPreviousSets(3, 11)
    previousSets.value = [
      { id: 100, workout_exercise_id: 55, set_number: 1, weight_kg: 80, reps: 10, duration_seconds: null, distance_km: null, created_at: 'x' },
      { id: 101, workout_exercise_id: 55, set_number: 2, weight_kg: 80, reps: 8, duration_seconds: null, distance_km: null, created_at: 'x' },
    ]

    await applyPreviousSets(99)

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 1)
    expect(sets.value).toHaveLength(2)
    expect(sets.value[0]?.weight_kg).toBe(80)
    expect(sets.value[0]?.reps).toBe(10)
    expect(sets.value[1]?.reps).toBe(8)
  })
})
