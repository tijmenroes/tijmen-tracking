import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth'
import { useWorkoutStats } from '@/composables/useWorkoutStats'

const EXERCISES = [
  { id: 1, name: 'Bench press', type: 'strength', notes: null, created_by: null, created_at: 'x' },
  { id: 2, name: 'Squat', type: 'strength', notes: null, created_by: null, created_at: 'x' },
]

const WORKOUT = {
  id: 99,
  user_id: 'u',
  date: '2026-07-11',
  name: 'Push',
  notes: null,
  template_id: null,
  status: 'saved',
  created_at: '2026-07-11T10:00:00Z',
  saved_at: '2026-07-11T10:45:00Z',
}

// Bench 100×5 (e1RM 116.7) + 90×8; Squat 80×5 (e1RM 93.3)
const WE_ROWS = [
  {
    id: 501,
    exercise_id: 1,
    sort_order: 0,
    exercise_sets: [
      { id: 1, weight_kg: 100, reps: 5, duration_seconds: null, distance_km: null },
      { id: 2, weight_kg: 90, reps: 8, duration_seconds: null, distance_km: null },
    ],
  },
  {
    id: 502,
    exercise_id: 2,
    sort_order: 1,
    exercise_sets: [{ id: 3, weight_kg: 80, reps: 5, duration_seconds: null, distance_km: null }],
  },
]

// Prior sessions: Bench peaks at 95×5 (110.8) → current is a PR; Squat 85×5 (99.2) → current is weaker.
// The current workout (id 99) is included to confirm it's filtered out of history.
const HISTORY_ROWS = [
  { exercise_id: 1, workout: { id: 40, created_at: '2026-07-01T10:00:00Z' }, exercise_sets: [{ weight_kg: 100, reps: 3 }] },
  { exercise_id: 1, workout: { id: 50, created_at: '2026-07-05T10:00:00Z' }, exercise_sets: [{ weight_kg: 95, reps: 5 }] },
  { exercise_id: 2, workout: { id: 50, created_at: '2026-07-05T10:00:00Z' }, exercise_sets: [{ weight_kg: 85, reps: 5 }] },
  { exercise_id: 1, workout: { id: 99, created_at: '2026-07-11T10:00:00Z' }, exercise_sets: [{ weight_kg: 100, reps: 5 }] },
]

function makeBuilder(resolve: (phase: string, chain: string[]) => unknown) {
  const chain: string[] = []
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'lte', 'in', 'order']) {
    builder[m] = vi.fn<() => unknown>(() => {
      chain.push(m)
      return builder
    })
  }
  builder.single = vi.fn<() => Promise<unknown>>(() => {
    chain.push('single')
    return Promise.resolve(resolve('single', chain))
  })
  // Thenable so `await`-ing a query chain resolves to the mocked result.
  // eslint-disable-next-line unicorn/no-thenable
  builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(resolve('await', chain)).then(onF, onR)
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn<() => Promise<unknown>>(() => Promise.resolve({ data: { user: { id: 'u' } } })) },
    from: vi.fn<(table: string) => unknown>((table: string) =>
      makeBuilder((phase, chain) => {
        if (table === 'exercises') return { data: EXERCISES, error: null }
        if (table === 'workouts') {
          if (phase === 'single') return { data: WORKOUT, error: null }
          return { count: 7, error: null } // workout number query
        }
        if (table === 'workout_exercises') {
          return chain.includes('in')
            ? { data: HISTORY_ROWS, error: null }
            : { data: WE_ROWS, error: null }
        }
        return { data: [], error: null }
      }),
    ),
  },
}))

describe('useWorkoutStats', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().session = { user: { id: 'u' } } as Session
    vi.clearAllMocks()
  })

  it('computes volume, workout number, PRs, deltas and tier', async () => {
    const { loadStats } = useWorkoutStats()
    const result = await loadStats(99)

    expect(result).not.toBeNull()
    expect(result!.workoutNumber).toBe(7)
    expect(result!.exerciseCount).toBe(2)
    expect(result!.totalSets).toBe(3)
    // Bench 100×5 + 90×8 = 1220, Squat 80×5 = 400
    expect(result!.totalVolume).toBe(1620)
    expect(result!.durationMinutes).toBe(45)

    const bench = result!.exercises.find((e) => e.exerciseId === 1)!
    const squat = result!.exercises.find((e) => e.exerciseId === 2)!

    expect(bench.isPr).toBe(true)
    expect(bench.deltaPct!).toBeGreaterThan(0)
    expect(squat.isPr).toBe(false)
    expect(squat.deltaPct!).toBeLessThan(0)

    // One PR, workout #7 (not a milestone) → 'pr' tier
    expect(result!.prCount).toBe(1)
    expect(result!.tier).toBe('pr')
  })
})
