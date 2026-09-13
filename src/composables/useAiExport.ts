import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useProfileStore } from '@/stores/profile'
import {
  buildAiExport,
  type AiExportPayload,
  type RawWeightRow,
  type RawWorkoutRow,
} from '@/utils/aiExport'

/**
 * Bulk export of a date range for the "Exporteer voor AI" screen.
 *
 * Two round-trips: one nested select for the workouts (RLS scopes both to the
 * current user, so no user_id filter is needed here) and one for the body
 * weight log. Shaping happens in `@/utils/aiExport`.
 */
export function useAiExport() {
  const profileStore = useProfileStore()
  const payload = ref<AiExportPayload | null>(null)
  const generating = ref(false)
  const error = ref<string | null>(null)

  async function generate(from: string, to: string, userNotes: string | null) {
    generating.value = true
    error.value = null
    payload.value = null

    try {
      await profileStore.load()

      const [workoutsResult, weightsResult] = await Promise.all([
        supabase
          .from('workouts')
          .select(
            `date, name, notes,
             template:workout_templates(name),
             workout_exercises(
               sort_order, notes, pain_scale,
               exercise:exercises(name, type, notes, tags(name)),
               exercise_sets(set_number, weight_kg, reps, duration_seconds, distance_km)
             )`,
          )
          .eq('status', 'saved')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: true }),
        supabase
          .from('Weight')
          .select('date, weight')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: true }),
      ])

      if (workoutsResult.error) {
        error.value = workoutsResult.error.message
        return null
      }
      if (weightsResult.error) {
        error.value = weightsResult.error.message
        return null
      }

      payload.value = buildAiExport({
        from,
        to,
        workouts: (workoutsResult.data ?? []) as unknown as RawWorkoutRow[],
        weights: (weightsResult.data ?? []) as RawWeightRow[],
        profile: {
          goals: profileStore.goals,
          notes: profileStore.notes,
          llm_prompt: profileStore.llmPrompt,
        },
        userNotes,
      })
      return payload.value
    } finally {
      generating.value = false
    }
  }

  return { payload, generating, error, generate }
}

export function exportFilename(from: string, to: string): string {
  return `fitness-export_${from}_${to}.json`
}

/**
 * The Clipboard API needs a secure context; on plain http it rejects (or is
 * missing entirely), so the caller gets a false and can show a fallback.
 */
export async function copyJson(json: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(json)
    return true
  } catch {
    return false
  }
}

export function downloadJson(json: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
