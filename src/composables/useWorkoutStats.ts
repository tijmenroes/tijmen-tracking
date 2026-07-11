import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useExercisesStore } from '@/stores/exercises'
import type { ExerciseSet, Workout } from '@/types/fitness'
import { epley1RM } from '@/utils/e1rm'
import { strengthVolume, workoutDurationMinutes } from '@/utils/volume'
import { isNewE1RMPr, e1rmDeltaPct } from '@/utils/prDetection'
import { celebrationTier, type CelebrationTier } from '@/utils/celebrationTier'
import { pickHeadline, workoutNumberSubtext } from '@/utils/celebrationCopy'

export interface ExerciseStat {
  workoutExerciseId: number
  exerciseId: number
  name: string
  type: 'strength' | 'endurance'
  setCount: number
  // strength
  bestE1RM: number | null
  bestWeight: number | null
  bestReps: number | null
  volume: number
  isPr: boolean
  deltaPct: number | null
  // endurance
  bestDistanceKm: number | null
  totalDurationSeconds: number | null
}

export interface WorkoutStats {
  workout: Workout
  durationMinutes: number | null
  exerciseCount: number
  totalVolume: number
  totalSets: number
  prCount: number
  workoutNumber: number
  tier: CelebrationTier
  headline: string
  subtext: string
  exercises: ExerciseStat[]
}

/** Best e1RM in a session plus the exact weight×reps behind it. */
function bestSet(sets: ExerciseSet[]): { e1rm: number; weight: number; reps: number } | null {
  let best: { e1rm: number; weight: number; reps: number } | null = null
  for (const s of sets) {
    const e = epley1RM(s.weight_kg, s.reps)
    if (e != null && (best == null || e > best.e1rm)) {
      best = { e1rm: e, weight: s.weight_kg!, reps: s.reps! }
    }
  }
  return best
}

type HistoryRow = {
  exercise_id: number
  workout: { id: number; created_at: string } | { id: number; created_at: string }[] | null
  exercise_sets: Pick<ExerciseSet, 'weight_kg' | 'reps'>[] | null
}

export function useWorkoutStats() {
  const authStore = useAuthStore()
  const exercisesStore = useExercisesStore()
  const stats = ref<WorkoutStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadStats(id: number): Promise<WorkoutStats | null> {
    loading.value = true
    error.value = null
    stats.value = null

    const userId = authStore.user?.id
    if (!userId) {
      error.value = 'Niet ingelogd'
      loading.value = false
      return null
    }

    await exercisesStore.fetchExercises()

    // 1. The workout itself.
    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single()
    if (wErr) {
      error.value = wErr.message
      loading.value = false
      return null
    }
    const w = workout as Workout

    // 2. Which number is this in the user's saved history?
    const { count, error: cErr } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'saved')
      .lte('created_at', w.created_at)
    if (cErr) {
      error.value = cErr.message
      loading.value = false
      return null
    }
    const workoutNumber = count ?? 1

    // 3. This workout's exercises + their sets.
    const { data: weRows, error: weErr } = await supabase
      .from('workout_exercises')
      .select('id, exercise_id, sort_order, exercise_sets(*)')
      .eq('workout_id', id)
      .order('sort_order')
    if (weErr) {
      error.value = weErr.message
      loading.value = false
      return null
    }
    const rows = (weRows ?? []) as Array<{
      id: number
      exercise_id: number
      sort_order: number
      exercise_sets: ExerciseSet[] | null
    }>

    const strengthIds = rows
      .filter((r) => exercisesStore.getById(r.exercise_id)?.type === 'strength')
      .map((r) => r.exercise_id)

    // 4. Prior sessions of the strength exercises, for PR + delta comparisons.
    const priorByExercise = new Map<number, Array<{ createdAt: string; e1rm: number }>>()
    if (strengthIds.length) {
      const { data: hist, error: hErr } = await supabase
        .from('workout_exercises')
        .select('exercise_id, workout:workouts!inner(id, created_at), exercise_sets(weight_kg, reps)')
        .in('exercise_id', strengthIds)
        .eq('workout.user_id', userId)
        .eq('workout.status', 'saved')
      if (hErr) {
        error.value = hErr.message
        loading.value = false
        return null
      }
      for (const row of (hist ?? []) as HistoryRow[]) {
        const wk = Array.isArray(row.workout) ? row.workout[0] : row.workout
        if (!wk) continue
        // Only sessions strictly before this one count as history.
        if (wk.id === w.id || wk.created_at >= w.created_at) continue
        const best = bestSet((row.exercise_sets ?? []) as ExerciseSet[])
        if (best == null) continue
        const list = priorByExercise.get(row.exercise_id) ?? []
        list.push({ createdAt: wk.created_at, e1rm: best.e1rm })
        priorByExercise.set(row.exercise_id, list)
      }
    }

    // 5. Build per-exercise stats.
    const exercises: ExerciseStat[] = rows.map((r) => {
      const meta = exercisesStore.getById(r.exercise_id)
      const type = meta?.type ?? 'strength'
      const sets = (r.exercise_sets ?? []) as ExerciseSet[]

      const best = bestSet(sets)
      const prior = priorByExercise.get(r.exercise_id) ?? []
      const priorBest = prior.length ? Math.max(...prior.map((p) => p.e1rm)) : null
      const previous = prior.reduce<{ createdAt: string; e1rm: number } | null>(
        (acc, p) => (acc == null || p.createdAt > acc.createdAt ? p : acc),
        null,
      )
      const currentE1RM = best?.e1rm ?? null

      const distances = sets.map((s) => s.distance_km).filter((d): d is number => d != null && d > 0)
      const durations = sets.map((s) => s.duration_seconds).filter((d): d is number => d != null && d > 0)

      return {
        workoutExerciseId: r.id,
        exerciseId: r.exercise_id,
        name: meta?.name ?? 'Oefening',
        type,
        setCount: sets.length,
        bestE1RM: currentE1RM,
        bestWeight: best?.weight ?? null,
        bestReps: best?.reps ?? null,
        volume: type === 'strength' ? strengthVolume(sets) : 0,
        isPr: type === 'strength' && isNewE1RMPr(currentE1RM, priorBest),
        deltaPct: type === 'strength' ? e1rmDeltaPct(currentE1RM, previous?.e1rm ?? null) : null,
        bestDistanceKm: distances.length ? Math.max(...distances) : null,
        totalDurationSeconds: durations.length ? durations.reduce((a, b) => a + b, 0) : null,
      }
    })

    const prCount = exercises.filter((e) => e.isPr).length
    const tier = celebrationTier({ prCount, workoutNumber })

    const result: WorkoutStats = {
      workout: w,
      durationMinutes: workoutDurationMinutes(w.created_at, w.saved_at),
      exerciseCount: exercises.length,
      totalVolume: exercises.reduce((sum, e) => sum + e.volume, 0),
      totalSets: exercises.reduce((sum, e) => sum + e.setCount, 0),
      prCount,
      workoutNumber,
      tier,
      headline: pickHeadline(tier, workoutNumber, w.id),
      subtext: workoutNumberSubtext(workoutNumber),
      exercises,
    }

    stats.value = result
    loading.value = false
    return result
  }

  return { stats, loading, error, loadStats }
}
