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

  const templateWorkouts = ref<WorkoutSummary[]>([])

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
  async function startWorkout(opts: { name?: string; templateId?: number } = {}): Promise<Workout | null> {
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { error.value = 'Not authenticated'; return null }

    const insertPayload: {
      user_id: string
      date: string
      name: string | null
      template_id?: number
    } = {
      user_id: user.id,
      date: todayIso(),
      name: opts.name ?? null,
    }
    if (opts.templateId) insertPayload.template_id = opts.templateId

    const { data: created, error: err } = await supabase
      .from('workouts')
      .insert(insertPayload)
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    workout.value = created
    workoutExercises.value = []

    if (opts.templateId) {
      const { data: templateRows, error: teErr } = await supabase
        .from('template_exercises')
        .select('exercise_id, sort_order')
        .eq('template_id', opts.templateId)
        .order('sort_order')
      if (teErr) { error.value = teErr.message; return null }

      if (templateRows?.length) {
        const { error: copyErr } = await supabase.from('workout_exercises').insert(
          templateRows.map((te) => ({
            workout_id: created.id,
            exercise_id: te.exercise_id,
            sort_order: te.sort_order,
          })),
        )
        if (copyErr) { error.value = copyErr.message; return null }
        await fetchWorkoutExercises()
      }
    }

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

  /** Workouts started from a given template (via workouts.template_id). */
  async function fetchWorkoutsByTemplate(templateId: number) {
    loading.value = true
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { loading.value = false; return }

    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, workout_exercises!inner(count)')
      .eq('user_id', user.id)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
    loading.value = false
    if (err) { error.value = err.message; return }
    templateWorkouts.value = toSummaries((data ?? []) as SummaryRow[])
  }

  async function deleteWorkout(id: number) {
    const { error: err } = await supabase.from('workouts').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    if (workout.value?.id === id) {
      workout.value = null
      workoutExercises.value = []
    }
  }

  async function updateWorkout(
    id: number,
    payload: { name?: string | null; date?: string; notes?: string | null },
  ) {
    error.value = null
    const { data, error: err } = await supabase
      .from('workouts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    if (workout.value?.id === id) workout.value = data as Workout
    return data as Workout
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
    templateWorkouts,
    loading,
    error,
    startWorkout,
    loadWorkout,
    fetchRecentWorkouts,
    fetchWorkoutsPage,
    fetchWorkoutsByTemplate,
    deleteWorkout,
    updateWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    updateWorkoutExercise,
    fetchWorkoutExercises,
  }
}
