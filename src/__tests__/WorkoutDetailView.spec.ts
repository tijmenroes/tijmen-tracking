import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import WorkoutDetailView from '@/views/WorkoutDetailView.vue'
import type { ExerciseSet, Workout, WorkoutExercise } from '@/types/fitness'

const mockPush = vi.fn<(path: string) => void>()
const mockLoadWorkout = vi.fn<(id: number) => Promise<void>>()
const mockDeleteWorkout = vi.fn<(id: number) => Promise<void>>()

const squatExercise = {
  id: 3,
  name: 'Squat',
  type: 'strength' as const,
  notes: null,
  created_by: null,
  created_at: 'x',
}

const benchExercise = {
  id: 5,
  name: 'Bench Press',
  type: 'strength' as const,
  notes: null,
  created_by: null,
  created_at: 'x',
}

const weSquat: WorkoutExercise = {
  id: 20,
  workout_id: 7,
  exercise_id: 3,
  sort_order: 0,
  notes: 'Goede vorm',
  pain_scale: 2,
  created_at: 'x',
  exercise: squatExercise,
}

const weBench: WorkoutExercise = {
  id: 21,
  workout_id: 7,
  exercise_id: 5,
  sort_order: 1,
  notes: null,
  pain_scale: null,
  created_at: 'x',
  exercise: benchExercise,
}

const squatSets: ExerciseSet[] = [
  { id: 1, workout_exercise_id: 20, set_number: 1, weight_kg: 100, reps: 5, duration_seconds: null, distance_km: null, created_at: 'x' },
  { id: 2, workout_exercise_id: 20, set_number: 2, weight_kg: 100, reps: 5, duration_seconds: null, distance_km: null, created_at: 'x' },
]

const benchSets: ExerciseSet[] = [
  { id: 3, workout_exercise_id: 21, set_number: 1, weight_kg: 80, reps: 8, duration_seconds: null, distance_km: null, created_at: 'x' },
]

const setsByWeId: Record<number, ExerciseSet[]> = {
  20: squatSets,
  21: benchSets,
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((_col: string, id: number) => ({
          order: vi.fn(() => Promise.resolve({ data: setsByWeId[id] ?? [], error: null })),
        })),
      })),
    })),
  },
}))

const workout = ref<Workout | null>(null)
const workoutExercises = ref<WorkoutExercise[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn<() => void>() }),
  useRoute: () => ({ params: { id: '7' } }),
}))

vi.mock('@/composables/useWorkouts', () => ({
  useWorkouts: () => ({
    workout,
    workoutExercises,
    loading,
    error,
    loadWorkout: mockLoadWorkout,
    deleteWorkout: mockDeleteWorkout,
  }),
}))

describe('WorkoutDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    workout.value = {
      id: 7,
      user_id: 'test-user-id',
      date: '2026-07-04',
      name: 'Push A',
      notes: null,
      template_id: null,
      status: 'saved',
      created_at: 'x',
      saved_at: 'x',
    }
    workoutExercises.value = [weSquat, weBench]
    loading.value = false
    error.value = null
    mockLoadWorkout.mockResolvedValue(undefined)
    mockDeleteWorkout.mockResolvedValue(undefined)
  })

  it('shows all sets and reps for each exercise', async () => {
    const wrapper = mount(WorkoutDetailView)
    await flushPromises()

    expect(mockLoadWorkout).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Squat')
    expect(wrapper.text()).toContain('Bench Press')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('80')
    expect(wrapper.text()).toContain('Goede vorm')
    expect(wrapper.text()).toContain('Pijn 2/10')
  })

  it('navigates to exercise detail when exercise name is clicked', async () => {
    const wrapper = mount(WorkoutDetailView)
    await flushPromises()

    const squatBtn = wrapper.findAll('.wdetail__exercise-name')[0]!
    await squatBtn.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/exercises/3/detail')
  })

  it('deletes the workout after confirmation', async () => {
    const wrapper = mount(WorkoutDetailView)
    await flushPromises()

    await wrapper.find('.wdetail__delete').trigger('click')
    await wrapper.find('.confirm__btn--danger').trigger('click')
    await flushPromises()

    expect(mockDeleteWorkout).toHaveBeenCalledWith(7)
    expect(mockPush).toHaveBeenCalledWith('/workout/history')
  })
})
