import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { TemplateExercise, TemplateSummary, WorkoutTemplate } from '@/types/fitness'

export function useWorkoutTemplates() {
  const templates = ref<TemplateSummary[]>([])
  const recentTemplates = ref<TemplateSummary[]>([])
  const template = ref<WorkoutTemplate | null>(null)
  const templateExercises = ref<TemplateExercise[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  type SummaryRow = WorkoutTemplate & { template_exercises?: { count: number }[] }

  function toSummaries(rows: SummaryRow[]): TemplateSummary[] {
    return rows.map(({ template_exercises, ...rest }) => ({
      ...rest,
      exercise_count: template_exercises?.[0]?.count ?? 0,
    }))
  }

  async function fetchTemplates() {
    loading.value = true
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { loading.value = false; return }

    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*, template_exercises(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    loading.value = false
    if (err) { error.value = err.message; return }
    templates.value = toSummaries((data ?? []) as SummaryRow[])
  }

  async function fetchRecentTemplates(limit = 5) {
    loading.value = true
    error.value = null
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { loading.value = false; return }

    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*, template_exercises(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    loading.value = false
    if (err) { error.value = err.message; return }
    recentTemplates.value = toSummaries((data ?? []) as SummaryRow[])
  }

  async function loadTemplate(id: number) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('id', id)
      .single()
    if (err) { error.value = err.message; loading.value = false; return }
    template.value = data as WorkoutTemplate
    await fetchTemplateExercises()
    loading.value = false
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
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { error.value = 'Not authenticated'; return null }

    const { data, error: err } = await supabase
      .from('workout_templates')
      .insert({ user_id: user.id, name })
      .select()
      .single()
    if (err) { error.value = err.message; return null }
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
    return data as WorkoutTemplate
  }

  async function deleteTemplate(id: number) {
    const { error: err } = await supabase.from('workout_templates').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    if (template.value?.id === id) {
      template.value = null
      templateExercises.value = []
    }
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
    return data as TemplateExercise
  }

  async function removeExerciseFromTemplate(templateExerciseId: number) {
    const { error: err } = await supabase
      .from('template_exercises')
      .delete()
      .eq('id', templateExerciseId)
    if (err) { error.value = err.message; return }
    templateExercises.value = templateExercises.value.filter((te) => te.id !== templateExerciseId)
  }

  return {
    templates,
    recentTemplates,
    template,
    templateExercises,
    loading,
    error,
    fetchTemplates,
    fetchRecentTemplates,
    loadTemplate,
    fetchTemplateExercises,
    createTemplate,
    createTemplateFromWorkout,
    renameTemplate,
    deleteTemplate,
    addExerciseToTemplate,
    removeExerciseFromTemplate,
  }
}
