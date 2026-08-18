import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth'
import { useExercisesStore } from '@/stores/exercises'
import { useWorkouts, resetActiveWorkoutCache } from '@/composables/useWorkouts'
import { supabase } from '@/lib/supabase'

const mockWorkoutInsertSingle = vi.fn()
const mockWorkoutSelectSingle = vi.fn()
const mockWorkoutUpdateSingle = vi.fn()
const mockWorkoutDeleteEq = vi.fn()
const mockWorkoutRecentLimit = vi.fn()
const mockWorkoutPageRange = vi.fn()
const mockWorkoutTemplateOrder = vi.fn()
const mockWeOrder = vi.fn()
const mockWeInsert = vi.fn()
const mockWeUpdateSelect = vi.fn()
const mockTeOrder = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: vi.fn((table: string) => {
      if (table === 'workouts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              // level 1: after .eq('id') (load) or .eq('user_id')
              single: mockWorkoutSelectSingle,
              eq: vi.fn(() => ({
                // level 2: after .eq('status') (recent/page) or .eq('template_id')
                order: vi.fn(() => ({
                  limit: mockWorkoutRecentLimit,
                  range: mockWorkoutPageRange,
                })),
                eq: vi.fn(() => ({ order: mockWorkoutTemplateOrder })),
              })),
            })),
          })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockWorkoutInsertSingle })) })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockWorkoutUpdateSingle })) })),
          })),
          delete: vi.fn(() => ({ eq: mockWorkoutDeleteEq })),
        }
      }
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockWeOrder })) })),
          insert: mockWeInsert,
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: mockWeUpdateSelect })) })),
        }
      }
      if (table === 'template_exercises') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockTeOrder })) })) }
      }
      return {}
    }),
    rpc: vi.fn(),
  },
}))

