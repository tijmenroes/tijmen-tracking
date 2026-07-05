import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { ExerciseSet, TemplateExercise, TemplateExerciseProgress, TemplateExerciseProgressRow, TemplateSummary, WorkoutSummary, WorkoutTemplate } from '@/types/fitness'

const RECENT_LIMIT = 5

/**
 * Central store for workout templates. The summary list is user-specific and
 * cached after the first fetch, so navigating between screens (e.g. the workout
 * dashboard and "all templates") reuses it instead of refetching. Mutations that
 * change list membership or exercise counts invalidate the cache so the next
 * visit refetches.
 */
export const useTemplatesStore = defineStore('templates', () => {
  const authStore = useAuthStore()
  const templates = ref<TemplateSummary[]>([])
  const template = ref<WorkoutTemplate | null>(null)
  const templateExercises = ref<TemplateExercise[]>([])
  const listLoading = ref(false)
  const detailLoading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const recentTemplates = computed(() => templates.value.slice(0, RECENT_LIMIT))

  type SummaryRow = WorkoutTemplate & { template_exercises?: { count: number }[] }

  function toSummaries(rows: SummaryRow[]): TemplateSummary[] {
    return rows.map(({ template_exercises, ...rest }) => ({
      ...rest,
      exercise_count: template_exercises?.[0]?.count ?? 0,
    }))
  }

  async function fetchTemplates(force = false) {
    if (loaded.value && !force) return
    listLoading.value = true
    error.value = null
    const userId = authStore.user?.id
    if (!userId) { listLoading.value = false; return }

    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*, template_exercises(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    listLoading.value = false
    if (err) { error.value = err.message; return }
    templates.value = toSummaries((data ?? []) as SummaryRow[])
    loaded.value = true
  }

  function invalidate() {
    loaded.value = false
  }

  async function loadTemplate(id: number) {
    detailLoading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('id', id)
      .single()
    if (err) { error.value = err.message; detailLoading.value = false; return }
    template.value = data as WorkoutTemplate
    await fetchTemplateExercises()
    detailLoading.value = false
  }

  async function fetchTemplateExercises() {
    if (!template.value) return
    const { data, error: err } = await supabase
      .from('template_exercises')
      .select('*, exercise:exercises(*)')
      .eq('template_id', template.value.id)
      .order('sort_order')
    if (err) { error.value = err.message; return }
    templateExercises.value = (data ?? []) as TemplateExercise[]
  }

  async function createTemplate(name: string): Promise<WorkoutTemplate | null> {
    error.value = null
    const userId = authStore.user?.id
    if (!userId) { error.value = 'Not authenticated'; return null }

    const { data, error: err } = await supabase
      .from('workout_templates')
      .insert({ user_id: userId, name })
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    invalidate()
    return data as WorkoutTemplate
  }

  /** Copy the exercise list from an existing workout into a new template. */
  async function createTemplateFromWorkout(workoutId: number, name: string): Promise<WorkoutTemplate | null> {
    error.value = null
    const { data: wes, error: weErr } = await supabase
      .from('workout_exercises')
      .select('exercise_id, sort_order')
      .eq('workout_id', workoutId)
      .order('sort_order')
    if (weErr) { error.value = weErr.message; return null }
    if (!wes?.length) { error.value = 'Geen oefeningen om op te slaan als template'; return null }

    const created = await createTemplate(name)
    if (!created) return null

    const { error: linkErr } = await supabase.from('template_exercises').insert(
      wes.map((we) => ({
        template_id: created.id,
        exercise_id: we.exercise_id,
        sort_order: we.sort_order,
      })),
    )
    if (linkErr) { error.value = linkErr.message; return null }
    invalidate()
    return created
  }

  async function renameTemplate(id: number, name: string) {
    error.value = null
    const { data, error: err } = await supabase
      .from('workout_templates')
      .update({ name })
      .eq('id', id)
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    if (template.value?.id === id) template.value = data as WorkoutTemplate
    invalidate()
    return data as WorkoutTemplate
  }

  async function deleteTemplate(id: number) {
    const { error: err } = await supabase.from('workout_templates').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    if (template.value?.id === id) {
      template.value = null
      templateExercises.value = []
    }
    invalidate()
  }

  async function addExerciseToTemplate(templateId: number, exerciseId: number) {
    const sortOrder = templateExercises.value.length
    const { data, error: err } = await supabase
      .from('template_exercises')
      .insert({ template_id: templateId, exercise_id: exerciseId, sort_order: sortOrder })
      .select('*, exercise:exercises(*)')
      .single()
    if (err) { error.value = err.message; return null }
    templateExercises.value.push(data as TemplateExercise)
    invalidate()
    return data as TemplateExercise
  }

  async function removeExerciseFromTemplate(templateExerciseId: number) {
    const { error: err } = await supabase
      .from('template_exercises')
      .delete()
      .eq('id', templateExerciseId)
    if (err) { error.value = err.message; return }
    templateExercises.value = templateExercises.value.filter((te) => te.id !== templateExerciseId)
    invalidate()
  }

  async function reorderTemplateExercises(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const items = [...templateExercises.value]
    const [moved] = items.splice(fromIndex, 1)
    if (!moved) return
    items.splice(toIndex, 0, moved)

    const previous = templateExercises.value
    templateExercises.value = items.map((te, i) => ({ ...te, sort_order: i }))

    const results = await Promise.all(
      templateExercises.value.map((te, i) =>
        supabase.from('template_exercises').update({ sort_order: i }).eq('id', te.id).select('id'),
      ),
    )
    const err = results.find((r) => r.error)?.error
    const missing = results.some((r) => !r.error && !r.data?.length)
    if (err || missing) {
      error.value = err?.message ?? 'Volgorde opslaan mislukt'
      templateExercises.value = previous
    }
  }

  /**
   * Per template exercise: sets from the first and last workout started with this template.
   * Newest session rows appear before oldest.
   */
  async function fetchTemplateExerciseProgress(
    exercises: TemplateExercise[],
    workouts: WorkoutSummary[],
  ): Promise<TemplateExerciseProgress[]> {
    if (!exercises.length || !workouts.length) return []

    const sorted = [...workouts].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      return byDate !== 0 ? byDate : a.created_at.localeCompare(b.created_at)
    })
    const firstWorkout = sorted[0]!
    const lastWorkout = sorted[sorted.length - 1]!
    const sessionWorkouts =
      firstWorkout.id === lastWorkout.id ? [lastWorkout] : [lastWorkout, firstWorkout]

    const workoutIds = sessionWorkouts.map((w) => w.id)
    const exerciseIds = exercises.map((te) => te.exercise_id)

    const { data: weRows, error: weErr } = await supabase
      .from('workout_exercises')
      .select('id, exercise_id, workout_id')
      .in('workout_id', workoutIds)
      .in('exercise_id', exerciseIds)
    if (weErr) { error.value = weErr.message; return [] }

    const weIdByKey = new Map<string, number>()
    for (const we of weRows ?? []) {
      weIdByKey.set(`${we.workout_id}:${we.exercise_id}`, we.id)
    }

    const weIds = [...weIdByKey.values()]
    if (!weIds.length) {
      return exercises.map((te) => ({
        exercise_id: te.exercise_id,
        exercise_name: te.exercise?.name ?? 'Oefening',
        rows: [],
      }))
    }

    const { data: setsData, error: setsErr } = await supabase
      .from('exercise_sets')
      .select('*')
      .in('workout_exercise_id', weIds)
      .order('set_number')
    if (setsErr) { error.value = setsErr.message; return [] }

    const setsByWeId = new Map<number, ExerciseSet[]>()
    for (const s of (setsData ?? []) as ExerciseSet[]) {
      const list = setsByWeId.get(s.workout_exercise_id) ?? []
      list.push(s)
      setsByWeId.set(s.workout_exercise_id, list)
    }

    const dateByWorkoutId = new Map(workouts.map((w) => [w.id, w.date]))

    return exercises.map((te) => {
      const rows: TemplateExerciseProgressRow[] = []
      const type = te.exercise?.type ?? 'strength'

      for (const workout of sessionWorkouts) {
        const weId = weIdByKey.get(`${workout.id}:${te.exercise_id}`)
        if (!weId) continue
        const date = formatProgressDate(dateByWorkoutId.get(workout.id) ?? workout.date)
        for (const s of setsByWeId.get(weId) ?? []) {
          rows.push({
            date,
            set_number: s.set_number,
            metric: formatSetMetric(type, s),
          })
        }
      }

      return {
        exercise_id: te.exercise_id,
        exercise_name: te.exercise?.name ?? 'Oefening',
        rows,
      }
    })
  }

  function formatProgressDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${d}-${m}-${y}`
  }

  function formatSetMetric(type: 'strength' | 'endurance', s: ExerciseSet): string {
    if (type === 'endurance') {
      const time = s.duration_seconds != null ? `${s.duration_seconds}s` : '—'
      const km = s.distance_km ?? '—'
      return `${time} / ${km}km`
    }
    return `${s.weight_kg ?? '—'}-${s.reps ?? '—'}`
  }

  return {
    templates,
    recentTemplates,
    template,
    templateExercises,
    listLoading,
    detailLoading,
    error,
    loaded,
    fetchTemplates,
    invalidate,
    loadTemplate,
    fetchTemplateExercises,
    createTemplate,
    createTemplateFromWorkout,
    renameTemplate,
    deleteTemplate,
    addExerciseToTemplate,
    removeExerciseFromTemplate,
    reorderTemplateExercises,
    fetchTemplateExerciseProgress,
  }
})
