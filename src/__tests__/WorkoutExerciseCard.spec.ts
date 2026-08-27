import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WorkoutExerciseCard from '@/components/WorkoutExerciseCard.vue'
import type { ExerciseSet, WorkoutExercise } from '@/types/fitness'

const mockDeleteEq = vi.fn<(col: string, val: number) => Promise<{ error: null }>>()
/** Single-row insert (the mount-time empty set). Resolved by the test. */
const mockInsertSingle = vi.fn()
/** Bulk insert (the previous-session prefill). */
const mockInsertSelect = vi.fn()
const calls: string[] = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn() })) })),
      delete: vi.fn(() => ({
        eq: (col: string, val: number) => {
          calls.push(`delete:${col}`)
          return mockDeleteEq(col, val)
        },
      })),
      insert: vi.fn((payload: unknown) => {
        calls.push(Array.isArray(payload) ? 'insert:bulk' : 'insert:single')
        return {
          select: vi.fn(() => ({
            single: mockInsertSingle,
            then: (...args: unknown[]) =>
              (mockInsertSelect(payload) as Promise<unknown>).then(...(args as [never, never])),
          })),
        }
      }),
    })),
  },
}))

const workoutExercise: WorkoutExercise = {
  id: 20,
  workout_id: 7,
  exercise_id: 3,
  sort_order: 0,
  notes: null,
  pain_scale: null,
  created_at: 'x',
  exercise: {
    id: 3,
    name: 'Close Grip Seated Row',
    type: 'strength',
    notes: null,
    created_by: null,
    created_at: 'x',
  },
}

function set(partial: Partial<ExerciseSet>): ExerciseSet {
  return {
    id: 1,
    workout_exercise_id: 20,
    set_number: 1,
    weight_kg: null,
    reps: null,
    duration_seconds: null,
    distance_km: null,
    created_at: 'x',
    ...partial,
  }
}

describe('WorkoutExerciseCard set prefill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  it('does not leave a phantom empty set when the previous-session reference arrives mid-insert', async () => {
    // The mount-time empty set is still being inserted when previousSets lands.
    let resolveEmptySet!: (v: { data: ExerciseSet; error: null }) => void
    mockInsertSingle.mockReturnValue(
      new Promise((resolve) => {
        resolveEmptySet = resolve
      }),
    )
    mockInsertSelect.mockResolvedValue({
      data: [
        set({ id: 11, set_number: 1, weight_kg: 80, reps: 10 }),
        set({ id: 12, set_number: 2, weight_kg: 80, reps: 8 }),
      ],
      error: null,
    })

    const wrapper = mount(WorkoutExerciseCard, {
      props: {
        workoutExercise,
        initialSets: [],
        previousSets: [],
        onUpdateExtra: vi.fn(),
      },
    })
    await flushPromises()
    expect(calls).toEqual(['insert:single'])

    // Previous session arrives while that insert is still in flight.
    await wrapper.setProps({
      previousSets: [
        set({ id: 90, workout_exercise_id: 55, set_number: 1, weight_kg: 80, reps: 10 }),
        set({ id: 91, workout_exercise_id: 55, set_number: 2, weight_kg: 80, reps: 8 }),
      ],
    })
    await flushPromises()
    // The prefill waits for the pending insert instead of racing it.
    expect(calls).toEqual(['insert:single'])

    resolveEmptySet({ data: set({ id: 10, set_number: 1 }), error: null })
    await flushPromises()

    // Cleared by parent id, so the just-inserted empty set goes with it.
    expect(calls).toEqual(['insert:single', 'delete:workout_exercise_id', 'insert:bulk'])
    expect(mockDeleteEq).toHaveBeenCalledWith('workout_exercise_id', 20)

    const rows = wrapper.findAll('.we-card__set-row')
    expect(rows).toHaveLength(2)
    const values = wrapper
      .findAll('.we-card__input')
      .map((i) => (i.element as HTMLInputElement).value)
    expect(values).toEqual(['80', '10', '80', '8'])
  })
})
