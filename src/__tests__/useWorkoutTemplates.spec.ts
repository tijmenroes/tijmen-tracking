import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkoutTemplates } from '@/composables/useWorkoutTemplates'

const mockTemplateInsertSingle = vi.fn()
const mockTemplateSelectSingle = vi.fn()
const mockTemplateUpdateSingle = vi.fn()
const mockTemplateDeleteEq = vi.fn()
const mockTemplateListLimit = vi.fn()
const mockTeOrder = vi.fn()
const mockTeInsertSingle = vi.fn()
const mockTeDeleteEq = vi.fn()
const mockWeOrder = vi.fn()
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
              order: vi.fn(() => ({ limit: mockTemplateListLimit })),
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
        }
      }
      if (table === 'workout_exercises') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockWeOrder })) })) }
      }
      return {}
    }),
  },
}))

describe('useWorkoutTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createTemplate inserts a template row', async () => {
    const created = { id: 1, user_id: 'test-user-id', name: 'Push A', created_at: 'x' }
    mockTemplateInsertSingle.mockResolvedValue({ data: created, error: null })

    const { createTemplate } = useWorkoutTemplates()
    const result = await createTemplate('Push A')

    expect(result).toEqual(created)
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

    const { createTemplateFromWorkout } = useWorkoutTemplates()
    const result = await createTemplateFromWorkout(7, 'Push A')

    expect(result?.id).toBe(9)
    expect(mockTeBulkInsert).toHaveBeenCalled()
  })

  it('loadTemplate fetches template and exercises', async () => {
    const tpl = { id: 9, user_id: 'test-user-id', name: 'Push A', created_at: 'x' }
    const tes = [{ id: 1, template_id: 9, exercise_id: 3, sort_order: 0, created_at: 'x', exercise: { id: 3, name: 'Squat' } }]
    mockTemplateSelectSingle.mockResolvedValue({ data: tpl, error: null })
    mockTeOrder.mockResolvedValue({ data: tes, error: null })

    const { template, templateExercises, loadTemplate } = useWorkoutTemplates()
    await loadTemplate(9)

    expect(template.value).toEqual(tpl)
    expect(templateExercises.value).toEqual(tes)
  })
})
