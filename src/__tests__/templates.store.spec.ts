import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTemplatesStore } from '@/stores/templates'

const mockTemplateInsertSingle = vi.fn()
const mockTemplateSelectSingle = vi.fn()
const mockTemplateUpdateSingle = vi.fn()
const mockTemplateDeleteEq = vi.fn()
const mockTemplateListOrder = vi.fn()
const mockTeOrder = vi.fn()
const mockTeInsertSingle = vi.fn()
const mockTeDeleteEq = vi.fn()
const mockTeUpdateEq = vi.fn()
const mockWeOrder = vi.fn()
const mockWeInIn = vi.fn()
const mockSetsInOrder = vi.fn()
const mockTeBulkInsert = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: vi.fn((table: string) => {
      if (table === 'workout_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockTemplateSelectSingle,
              order: mockTemplateListOrder,
            })),
          })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockTemplateInsertSingle })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockTemplateUpdateSingle })) })) })),
          delete: vi.fn(() => ({ eq: mockTemplateDeleteEq })),
        }
      }
      if (table === 'template_exercises') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockTeOrder })) })),
          insert: vi.fn((rows: unknown) => {
            if (Array.isArray(rows)) return mockTeBulkInsert()
            return { select: vi.fn(() => ({ single: mockTeInsertSingle })) }
          }),
          delete: vi.fn(() => ({ eq: mockTeDeleteEq })),
          update: vi.fn(() => ({ eq: mockTeUpdateEq })),
        }
      }
      if (table === 'workout_exercises') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: mockWeOrder })),
            in: vi.fn(() => ({ in: mockWeInIn })),
          })),
        }
      }
      if (table === 'exercise_sets') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({ order: mockSetsInOrder })),
          })),
        }
      }
      return {}
    }),
  },
}))

