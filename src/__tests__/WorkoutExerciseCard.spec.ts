import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import WorkoutExerciseCard from '@/components/WorkoutExerciseCard.vue'
import type { ExerciseSet, WorkoutExercise } from '@/types/fitness'

const mockDeleteEq = vi.fn<(col: string, val: number) => Promise<{ error: null }>>()
/** Single-row insert (the mount-time empty set). Resolved by the test. */
const mockInsertSingle = vi.fn()
/** Bulk insert (the previous-session prefill). */
const mockInsertSelect = vi.fn()
const calls: string[] = []
/** Rows as the database has them, so an update can answer with the full row. */
const rows = new Map<number, ExerciseSet>()
/** Set updates in call order, as [id, payload]. */
const updates: Array<[number, Record<string, unknown>]> = []

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
      update: vi.fn<(payload: Record<string, unknown>) => unknown>((payload) => ({
        eq: (_col: string, id: number) => ({
          select: () => ({
            single: () => {
              updates.push([id, payload])
              const row = { ...rows.get(id)!, ...payload }
              rows.set(id, row)
              return Promise.resolve({ data: row, error: null })
            },
          }),
        }),
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

/** A set that also exists in the mocked database. */
function row(partial: Partial<ExerciseSet>): ExerciseSet {
  const r = set(partial)
  rows.set(r.id, r)
  return r
}

function inputValues(wrapper: VueWrapper) {
  return wrapper.findAll('.we-card__input').map((i) => (i.element as HTMLInputElement).value)
}

/** Inputs per row are [kg, reps]; `index` counts across all rows. */
async function changeInput(wrapper: VueWrapper, index: number, value: string) {
  const input = wrapper.findAll('.we-card__input')[index]!
  ;(input.element as HTMLInputElement).value = value
  await input.trigger('change')
  await flushPromises()
}

describe('WorkoutExerciseCard first-set weight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updates.length = 0
    rows.clear()
  })

  async function mountWithSets(weights: number[], { carryFirstSetWeight = true } = {}) {
    const wrapper = mount(WorkoutExerciseCard, {
      props: {
        workoutExercise,
        initialSets: weights.map((weight_kg, i) =>
          row({ id: 11 + i, set_number: i + 1, weight_kg, reps: 10 }),
        ),
        previousSets: [],
        carryFirstSetWeight,
        onUpdateExtra: vi.fn<() => Promise<void>>(),
      },
    })
    await flushPromises()
    return wrapper
  }

  function weights(wrapper: VueWrapper) {
    return inputValues(wrapper).filter((_, i) => i % 2 === 0)
  }

  it('carries a new first-set weight over to the sets that had the same weight', async () => {
    const wrapper = await mountWithSets([50, 50, 50])

    await changeInput(wrapper, 0, '55')
    expect(updates).toEqual([
      [11, { weight_kg: 55 }],
      [12, { weight_kg: 55 }],
      [13, { weight_kg: 55 }],
    ])
    expect(inputValues(wrapper)).toEqual(['55', '10', '55', '10', '55', '10'])

    await changeInput(wrapper, 0, '57,5')
    expect(weights(wrapper)).toEqual(['57.5', '57.5', '57.5'])
  })

  it('leaves sets with a weight of their own alone', async () => {
    const pyramid = await mountWithSets([40, 45, 50])
    await changeInput(pyramid, 0, '42,5')
    expect(weights(pyramid)).toEqual(['42.5', '45', '50'])

    const dropSet = await mountWithSets([50, 50, 45])
    await changeInput(dropSet, 0, '55')
    expect(weights(dropSet)).toEqual(['55', '55', '45'])
  })

  it('only carries over from the first set', async () => {
    const wrapper = await mountWithSets([50, 50, 50])

    await changeInput(wrapper, 2, '55')

    expect(updates).toEqual([[12, { weight_kg: 55 }]])
    expect(weights(wrapper)).toEqual(['50', '55', '50'])
  })

  it('does not spread a cleared first-set weight', async () => {
    const wrapper = await mountWithSets([50, 50])

    await changeInput(wrapper, 0, '')

    expect(updates).toEqual([[11, { weight_kg: null }]])
    expect(weights(wrapper)).toEqual(['', '50'])
  })

  it('never rewrites the sets of a saved workout', async () => {
    const wrapper = await mountWithSets([50, 50, 50], { carryFirstSetWeight: false })

    await changeInput(wrapper, 0, '55')

    expect(updates).toEqual([[11, { weight_kg: 55 }]])
    expect(weights(wrapper)).toEqual(['55', '50', '50'])
  })
})
