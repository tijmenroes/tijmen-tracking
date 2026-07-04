import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTags } from '@/composables/useTags'

const mockSelectOrder = vi.fn()
const mockInsertSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: mockSelectOrder })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsertSingle })) })),
    })),
  },
}))

describe('useTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchTags populates tags on success', async () => {
    const mockData = [
      { id: 1, name: 'back', created_at: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'biceps', created_at: '2024-01-01T00:00:00Z' },
    ]
    mockSelectOrder.mockResolvedValue({ data: mockData, error: null })

    const { tags, fetchTags } = useTags()
    await fetchTags()

    expect(tags.value).toEqual(mockData)
  })

  it('fetchTags sets error on failure', async () => {
    mockSelectOrder.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const { error, fetchTags } = useTags()
    await fetchTags()

    expect(error.value).toBe('boom')
  })

  it('createTag inserts and keeps the list sorted', async () => {
    mockSelectOrder.mockResolvedValue({
      data: [{ id: 1, name: 'chest', created_at: '2024-01-01T00:00:00Z' }],
      error: null,
    })
    const newTag = { id: 2, name: 'abs', created_at: '2024-01-02T00:00:00Z' }
    mockInsertSingle.mockResolvedValue({ data: newTag, error: null })

    const { tags, fetchTags, createTag } = useTags()
    await fetchTags()
    const result = await createTag('abs')

    expect(result).toEqual(newTag)
    expect(tags.value.map((t) => t.name)).toEqual(['abs', 'chest'])
  })
})
