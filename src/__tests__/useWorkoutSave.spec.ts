import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth'
import { useWorkouts, resetActiveWorkoutCache } from '@/composables/useWorkouts'

const mockActiveMaybeSingle = vi.fn()
const mockWorkoutUpdateSingle = vi.fn()
const mockWorkoutDeleteEq = vi.fn()
const mockSetsDeleteIn = vi.fn()
const mockWeDeleteEq = vi.fn()

// workout_exercises `.select().eq()` results, consumed in call order.
let weSelectResults: Array<{ data?: unknown; error: unknown; count?: number }> = []
let weSelectIdx = 0

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: vi.fn((table: string) => {
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve(weSelectResults[weSelectIdx++] ?? { data: [], error: null, count: 0 }),
            ),
          })),
          delete: vi.fn(() => ({ eq: mockWeDeleteEq })),
        }
      }
      if (table === 'exercise_sets') {
        return { delete: vi.fn(() => ({ in: mockSetsDeleteIn })) }
      }
      if (table === 'workouts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: mockActiveMaybeSingle })) })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockWorkoutUpdateSingle })) })),
          })),
          delete: vi.fn(() => ({ eq: mockWorkoutDeleteEq })),
        }
      }
      return {}
    }),
  },
}))

describe('useWorkouts – active workout & save', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().session = { user: { id: 'test-user-id' } } as Session
    vi.clearAllMocks()
    resetActiveWorkoutCache()
    weSelectResults = []
    weSelectIdx = 0
    mockWeDeleteEq.mockResolvedValue({ error: null })
    mockSetsDeleteIn.mockResolvedValue({ error: null })
  })

  it('fetchActiveWorkout returns the current draft with an exercise count', async () => {
    mockActiveMaybeSingle.mockResolvedValue({
      data: {
        id: 3, user_id: 'test-user-id', date: '2026-07-05', name: 'Push A',
        notes: null, template_id: null, status: 'active', created_at: 'x',
        workout_exercises: [{ count: 2 }],
      },
      error: null,
    })

    const { activeWorkout, fetchActiveWorkout } = useWorkouts()
    const result = await fetchActiveWorkout()

    expect(result?.id).toBe(3)
    expect(result?.exercise_count).toBe(2)
    expect(activeWorkout.value?.id).toBe(3)
    expect('workout_exercises' in (activeWorkout.value ?? {})).toBe(false)
  })

  it('fetchActiveWorkout returns null when there is no draft', async () => {
    mockActiveMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { activeWorkout, fetchActiveWorkout } = useWorkouts()
    const result = await fetchActiveWorkout()

    expect(result).toBeNull()
    expect(activeWorkout.value).toBeNull()
  })

  it('fetchActiveWorkout uses the cache on subsequent calls', async () => {
    mockActiveMaybeSingle.mockResolvedValue({
      data: {
        id: 3, user_id: 'test-user-id', date: '2026-07-05', name: 'Push A',
        notes: null, template_id: null, status: 'active', created_at: 'x',
        workout_exercises: [{ count: 2 }],
      },
      error: null,
    })

    const first = useWorkouts()
    await first.fetchActiveWorkout()
    const second = useWorkouts()
    const result = await second.fetchActiveWorkout()

    expect(result?.id).toBe(3)
    expect(mockActiveMaybeSingle).toHaveBeenCalledTimes(1)
  })

  it('saveWorkout deletes empty sets and marks the workout saved', async () => {
    weSelectResults = [
      {
        data: [
          {
            id: 1, notes: null, pain_scale: null,
            exercise_sets: [
              { id: 10, weight_kg: 50, reps: 5, duration_seconds: null, distance_km: null },
              { id: 11, weight_kg: null, reps: null, duration_seconds: null, distance_km: null },
            ],
          },
        ],
        error: null,
      },
      { count: 1, error: null },
    ]
    mockWorkoutUpdateSingle.mockResolvedValue({
      data: { id: 99, status: 'saved' }, error: null,
    })

    const { saveWorkout } = useWorkouts()
    const result = await saveWorkout(99)

    expect(mockSetsDeleteIn).toHaveBeenCalledWith('id', [11])
    // Exercise still has a filled set → not removed
    expect(mockWeDeleteEq).not.toHaveBeenCalled()
    expect(result).toEqual({ deleted: false })
  })

  it('saveWorkout does not delete sets when all are filled', async () => {
    weSelectResults = [
      {
        data: [
          {
            id: 1, notes: null, pain_scale: null,
            exercise_sets: [{ id: 10, weight_kg: 50, reps: 5, duration_seconds: null, distance_km: null }],
          },
        ],
        error: null,
      },
      { count: 1, error: null },
    ]
    mockWorkoutUpdateSingle.mockResolvedValue({ data: { id: 99, status: 'saved' }, error: null })

    const { saveWorkout } = useWorkouts()
    const result = await saveWorkout(99)

    expect(mockSetsDeleteIn).not.toHaveBeenCalled()
    expect(result).toEqual({ deleted: false })
  })

  it('saveWorkout removes empty exercises and deletes a fully empty workout', async () => {
    weSelectResults = [
      {
        data: [
          {
            id: 1, notes: null, pain_scale: null,
            exercise_sets: [{ id: 11, weight_kg: null, reps: null, duration_seconds: null, distance_km: null }],
          },
        ],
        error: null,
      },
      { count: 0, error: null },
    ]
    mockWorkoutDeleteEq.mockResolvedValue({ error: null })

    const { saveWorkout } = useWorkouts()
    const result = await saveWorkout(99)

    expect(mockSetsDeleteIn).toHaveBeenCalledWith('id', [11])
    expect(mockWeDeleteEq).toHaveBeenCalled()
    expect(mockWorkoutDeleteEq).toHaveBeenCalled()
    expect(result).toEqual({ deleted: true })
  })

  it('saveWorkout keeps an exercise that has notes even without sets', async () => {
    weSelectResults = [
      {
        data: [
          {
            id: 1, notes: 'schouder stijf', pain_scale: null,
            exercise_sets: [{ id: 11, weight_kg: null, reps: null, duration_seconds: null, distance_km: null }],
          },
        ],
        error: null,
      },
      { count: 1, error: null },
    ]
    mockWorkoutUpdateSingle.mockResolvedValue({ data: { id: 99, status: 'saved' }, error: null })

    const { saveWorkout } = useWorkouts()
    const result = await saveWorkout(99)

    expect(mockSetsDeleteIn).toHaveBeenCalledWith('id', [11])
    // Exercise kept because it has notes
    expect(mockWeDeleteEq).not.toHaveBeenCalled()
    expect(result).toEqual({ deleted: false })
  })
})
