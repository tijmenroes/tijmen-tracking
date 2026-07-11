import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExercisesStore } from '@/stores/exercises'

const mockExercisesOrder = vi.fn()
const mockExerciseInsertSingle = vi.fn()
const mockExerciseUpdateSingle = vi.fn()
const mockExerciseTagsInsert = vi.fn()
const mockExerciseTagsDeleteEq = vi.fn()
const mockTagsIn = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: vi.fn((table: string) => {
      if (table === 'exercises') {
        return {
          select: vi.fn(() => ({ order: mockExercisesOrder })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockExerciseInsertSingle })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockExerciseUpdateSingle })) })) })),
        }
      }
      if (table === 'exercise_tags') {
        return {
          insert: mockExerciseTagsInsert,
          delete: vi.fn(() => ({ eq: mockExerciseTagsDeleteEq })),
        }
      }
      if (table === 'tags') {
        return {
          select: vi.fn(() => ({ in: mockTagsIn })),
        }
      }
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                { exercise_id: 1, workout_id: 10 },
                { exercise_id: 1, workout_id: 11 },
                { exercise_id: 2, workout_id: 10 },
              ],
              error: null,
            }),
          ),
        }
      }
      return {}
    }),
  },
}))

describe('exercises store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchExercises populates exercises (with nested tags) and caches', async () => {
    const mockData = [
      { id: 1, name: 'Squat', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [{ id: 3, name: 'legs', created_at: 'x' }] },
    ]
    mockExercisesOrder.mockResolvedValue({ data: mockData, error: null })

    const store = useExercisesStore()
    await store.fetchExercises()

    expect(store.exercises).toEqual(mockData)
    expect(store.exercises[0]?.tags?.[0]?.name).toBe('legs')
    expect(store.loaded).toBe(true)

    await store.fetchExercises()
    expect(mockExercisesOrder).toHaveBeenCalledTimes(1)

    await store.fetchExercises(true)
    expect(mockExercisesOrder).toHaveBeenCalledTimes(2)
  })

  it('fetchUsageCounts counts distinct workout sessions per exercise', async () => {
    const store = useExercisesStore()
    await store.fetchUsageCounts()
    expect(store.getUsageCount(1)).toBe(2)
    expect(store.getUsageCount(2)).toBe(1)
    expect(store.getUsageCount(99)).toBe(0)
  })

  it('fetchExercises dedupes concurrent calls', async () => {
    let resolveOrder!: (value: { data: unknown[]; error: null }) => void
    const orderPending = new Promise<{ data: unknown[]; error: null }>((resolve) => {
      resolveOrder = resolve
    })
    mockExercisesOrder.mockReturnValue(orderPending)

    const store = useExercisesStore()
    const first = store.fetchExercises()
    const second = store.fetchExercises()
    resolveOrder({ data: [], error: null })
    await Promise.all([first, second])

    expect(mockExercisesOrder).toHaveBeenCalledTimes(1)
  })

  it('createExercise links tags and attaches resolved tag objects', async () => {
    const inserted = { id: 5, name: 'Deadlift', type: 'strength', notes: null, aliases: ['DL'], created_by: 'test-user-id', created_at: 'x' }
    const tagRows = [
      { id: 1, name: 'compound', created_at: 'x' },
      { id: 2, name: 'back', created_at: 'x' },
    ]
    mockExerciseInsertSingle.mockResolvedValue({ data: inserted, error: null })
    mockExerciseTagsInsert.mockResolvedValue({ error: null })
    mockTagsIn.mockResolvedValue({ data: tagRows, error: null })

    const store = useExercisesStore()
    const result = await store.createExercise('Deadlift', 'strength', [1, 2], ['DL'])

    expect(mockExerciseTagsInsert).toHaveBeenCalledWith([
      { exercise_id: 5, tag_id: 1 },
      { exercise_id: 5, tag_id: 2 },
    ])
    expect(result?.tags).toEqual(tagRows)
    expect(result?.aliases).toEqual(['DL'])
    expect(store.exercises[0]?.name).toBe('Deadlift')
  })

  it('createExercise skips the join insert when no tags are given', async () => {
    const inserted = { id: 6, name: 'Plank', type: 'strength', notes: null, created_by: 'test-user-id', created_at: 'x' }
    mockExerciseInsertSingle.mockResolvedValue({ data: inserted, error: null })

    const store = useExercisesStore()
    const result = await store.createExercise('Plank', 'strength', [])

    expect(mockExerciseTagsInsert).not.toHaveBeenCalled()
    expect(result?.tags).toEqual([])
  })

  it('updateExercise patches name/type/aliases and re-sorts the list', async () => {
    mockExercisesOrder.mockResolvedValue({
      data: [
        { id: 1, name: 'Zercher Squat', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [] },
        { id: 2, name: 'Bench', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [] },
      ],
      error: null,
    })
    const updated = { id: 1, name: 'Ab Wheel', type: 'strength', notes: null, aliases: ['AW'], created_by: null, created_at: 'x' }
    mockExerciseUpdateSingle.mockResolvedValue({ data: updated, error: null })

    const store = useExercisesStore()
    await store.fetchExercises()
    await store.updateExercise(1, { name: 'Ab Wheel', aliases: ['AW'] })

    expect(store.exercises.find((e) => e.id === 1)?.name).toBe('Ab Wheel')
    expect(store.exercises.find((e) => e.id === 1)?.aliases).toEqual(['AW'])
    expect(store.exercises.map((e) => e.name)).toEqual(['Ab Wheel', 'Bench'])
  })

  it('getById returns a cached exercise by id', async () => {
    mockExercisesOrder.mockResolvedValue({
      data: [{ id: 9, name: 'Pull-up', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [] }],
      error: null,
    })

    const store = useExercisesStore()
    await store.fetchExercises()

    expect(store.getById(9)?.name).toBe('Pull-up')
    expect(store.getById(999)).toBeUndefined()
  })

  it('updateExerciseTags replaces the exercise tag set', async () => {
    mockExercisesOrder.mockResolvedValue({
      data: [{ id: 7, name: 'Row', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [] }],
      error: null,
    })
    mockExerciseTagsDeleteEq.mockResolvedValue({ error: null })
    mockExerciseTagsInsert.mockResolvedValue({ error: null })
    const newTags = [{ id: 4, name: 'lats', created_at: 'x' }]
    mockTagsIn.mockResolvedValue({ data: newTags, error: null })

    const store = useExercisesStore()
    await store.fetchExercises()
    await store.updateExerciseTags(7, [4])

    expect(mockExerciseTagsDeleteEq).toHaveBeenCalledWith('exercise_id', 7)
    expect(store.exercises.find((e) => e.id === 7)?.tags).toEqual(newTags)
  })
})