describe('templates store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchTemplates caches the list and skips a second fetch', async () => {
    mockTemplateListOrder.mockResolvedValue({
      data: [
        { id: 1, user_id: 'test-user-id', name: 'Push A', created_at: 'x', template_exercises: [{ count: 3 }] },
      ],
      error: null,
    })

    const store = useTemplatesStore()
    await store.fetchTemplates()

    expect(store.templates).toEqual([
      { id: 1, user_id: 'test-user-id', name: 'Push A', created_at: 'x', exercise_count: 3 },
    ])
    expect(store.loaded).toBe(true)
    expect(mockTemplateListOrder).toHaveBeenCalledTimes(1)

    await store.fetchTemplates()
    expect(mockTemplateListOrder).toHaveBeenCalledTimes(1)

    await store.fetchTemplates(true)
    expect(mockTemplateListOrder).toHaveBeenCalledTimes(2)
  })

  it('recentTemplates exposes the first five templates', async () => {
    mockTemplateListOrder.mockResolvedValue({
      data: Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        user_id: 'test-user-id',
        name: `T${i + 1}`,
        created_at: 'x',
        template_exercises: [{ count: 0 }],
      })),
      error: null,
    })

    const store = useTemplatesStore()
    await store.fetchTemplates()

    expect(store.recentTemplates).toHaveLength(5)
    expect(store.recentTemplates.map((t) => t.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('createTemplate inserts a template row and invalidates the cache', async () => {
    const created = { id: 1, user_id: 'test-user-id', name: 'Push A', created_at: 'x' }
    mockTemplateInsertSingle.mockResolvedValue({ data: created, error: null })

    const store = useTemplatesStore()
    store.loaded = true
    const result = await store.createTemplate('Push A')

    expect(result).toEqual(created)
    expect(store.loaded).toBe(false)
  })

  it('createTemplateFromWorkout copies workout exercises', async () => {
    mockWeOrder.mockResolvedValue({
      data: [
        { exercise_id: 3, sort_order: 0 },
        { exercise_id: 5, sort_order: 1 },
      ],
      error: null,
    })
    mockTemplateInsertSingle.mockResolvedValue({
      data: { id: 9, user_id: 'test-user-id', name: 'Push A', created_at: 'x' },
      error: null,
    })
    mockTeBulkInsert.mockResolvedValue({ error: null })

    const store = useTemplatesStore()
    const result = await store.createTemplateFromWorkout(7, 'Push A')

    expect(result?.id).toBe(9)
    expect(mockTeBulkInsert).toHaveBeenCalled()
  })

  it('reorderTemplateExercises updates sort_order and local state', async () => {
    mockTeUpdateEq.mockResolvedValue({ error: null })

    const store = useTemplatesStore()
    store.templateExercises = [
      { id: 1, template_id: 9, exercise_id: 3, sort_order: 0, created_at: 'x', exercise: { id: 3, name: 'Squat', type: 'strength', notes: null, created_by: null, created_at: 'x' } },
      { id: 2, template_id: 9, exercise_id: 5, sort_order: 1, created_at: 'x', exercise: { id: 5, name: 'Bench', type: 'strength', notes: null, created_by: null, created_at: 'x' } },
      { id: 3, template_id: 9, exercise_id: 7, sort_order: 2, created_at: 'x', exercise: { id: 7, name: 'Row', type: 'strength', notes: null, created_by: null, created_at: 'x' } },
    ]

    await store.reorderTemplateExercises(0, 2)

    expect(store.templateExercises.map((te) => te.id)).toEqual([2, 3, 1])
    expect(store.templateExercises.map((te) => te.sort_order)).toEqual([0, 1, 2])
    expect(mockTeUpdateEq).toHaveBeenCalledTimes(3)
  })

  it('loadTemplate fetches template and exercises', async () => {
    const tpl = { id: 9, user_id: 'test-user-id', name: 'Push A', created_at: 'x' }
    const tes = [{ id: 1, template_id: 9, exercise_id: 3, sort_order: 0, created_at: 'x', exercise: { id: 3, name: 'Squat' } }]
    mockTemplateSelectSingle.mockResolvedValue({ data: tpl, error: null })
    mockTeOrder.mockResolvedValue({ data: tes, error: null })

    const store = useTemplatesStore()
    await store.loadTemplate(9)

    expect(store.template).toEqual(tpl)
    expect(store.templateExercises).toEqual(tes)
  })

  it('fetchTemplateExerciseProgress returns first and last session sets per exercise', async () => {
    const exercises = [
      {
        id: 1,
        template_id: 9,
        exercise_id: 3,
        sort_order: 0,
        created_at: 'x',
        exercise: { id: 3, name: 'Back extension', type: 'strength' as const, notes: null, created_by: null, created_at: 'x' },
      },
    ]
    const workouts = [
      { id: 10, user_id: 'u', date: '2026-06-01', name: null, notes: null, template_id: 9, status: 'saved' as const, created_at: 'a', exercise_count: 1 },
      { id: 11, user_id: 'u', date: '2026-06-05', name: null, notes: null, template_id: 9, status: 'saved' as const, created_at: 'b', exercise_count: 1 },
    ]

    mockWeInIn.mockResolvedValue({
      data: [
        { id: 100, exercise_id: 3, workout_id: 10 },
        { id: 101, exercise_id: 3, workout_id: 11 },
      ],
      error: null,
    })
    mockSetsInOrder.mockResolvedValue({
      data: [
        { id: 1, workout_exercise_id: 101, set_number: 1, weight_kg: 20, reps: 8, duration_seconds: null, distance_km: null, created_at: 'x' },
        { id: 2, workout_exercise_id: 101, set_number: 2, weight_kg: 20, reps: 5, duration_seconds: null, distance_km: null, created_at: 'x' },
        { id: 3, workout_exercise_id: 100, set_number: 1, weight_kg: 15, reps: 8, duration_seconds: null, distance_km: null, created_at: 'x' },
        { id: 4, workout_exercise_id: 100, set_number: 2, weight_kg: 15, reps: 7, duration_seconds: null, distance_km: null, created_at: 'x' },
      ],
      error: null,
    })

    const store = useTemplatesStore()
    const progress = await store.fetchTemplateExerciseProgress(exercises, workouts)

    expect(progress).toHaveLength(1)
    expect(progress[0]?.rows).toEqual([
      { date: '5-6-2026', set_number: 1, metric: '20-8' },
      { date: '5-6-2026', set_number: 2, metric: '20-5' },
      { date: '1-6-2026', set_number: 1, metric: '15-8' },
      { date: '1-6-2026', set_number: 2, metric: '15-7' },
    ])
  })
})
