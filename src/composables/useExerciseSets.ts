import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ExerciseSet } from '@/types/fitness'

export function useExerciseSets() {
  const sets = ref<ExerciseSet[]>([])
  const previousSets = ref<ExerciseSet[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSets(workoutExerciseId: number) {
    const { data, error: err } = await supabase
      .from('exercise_sets')
      .select('*')
      .eq('workout_exercise_id', workoutExerciseId)
      .order('set_number')
    if (err) { error.value = err.message; return }
    sets.value = data ?? []
  }

  /**
   * Fetch sets from the most recent previous workout session that included this exercise.
   * Excludes the current workout (supports multiple sessions per day).
   */
  async function fetchPreviousSets(exerciseId: number, currentWorkoutId: number) {
    previousSets.value = []

    const { data: prevWe, error: weErr } = await supabase
      .from('workout_exercises')
      .select('id')
      .eq('exercise_id', exerciseId)
      .neq('workout_id', currentWorkoutId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (weErr) { error.value = weErr.message; return }
    if (!prevWe) return

    const { data, error: err } = await supabase
      .from('exercise_sets')
      .select('*')
      .eq('workout_exercise_id', prevWe.id)
      .order('set_number')
    if (err) { error.value = err.message; return }
    previousSets.value = data ?? []
  }

  async function addSet(
    workoutExerciseId: number,
    payload: {
      set_number: number
      weight_kg?: number | null
      reps?: number | null
      duration_seconds?: number | null
      distance_km?: number | null
    },
  ) {
    const { data, error: err } = await supabase
      .from('exercise_sets')
      .insert({ workout_exercise_id: workoutExerciseId, ...payload })
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    sets.value.push(data as ExerciseSet)
    return data as ExerciseSet
  }

  async function updateSet(id: number, payload: Partial<Pick<ExerciseSet, 'weight_kg' | 'reps' | 'duration_seconds' | 'distance_km'>>) {
    const { data, error: err } = await supabase
      .from('exercise_sets')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (err) { error.value = err.message; return }
    const idx = sets.value.findIndex(s => s.id === id)
    if (idx !== -1) sets.value[idx] = data as ExerciseSet
  }

  async function deleteSet(id: number) {
    const { error: err } = await supabase.from('exercise_sets').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    sets.value = sets.value.filter(s => s.id !== id)
    // Re-number remaining sets
    sets.value.forEach((s, i) => { s.set_number = i + 1 })
  }

  /** Replace current sets with a copy of the previous session's sets. */
  async function applyPreviousSets(workoutExerciseId: number, source: ExerciseSet[] = previousSets.value) {
    if (!source.length) return

    const currentIds = sets.value.map((s) => s.id)
    for (const id of currentIds) {
      const { error: err } = await supabase.from('exercise_sets').delete().eq('id', id)
      if (err) { error.value = err.message; return }
    }
    sets.value = []

    for (const prev of source) {
      const { data, error: err } = await supabase
        .from('exercise_sets')
        .insert({
          workout_exercise_id: workoutExerciseId,
          set_number: prev.set_number,
          weight_kg: prev.weight_kg,
          reps: prev.reps,
          duration_seconds: prev.duration_seconds,
          distance_km: prev.distance_km,
        })
        .select()
        .single()
      if (err) { error.value = err.message; return }
      sets.value.push(data as ExerciseSet)
    }
  }

  return {
    sets,
    previousSets,
    loading,
    error,
    fetchSets,
    fetchPreviousSets,
    addSet,
    updateSet,
    deleteSet,
    applyPreviousSets,
  }
}
