import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkouts } from '@/composables/useWorkouts'

const mockWorkoutInsertSingle = vi.fn()
const mockWorkoutSelectSingle = vi.fn()
const mockWorkoutDeleteEq = vi.fn()
const mockWorkoutRecentLimit = vi.fn()
const mockWorkoutPageRange = vi.fn()
const mockWeOrder = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: vi.fn((table: string) => {
      if (table === 'workouts') {
        return {
          // loadWorkout: select('*').eq('id').single()
          // fetchRecentWorkouts: select(...).eq('user_id').order().limit()
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockWorkoutSelectSingle,
              order: vi.fn(() => ({ limit: mockWorkoutRecentLimit, range: mockWorkoutPageRange })),
            })),
          })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockWorkoutInsertSingle })) })),
          delete: vi.fn(() => ({ eq: mockWorkoutDeleteEq })),
        }
      }
      if (table === 'workout_exercises') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockWeOrder })) })) }
      }
      return {}
    }),
  },
}))

describe('useWorkouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('startWorkout inserts a new session and sets it active', async () => {
    const created = { id: 1, user_id: 'test-user-id', date: '2026-07-04', name: 'Push A', notes: null, created_at: 'x' }
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

  it('loadWorkout fetches the workout and its exercises', async () => {
    const wk = { id: 7, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, created_at: 'x' }
    const we = [{ id: 20, workout_id: 7, exercise_id: 3, sort_order: 0, notes: null, pain_scale: null, created_at: 'x', exercise: { id: 3, name: 'Squat' } }]
    mockWorkoutSelectSingle.mockResolvedValue({ data: wk, error: null })
    mockWeOrder.mockResolvedValue({ data: we, error: null })

    const { workout, workoutExercises, loadWorkout } = useWorkouts()
    await loadWorkout(7)

    expect(workout.value).toEqual(wk)
    expect(workoutExercises.value).toEqual(we)
  })

  it('fetchRecentWorkouts maps the count and drops empty workouts', async () => {
    mockWorkoutRecentLimit.mockResolvedValue({
      data: [
        { id: 1, user_id: 'test-user-id', date: '2026-07-04', name: 'Push A', notes: null, created_at: 'x', workout_exercises: [{ count: 3 }] },
        { id: 2, user_id: 'test-user-id', date: '2026-07-03', name: null, notes: null, created_at: 'x', workout_exercises: [] },
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
        { id: 5, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, created_at: 'x', workout_exercises: [{ count: 2 }] },
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

  it('deleteWorkout clears the active workout when it is the one deleted', async () => {
    const wk = { id: 7, user_id: 'test-user-id', date: '2026-07-04', name: null, notes: null, created_at: 'x' }
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
