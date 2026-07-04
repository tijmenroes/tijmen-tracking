import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExercises } from '@/composables/useExercises'

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
      return {}
    }),
  },
}))

describe('useExercises', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchExercises populates exercises (with nested tags)', async () => {
    const mockData = [
      { id: 1, name: 'Squat', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [{ id: 3, name: 'legs', created_at: 'x' }] },
    ]
    mockExercisesOrder.mockResolvedValue({ data: mockData, error: null })

    const { exercises, fetchExercises } = useExercises()
    await fetchExercises()

    expect(exercises.value).toEqual(mockData)
    expect(exercises.value[0]?.tags?.[0]?.name).toBe('legs')
  })

  it('createExercise links tags and attaches resolved tag objects', async () => {
    const inserted = { id: 5, name: 'Deadlift', type: 'strength', notes: null, created_by: 'test-user-id', created_at: 'x' }
    const tagRows = [
      { id: 1, name: 'compound', created_at: 'x' },
      { id: 2, name: 'back', created_at: 'x' },
    ]
    mockExerciseInsertSingle.mockResolvedValue({ data: inserted, error: null })
    mockExerciseTagsInsert.mockResolvedValue({ error: null })
    mockTagsIn.mockResolvedValue({ data: tagRows, error: null })

    const { exercises, createExercise } = useExercises()
    const result = await createExercise('Deadlift', 'strength', [1, 2])

    expect(mockExerciseTagsInsert).toHaveBeenCalledWith([
      { exercise_id: 5, tag_id: 1 },
      { exercise_id: 5, tag_id: 2 },
    ])
    expect(result?.tags).toEqual(tagRows)
    expect(exercises.value[0]?.name).toBe('Deadlift')
  })

  it('createExercise skips the join insert when no tags are given', async () => {
    const inserted = { id: 6, name: 'Plank', type: 'strength', notes: null, created_by: 'test-user-id', created_at: 'x' }
    mockExerciseInsertSingle.mockResolvedValue({ data: inserted, error: null })

    const { createExercise } = useExercises()
    const result = await createExercise('Plank', 'strength', [])

    expect(mockExerciseTagsInsert).not.toHaveBeenCalled()
    expect(result?.tags).toEqual([])
  })

  it('updateExercise patches name/type and re-sorts the list', async () => {
    mockExercisesOrder.mockResolvedValue({
      data: [
        { id: 1, name: 'Zercher Squat', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [] },
        { id: 2, name: 'Bench', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [] },
      ],
      error: null,
    })
    const updated = { id: 1, name: 'Ab Wheel', type: 'strength', notes: null, created_by: null, created_at: 'x' }
    mockExerciseUpdateSingle.mockResolvedValue({ data: updated, error: null })

    const { exercises, fetchExercises, updateExercise } = useExercises()
    await fetchExercises()
    await updateExercise(1, { name: 'Ab Wheel' })

    expect(exercises.value.find((e) => e.id === 1)?.name).toBe('Ab Wheel')
    expect(exercises.value.map((e) => e.name)).toEqual(['Ab Wheel', 'Bench'])
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

    const { exercises, fetchExercises, updateExerciseTags } = useExercises()
    await fetchExercises()
    await updateExerciseTags(7, [4])

    expect(mockExerciseTagsDeleteEq).toHaveBeenCalledWith('exercise_id', 7)
    expect(exercises.value.find((e) => e.id === 7)?.tags).toEqual(newTags)
  })
})
