import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useExercisesStore } from '@/stores/exercises'
import type { ExerciseSet, Workout, WorkoutExercise, WorkoutSummary } from '@/types/fitness'

const activeWorkout = ref<WorkoutSummary | null>(null)
const activeWorkoutLoaded = ref(false)
let activeWorkoutInflight: Promise<WorkoutSummary | null> | null = null

export function resetActiveWorkoutCache() {
  activeWorkout.value = null
  activeWorkoutLoaded.value = false
  activeWorkoutInflight = null
}

export function useWorkouts() {
  const authStore = useAuthStore()
  const exercisesStore = useExercisesStore()
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

  /** A set counts as "empty" when none of its metric fields were filled in. */
  function isEmptySet(s: Pick<ExerciseSet, 'weight_kg' | 'reps' | 'duration_seconds' | 'distance_km'>): boolean {
    return (
      s.weight_kg == null &&
      s.reps == null &&
      s.duration_seconds == null &&
      s.distance_km == null
    )
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
    const userId = authStore.user?.id
    if (!userId) { error.value = 'Not authenticated'; return null }

    const insertPayload: {
      user_id: string
      date: string
      name: string | null
      template_id?: number
    } = {
      user_id: userId,
      date: todayIso(),
      name: opts.name ?? null,
    }
    if (opts.templateId) insertPayload.template_id = opts.templateId

    const { data: created, error: err } = await supabase
      .from('workouts')
      .insert(insertPayload)
      .select()
      .single()
    if (err) {
      // Unique index one_active_workout_per_user → a draft is still open.
      error.value = err.code === '23505'
        ? 'Je hebt nog een actieve workout. Sla die eerst op of verwijder hem.'
        : err.message
      return null
    }
    workout.value = created
    workoutExercises.value = []
    activeWorkout.value = {
      ...(created as Workout),
      exercise_count: 0,
    }
    activeWorkoutLoaded.value = true

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
        activeWorkout.value = {
          ...(created as Workout),
          exercise_count: templateRows.length,
        }
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
    const userId = authStore.user?.id
    if (!userId) { loading.value = false; return }

    // !inner → only workouts that have at least one exercise
    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, workout_exercises!inner(count)')
      .eq('user_id', userId)
      .eq('status', 'saved')
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
    const userId = authStore.user?.id
    if (!userId) { loading.value = false; return }

    const { data, count, error: err } = await supabase
      .from('workouts')
      .select('*, workout_exercises!inner(count)', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'saved')
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
    const userId = authStore.user?.id
    if (!userId) { loading.value = false; return }

    const { data, error: err } = await supabase
      .from('workouts')
      .select('*, workout_exercises!inner(count)')
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .eq('status', 'saved')
      .order('created_at', { ascending: false })
    loading.value = false
    if (err) { error.value = err.message; return }
    templateWorkouts.value = toSummaries((data ?? []) as SummaryRow[])
  }

  /**
   * Fetch the user's current active (draft) workout, if any.
   * There can be at most one at a time (enforced by a unique index).
   */
  async function fetchActiveWorkout(force = false): Promise<WorkoutSummary | null> {
    if (activeWorkoutLoaded.value && !force) return activeWorkout.value
    if (activeWorkoutInflight) return activeWorkoutInflight

    activeWorkoutInflight = (async () => {
      error.value = null
      const userId = authStore.user?.id
      if (!userId) return null

      const { data, error: err } = await supabase
        .from('workouts')
        .select('*, workout_exercises(count)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (err) { error.value = err.message; return null }
      if (!data) {
        activeWorkout.value = null
        activeWorkoutLoaded.value = true
        return null
      }

      const { workout_exercises, ...rest } = data as SummaryRow
      activeWorkout.value = { ...rest, exercise_count: workout_exercises?.[0]?.count ?? 0 }
      activeWorkoutLoaded.value = true
      return activeWorkout.value
    })()

    try {
      return await activeWorkoutInflight
    } finally {
      activeWorkoutInflight = null
    }
  }

  /**
   * Finish a draft workout: strip empty sets, drop exercises that ended up
   * with no logged data, and mark the workout as saved so it enters history.
   * When nothing at all was logged the workout is deleted instead.
   * Returns { deleted } so the caller can route accordingly, or null on error.
   */
  async function saveWorkout(id: number): Promise<{ deleted: boolean } | null> {
    error.value = null

    const { data: wes, error: weErr } = await supabase
      .from('workout_exercises')
      .select('id, notes, pain_scale, exercise_sets(*)')
      .eq('workout_id', id)
    if (weErr) { error.value = weErr.message; return null }

    for (const we of wes ?? []) {
      const setsList = (we.exercise_sets ?? []) as ExerciseSet[]
      const emptyIds = setsList.filter(isEmptySet).map((s) => s.id)
      if (emptyIds.length) {
        const { error: delErr } = await supabase
          .from('exercise_sets')
          .delete()
          .in('id', emptyIds)
        if (delErr) { error.value = delErr.message; return null }
      }

      const remainingSets = setsList.length - emptyIds.length
      const hasNotes = typeof we.notes === 'string' && we.notes.trim().length > 0
      const hasData = remainingSets > 0 || hasNotes || we.pain_scale != null
      if (!hasData) {
        const { error: weDelErr } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('id', we.id)
        if (weDelErr) { error.value = weDelErr.message; return null }
      }
    }

    const { count, error: cntErr } = await supabase
      .from('workout_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('workout_id', id)
    if (cntErr) { error.value = cntErr.message; return null }

    if (!count) {
      const { error: delWErr } = await supabase.from('workouts').delete().eq('id', id)
      if (delWErr) { error.value = delWErr.message; return null }
      if (workout.value?.id === id) { workout.value = null; workoutExercises.value = [] }
      if (activeWorkout.value?.id === id) activeWorkout.value = null
      return { deleted: true }
    }

    const { data, error: updErr } = await supabase
      .from('workouts')
      .update({ status: 'saved', saved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (updErr) { error.value = updErr.message; return null }
    if (workout.value?.id === id) workout.value = data as Workout
    if (activeWorkout.value?.id === id) activeWorkout.value = null
    return { deleted: false }
  }

  async function deleteWorkout(id: number) {
    const { error: err } = await supabase.from('workouts').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    if (workout.value?.id === id) {
      workout.value = null
      workoutExercises.value = []
    }
    if (activeWorkout.value?.id === id) activeWorkout.value = null
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

  function attachExercise(row: Omit<WorkoutExercise, 'exercise'>): WorkoutExercise {
    return {
      ...row,
      exercise: exercisesStore.getById(row.exercise_id),
    }
  }

  async function fetchWorkoutExercises() {
    if (!workout.value) return
    await exercisesStore.fetchExercises()
    const { data, error: err } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workout.value.id)
      .order('sort_order')
    if (err) { error.value = err.message; return }
    workoutExercises.value = (data ?? []).map(attachExercise)
  }

  async function addExerciseToWorkout(exerciseId: number) {
    if (!workout.value) return null
    await exercisesStore.fetchExercises()
    const sortOrder = workoutExercises.value.length
    const { data, error: err } = await supabase
      .from('workout_exercises')
      .insert({ workout_id: workout.value.id, exercise_id: exerciseId, sort_order: sortOrder })
      .select('*')
      .single()
    if (err) { error.value = err.message; return null }
    const row = attachExercise(data)
    workoutExercises.value.push(row)
    return row
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
    activeWorkout,
    activeWorkoutLoaded,
    templateWorkouts,
    loading,
    error,
    startWorkout,
    loadWorkout,
    fetchRecentWorkouts,
    fetchWorkoutsPage,
    fetchWorkoutsByTemplate,
    fetchActiveWorkout,
    saveWorkout,
    deleteWorkout,
    updateWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    updateWorkoutExercise,
    fetchWorkoutExercises,
  }
}
