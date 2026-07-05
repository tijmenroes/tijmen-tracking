import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth'
import { useExercisesStore } from '@/stores/exercises'
import { useWorkouts } from '@/composables/useWorkouts'

const mockWorkoutInsertSingle = vi.fn()
const mockWorkoutSelectSingle = vi.fn()
const mockWorkoutUpdateSingle = vi.fn()
const mockWorkoutDeleteEq = vi.fn()
const mockWorkoutRecentLimit = vi.fn()
const mockWorkoutPageRange = vi.fn()
const mockWorkoutTemplateOrder = vi.fn()
const mockWeOrder = vi.fn()
const mockWeInsert = vi.fn()
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
                order: vi.fn(() => ({ limit: mockWorkoutRecentLimit, range: mockWorkoutPageRange })),
                eq: vi.fn(() => ({ order: mockWorkoutTemplateOrder })),
              })),
            })),
          })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockWorkoutInsertSingle })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockWorkoutUpdateSingle })) })) })),
          delete: vi.fn(() => ({ eq: mockWorkoutDeleteEq })),
        }
      }
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockWeOrder })) })),
          insert: mockWeInsert,
        }
      }
      if (table === 'template_exercises') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockTeOrder })) })) }
      }
      return {}
    }),
  },
}))

describe('useWorkouts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().session = { user: { id: 'test-user-id' } } as Session
    useExercisesStore().$patch({ exercises: [], loaded: true })
    vi.clearAllMocks()
  })

  it('startWorkout inserts a new session and sets it active', async () => {
    const created = { id: 1, user_id: 'test-user-id', date: '2026-07-04', name: 'Push A', notes: null, template_id: null, created_at: 'x' }
    mockWorkoutInsertSingle.mockResolvedValue({ data: created, error: null })

    const { workout, workoutExercises, startWorkout } = useWorkouts()
    const result = await startWorkout({ name: 'Push A' })

    expect(result).toEqual(created)
    expect(workout.value).toEqual(created)
    expect(workoutExercises.value).toEqual([])
  })

  it('startWorkout surfaces an error and returns null', async () => {
    mockWorkoutInsertSingle.mockResolvedValue({ data: null, error: { message: 'nope' } })

    const { error, startWorkout } = useWorkouts()
    const result = await startWorkout()

    expect(result).toBeNull()
    expect(error.value).toBe('nope')
  })

  it('loadWorkout fetches the workout and attaches exercises from the store', async () => {
    const squat = { id: 3, name: 'Squat', type: 'strength' as const, notes: null, created_by: null, created_at: 'x' }
    useExercisesStore().$patch({ exercises: [squat], loaded: true })

    const wk = { id: 7, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, template_id: null, created_at: 'x' }
    const we = [{ id: 20, workout_id: 7, exercise_id: 3, sort_order: 0, notes: null, pain_scale: null, created_at: 'x' }]
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
        { id: 1, user_id: 'test-user-id', date: '2026-07-04', name: 'Push A', notes: null, template_id: null, created_at: 'x', workout_exercises: [{ count: 3 }] },
        { id: 2, user_id: 'test-user-id', date: '2026-07-03', name: null, notes: null, template_id: null, created_at: 'x', workout_exercises: [] },
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
        { id: 5, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, template_id: null, created_at: 'x', workout_exercises: [{ count: 2 }] },
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
    const wk = { id: 7, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, template_id: null, created_at: 'x' }
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
    const created = { id: 8, user_id: 'test-user-id', date: '2026-07-05', name: null, notes: null, template_id: 3, created_at: 'x' }
    mockWorkoutInsertSingle.mockResolvedValue({ data: created, error: null })
    mockTeOrder.mockResolvedValue({
      data: [{ exercise_id: 10, sort_order: 0 }, { exercise_id: 11, sort_order: 1 }],
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
        { id: 12, user_id: 'test-user-id', date: '2026-07-04', name: 'Push', notes: null, template_id: 3, created_at: 'x', workout_exercises: [{ count: 4 }] },
      ],
      error: null,
    })

    const { templateWorkouts, fetchWorkoutsByTemplate } = useWorkouts()
    await fetchWorkoutsByTemplate(3)

    expect(templateWorkouts.value).toHaveLength(1)
    expect(templateWorkouts.value[0]?.exercise_count).toBe(4)
  })

  it('deleteWorkout clears the active workout when it is the one deleted', async () => {
    const wk = { id: 7, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, template_id: null, created_at: 'x' }
    mockWorkoutSelectSingle.mockResolvedValue({ data: wk, error: null })
    mockWeOrder.mockResolvedValue({ data: [], error: null })
    mockWorkoutDeleteEq.mockResolvedValue({ error: null })

    const { workout, workoutExercises, loadWorkout, deleteWorkout } = useWorkouts()
    await loadWorkout(7)
    await deleteWorkout(7)

    expect(workout.value).toBeNull()
    expect(workoutExercises.value).toEqual([])
  })
})