describe('useWorkouts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().session = { user: { id: 'test-user-id' } } as Session
    useExercisesStore().$patch({ exercises: [], loaded: true })
    resetActiveWorkoutCache()
    vi.clearAllMocks()
  })

  it('startWorkout inserts a new session and sets it active', async () => {
    const created = {
      id: 1,
      user_id: 'test-user-id',
      date: '2026-07-04',
      name: 'Push A',
      notes: null,
      template_id: null,
      created_at: 'x',
    }
    mockWorkoutInsertSingle.mockResolvedValue({ data: created, error: null })

    const { workout, workoutExercises, activeWorkout, startWorkout } = useWorkouts()
    const result = await startWorkout({ name: 'Push A' })

    expect(result).toEqual(created)
    expect(workout.value).toEqual(created)
    expect(workoutExercises.value).toEqual([])
    expect(activeWorkout.value?.id).toBe(1)
    expect(activeWorkout.value?.exercise_count).toBe(0)
  })

  it('startWorkout surfaces an error and returns null', async () => {
    mockWorkoutInsertSingle.mockResolvedValue({ data: null, error: { message: 'nope' } })

    const { error, startWorkout } = useWorkouts()
    const result = await startWorkout()

    expect(result).toBeNull()
    expect(error.value).toBe('nope')
  })

  it('loadWorkout fetches the workout and attaches exercises from the store', async () => {
    const squat = {
      id: 3,
      name: 'Squat',
      type: 'strength' as const,
      notes: null,
      created_by: null,
      created_at: 'x',
    }
    useExercisesStore().$patch({ exercises: [squat], loaded: true })

    const wk = {
      id: 7,
      user_id: 'test-user-id',
      date: '2026-07-04',
      name: null,
      notes: null,
      template_id: null,
      created_at: 'x',
    }
    const we = [
      {
        id: 20,
        workout_id: 7,
        exercise_id: 3,
        sort_order: 0,
        notes: null,
        pain_scale: null,
        created_at: 'x',
      },
    ]
    mockWorkoutSelectSingle.mockResolvedValue({ data: wk, error: null })
    mockWeOrder.mockResolvedValue({ data: we, error: null })

    const { workout, workoutExercises, loadWorkout } = useWorkouts()
    await loadWorkout(7)

    expect(workout.value).toEqual(wk)
    expect(workoutExercises.value).toEqual([{ ...we[0], exercise: squat }])
  })

  it('fetchRecentWorkouts maps the count and drops empty workouts', async () => {
    mockWorkoutRecentLimit.mockResolvedValue({
      data: [
        {
          id: 1,
          user_id: 'test-user-id',
          date: '2026-07-04',
          name: 'Push A',
          notes: null,
          template_id: null,
          created_at: 'x',
          workout_exercises: [{ count: 3 }],
        },
        {
          id: 2,
          user_id: 'test-user-id',
          date: '2026-07-03',
          name: null,
          notes: null,
          template_id: null,
          created_at: 'x',
          workout_exercises: [],
        },
      ],
      error: null,
    })

    const { recentWorkouts, fetchRecentWorkouts } = useWorkouts()
    await fetchRecentWorkouts()

    // empty workout (id 2) is filtered out
    expect(recentWorkouts.value).toHaveLength(1)
    expect(recentWorkouts.value[0]?.id).toBe(1)
    expect(recentWorkouts.value[0]?.exercise_count).toBe(3)
    // nested join column is stripped from the summary
    expect('workout_exercises' in recentWorkouts.value[0]!).toBe(false)
  })

  it('fetchWorkoutsPage stores the page and total count', async () => {
    mockWorkoutPageRange.mockResolvedValue({
      data: [
        {
          id: 5,
          user_id: 'test-user-id',
          date: '2026-07-04',
          name: null,
          notes: null,
          template_id: null,
          created_at: 'x',
          workout_exercises: [{ count: 2 }],
        },
      ],
      count: 23,
      error: null,
    })

    const { workoutsPage, totalWorkouts, fetchWorkoutsPage } = useWorkouts()
    await fetchWorkoutsPage(0, 10)

    expect(workoutsPage.value).toHaveLength(1)
    expect(workoutsPage.value[0]?.exercise_count).toBe(2)
    expect(totalWorkouts.value).toBe(23)
  })

  it('updateWorkout updates the active workout row', async () => {
    const wk = {
      id: 7,
      user_id: 'test-user-id',
      date: '2026-07-04',
      name: null,
      notes: null,
      template_id: null,
      created_at: 'x',
    }
    const updated = { ...wk, name: 'Leg Day', date: '2026-07-01' }
    mockWorkoutSelectSingle.mockResolvedValue({ data: wk, error: null })
    mockWeOrder.mockResolvedValue({ data: [], error: null })
    mockWorkoutUpdateSingle.mockResolvedValue({ data: updated, error: null })

    const { workout, loadWorkout, updateWorkout } = useWorkouts()
    await loadWorkout(7)
    const result = await updateWorkout(7, { name: 'Leg Day', date: '2026-07-01' })

    expect(result).toEqual(updated)
    expect(workout.value).toEqual(updated)
  })

  it('startWorkout with templateId copies template exercises', async () => {
    const created = {
      id: 8,
      user_id: 'test-user-id',
      date: '2026-07-05',
      name: null,
      notes: null,
      template_id: 3,
      created_at: 'x',
    }
    mockWorkoutInsertSingle.mockResolvedValue({ data: created, error: null })
    mockTeOrder.mockResolvedValue({
      data: [
        { exercise_id: 10, sort_order: 0 },
        { exercise_id: 11, sort_order: 1 },
      ],
      error: null,
    })
    mockWeInsert.mockResolvedValue({ error: null })
    mockWeOrder.mockResolvedValue({ data: [], error: null })

    const { workoutExercises, startWorkout } = useWorkouts()
    const result = await startWorkout({ templateId: 3 })

    expect(result?.template_id).toBe(3)
    expect(mockWeInsert).toHaveBeenCalled()
    expect(workoutExercises.value).toEqual([])
  })

  it('fetchWorkoutsByTemplate returns workouts linked to the template', async () => {
    mockWorkoutTemplateOrder.mockResolvedValue({
      data: [
        {
          id: 12,
          user_id: 'test-user-id',
          date: '2026-07-04',
          name: 'Push',
          notes: null,
          template_id: 3,
          created_at: 'x',
          workout_exercises: [{ count: 4 }],
        },
      ],
      error: null,
    })

    const { templateWorkouts, fetchWorkoutsByTemplate } = useWorkouts()
    await fetchWorkoutsByTemplate(3)

    expect(templateWorkouts.value).toHaveLength(1)
    expect(templateWorkouts.value[0]?.exercise_count).toBe(4)
  })

  it('reorderWorkoutExercises persists sort_order without touching the template', async () => {
    mockWeUpdateSelect.mockResolvedValue({ data: [{ id: 1 }], error: null })

    const { workoutExercises, reorderWorkoutExercises } = useWorkouts()
    workoutExercises.value = [
      {
        id: 1,
        workout_id: 5,
        exercise_id: 3,
        sort_order: 0,
        notes: null,
        pain_scale: null,
        created_at: 'x',
      },
      {
        id: 2,
        workout_id: 5,
        exercise_id: 5,
        sort_order: 1,
        notes: null,
        pain_scale: null,
        created_at: 'x',
      },
      {
        id: 3,
        workout_id: 5,
        exercise_id: 7,
        sort_order: 2,
        notes: null,
        pain_scale: null,
        created_at: 'x',
      },
    ]

    await reorderWorkoutExercises(0, 2)

    expect(workoutExercises.value.map((we) => we.id)).toEqual([2, 3, 1])
    expect(workoutExercises.value.map((we) => we.sort_order)).toEqual([0, 1, 2])
    expect(mockWeUpdateSelect).toHaveBeenCalledTimes(3)
    expect(mockTeOrder).not.toHaveBeenCalled()
  })

  it('reorderWorkoutExercises rolls back when saving fails', async () => {
    mockWeUpdateSelect.mockResolvedValue({ data: null, error: { message: 'nope' } })

    const { workoutExercises, error: err, reorderWorkoutExercises } = useWorkouts()
    workoutExercises.value = [
      {
        id: 1,
        workout_id: 5,
        exercise_id: 3,
        sort_order: 0,
        notes: null,
        pain_scale: null,
        created_at: 'x',
      },
      {
        id: 2,
        workout_id: 5,
        exercise_id: 5,
        sort_order: 1,
        notes: null,
        pain_scale: null,
        created_at: 'x',
      },
    ]

    await reorderWorkoutExercises(0, 1)

    expect(workoutExercises.value.map((we) => we.id)).toEqual([1, 2])
    expect(err.value).toBe('nope')
  })

  it('deleteWorkout clears the active workout when it is the one deleted', async () => {
    const wk = {
      id: 7,
      user_id: 'test-user-id',
      date: '2026-07-04',
      name: null,
      notes: null,
      template_id: null,
      created_at: 'x',
    }
    mockWorkoutSelectSingle.mockResolvedValue({ data: wk, error: null })
    mockWeOrder.mockResolvedValue({ data: [], error: null })
    mockWorkoutDeleteEq.mockResolvedValue({ error: null })

    const { workout, workoutExercises, loadWorkout, deleteWorkout } = useWorkouts()
    await loadWorkout(7)
    await deleteWorkout(7)

    expect(workout.value).toBeNull()
    expect(workoutExercises.value).toEqual([])
  })

  it('fetchPreviousSetsForExercises maps RPC rows into best + last-2 maps', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          exercise_id: 3,
          best_set: {
            id: 9,
            workout_exercise_id: 50,
            set_number: 2,
            weight_kg: 100,
            reps: 5,
            duration_seconds: null,
            distance_km: null,
            created_at: 'x',
          },
          last_sets: [
            {
              id: 1,
              workout_exercise_id: 55,
              set_number: 1,
              weight_kg: 80,
              reps: 8,
              duration_seconds: null,
              distance_km: null,
              created_at: 'x',
            },
            {
              id: 2,
              workout_exercise_id: 55,
              set_number: 2,
              weight_kg: 82,
              reps: 6,
              duration_seconds: null,
              distance_km: null,
              created_at: 'x',
            },
            {
              id: 3,
              workout_exercise_id: 55,
              set_number: 3,
              weight_kg: 85,
              reps: 4,
              duration_seconds: null,
              distance_km: null,
              created_at: 'x',
            },
          ],
        },
      ],
      error: null,
    } as never)

    const { bestSetByExercise, previousSetsByExercise, fetchPreviousSetsForExercises } =
      useWorkouts()
    await fetchPreviousSetsForExercises([3, 3], 11)

    expect(supabase.rpc).toHaveBeenCalledWith('exercise_session_refs', {
      p_exercise_ids: [3],
      p_exclude_workout_id: 11,
    })
    expect(bestSetByExercise.value.get(3)?.weight_kg).toBe(100)
    expect(previousSetsByExercise.value.get(3)?.map((s) => s.set_number)).toEqual([2, 3])
  })

  it('fetchPreviousSetsForExercises skips the RPC when there are no exercises', async () => {
    const { bestSetByExercise, previousSetsByExercise, fetchPreviousSetsForExercises } =
      useWorkouts()
    await fetchPreviousSetsForExercises([], 11)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(bestSetByExercise.value.size).toBe(0)
    expect(previousSetsByExercise.value.size).toBe(0)
  })
})
