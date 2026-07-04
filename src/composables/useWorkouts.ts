import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Workout, WorkoutExercise, WorkoutSummary } from '@/types/fitness'

export function useWorkouts() {
  const workout = ref<Workout | null>(null)
  const workoutExercises = ref<WorkoutExercise[]>([])
  const recentWorkouts = ref<WorkoutSummary[]>([])
  const workoutsPage = ref<WorkoutSummary[]>([])
  const totalWorkouts = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  type SummaryRow = Workout & { workout_exercises?: { count: number }[] }
  function toSummaries(rows: SummaryRow[]): WorkoutSummary[] {
    return rows
      .map(({ workout_exercises, ...rest }) => ({
        ...rest,
        exercise_count: workout_exercises?.[0]?.count ?? 0,
      }))
      .filter((w) => w.exercise_count > 0)
  }

  function todayIso(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  /**
   * Start a new workout session for today and set it as the active workout.
   * Multiple sessions per day are allowed (see migration_004).
   */
  async function startWorkout(opts: { name?: string } = {}): Promise<Workout | null> {
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { error.value = 'Not authenticated'; return null }

    const { data: created, error: err } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, date: todayIso(), name: opts.name ?? null })
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    workout.value = created
    workoutExercises.value = []
    return created as Workout
  }

  /** Load a specific workout by id (for the session and detail screens). */
  async function loadWorkout(id: number) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single()
    if (err) { error.value = err.message; loading.value = false; return }
    workout.value = data
    await fetchWorkoutExercises()
    loading.value = false
  }

  /** Fetch the most recent workouts (with exercise counts) for the dashboard. */
  async function fetchRecentWorkouts(limit = 5) {
    loading.value = true
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { loading.value = false; return }

    // !inner → only workouts that have at least one exercise
    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, workout_exercises!inner(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    loading.value = false
    if (err) { error.value = err.message; return }
    recentWorkouts.value = toSummaries((data ?? []) as SummaryRow[])
  }

  /** Fetch one page of workouts (newest first) with the total count for pagination. */
  async function fetchWorkoutsPage(offset: number, limit: number) {
    loading.value = true
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { loading.value = false; return }

    const { data, count, error: err } = await supabase
      .from('workouts')
      .select('*, workout_exercises!inner(count)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    loading.value = false
    if (err) { error.value = err.message; return }
    workoutsPage.value = toSummaries((data ?? []) as SummaryRow[])
    totalWorkouts.value = count ?? 0
  }

  async function deleteWorkout(id: number) {
    const { error: err } = await supabase.from('workouts').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    if (workout.value?.id === id) {
      workout.value = null
      workoutExercises.value = []
    }
  }

  async function fetchWorkoutExercises() {
    if (!workout.value) return
    const { data, error: err } = await supabase
      .from('workout_exercises')
      .select('*, exercise:exercises(*)')
      .eq('workout_id', workout.value.id)
      .order('sort_order')
    if (err) { error.value = err.message; return }
    workoutExercises.value = (data ?? []) as WorkoutExercise[]
  }

  async function addExerciseToWorkout(exerciseId: number) {
    if (!workout.value) return null
    const sortOrder = workoutExercises.value.length
    const { data, error: err } = await supabase
      .from('workout_exercises')
      .insert({ workout_id: workout.value.id, exercise_id: exerciseId, sort_order: sortOrder })
      .select('*, exercise:exercises(*)')
      .single()
    if (err) { error.value = err.message; return null }
    workoutExercises.value.push(data as WorkoutExercise)
    return data as WorkoutExercise
  }

  async function removeExerciseFromWorkout(workoutExerciseId: number) {
    const { error: err } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', workoutExerciseId)
    if (err) { error.value = err.message; return }
    workoutExercises.value = workoutExercises.value.filter(we => we.id !== workoutExerciseId)
  }

  async function updateWorkoutExercise(id: number, payload: { notes?: string | null; pain_scale?: number | null }) {
    const { error: err } = await supabase
      .from('workout_exercises')
      .update(payload)
      .eq('id', id)
    if (err) { error.value = err.message; return }
    const we = workoutExercises.value.find(w => w.id === id)
    if (we) Object.assign(we, payload)
  }

  return {
    workout,
    workoutExercises,
    recentWorkouts,
    workoutsPage,
    totalWorkouts,
    loading,
    error,
    startWorkout,
    loadWorkout,
    fetchRecentWorkouts,
    fetchWorkoutsPage,
    deleteWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    updateWorkoutExercise,
    fetchWorkoutExercises,
  }
}
