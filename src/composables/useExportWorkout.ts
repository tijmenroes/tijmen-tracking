import { supabase } from '@/lib/supabase'
import type { WorkoutExercise } from '@/types/fitness'
import type { Weight } from './useWeights'

interface ExportSet {
  set: number
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  distance_km: number | null
}

interface ExportSession {
  date: string
  pain_scale: number | null
  notes: string | null
  sets: ExportSet[]
}

interface ExportExercise {
  name: string
  type: string
  exercise_notes: string | null
  session_notes: string | null
  pain_scale: number | null
  sets: ExportSet[]
  history: ExportSession[]
}

interface ExportPayload {
  llm_prompt: string | null
  profile: {
    goals: string | null
    notes: string | null
    current_weight_kg: number | null
  }
  workout: {
    date: string
    exercises: ExportExercise[]
  }
}

export function useExportWorkout() {
  async function buildExport(
    workoutDate: string,
    workoutExercises: WorkoutExercise[],
    latestWeight: Weight | null,
    profileGoals: string | null,
    profileNotes: string | null,
    llmPrompt: string | null,
    historySessions: number = 5,
  ): Promise<ExportPayload> {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    const exercises: ExportExercise[] = []

    for (const we of workoutExercises) {
      // Current session sets
      const { data: currentSets } = await supabase
        .from('exercise_sets')
        .select('*')
        .eq('workout_exercise_id', we.id)
        .order('set_number')

      // History: last N sessions for this exercise (excluding current workout date)
      const { data: historyWe } = await supabase
        .from('workout_exercises')
        .select('id, notes, pain_scale, workout:workouts!inner(date, user_id)')
        .eq('exercise_id', we.exercise_id)
        .eq('workout.user_id', userId ?? '')
        .lt('workout.date', workoutDate)
        .order('workout(date)', { ascending: false })
        .limit(historySessions)

      const history: ExportSession[] = []
      for (const hw of historyWe ?? []) {
        const wk = hw.workout as unknown as { date: string }
        const { data: hSets } = await supabase
          .from('exercise_sets')
          .select('*')
          .eq('workout_exercise_id', hw.id)
          .order('set_number')
        if (hSets && hSets.length > 0) {
          history.push({
            date: wk.date,
            pain_scale: hw.pain_scale ?? null,
            notes: hw.notes ?? null,
            sets: hSets.map(s => ({
              set: s.set_number,
              weight_kg: s.weight_kg ?? null,
              reps: s.reps ?? null,
              duration_seconds: s.duration_seconds ?? null,
              distance_km: s.distance_km ?? null,
            })),
          })
        }
      }

      exercises.push({
        name: we.exercise?.name ?? '',
        type: we.exercise?.type ?? '',
        exercise_notes: we.exercise?.notes ?? null,
        session_notes: we.notes ?? null,
        pain_scale: we.pain_scale ?? null,
        sets: (currentSets ?? []).map(s => ({
          set: s.set_number,
          weight_kg: s.weight_kg ?? null,
          reps: s.reps ?? null,
          duration_seconds: s.duration_seconds ?? null,
          distance_km: s.distance_km ?? null,
        })),
        history,
      })
    }

    return {
      llm_prompt: llmPrompt,
      profile: {
        goals: profileGoals,
        notes: profileNotes,
        current_weight_kg: latestWeight?.weight ?? null,
      },
      workout: {
        date: workoutDate,
        exercises,
      },
    }
  }

  async function exportToClipboard(
    workoutDate: string,
    workoutExercises: WorkoutExercise[],
    latestWeight: Weight | null,
    profileGoals: string | null,
    profileNotes: string | null,
    llmPrompt: string | null,
    historySessions?: number,
  ): Promise<void> {
    const payload = await buildExport(
      workoutDate,
      workoutExercises,
      latestWeight,
      profileGoals,
      profileNotes,
      llmPrompt,
      historySessions,
    )
    const json = JSON.stringify(payload, null, 2)
    await navigator.clipboard.writeText(json)
  }

  return { exportToClipboard }
}
