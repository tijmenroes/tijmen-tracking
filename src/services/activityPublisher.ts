import { supabase } from '@/lib/supabase'
import { useWorkoutStats } from '@/composables/useWorkoutStats'

/**
 * Publish a completed workout without making feed availability part of the
 * critical save path. The database function owns identity, board membership,
 * display-name resolution and idempotency.
 */
export async function publishWorkoutCompletion(workoutId: number): Promise<void> {
  try {
    const { loadStats } = useWorkoutStats()
    const stats = await loadStats(workoutId)
    await supabase.rpc('publish_workout_activity', {
      p_workout_id: workoutId,
      p_pr_count: stats?.prCount ?? 0,
    })
  } catch {
    // A workout is still safely saved when the optional board post fails.
  }
}
