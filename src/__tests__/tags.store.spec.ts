import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTagsStore } from '@/stores/tags'

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

describe('tags store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchTags populates tags and caches', async () => {
    const mockData = [
      { id: 1, name: 'back', created_at: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'biceps', created_at: '2024-01-01T00:00:00Z' },
    ]
    mockSelectOrder.mockResolvedValue({ data: mockData, error: null })

    const store = useTagsStore()
    await store.fetchTags()

    expect(store.tags).toEqual(mockData)
    expect(store.loaded).toBe(true)

    await store.fetchTags()
    expect(mockSelectOrder).toHaveBeenCalledTimes(1)

    await store.fetchTags(true)
    expect(mockSelectOrder).toHaveBeenCalledTimes(2)
  })

  it('fetchTags sets error on failure', async () => {
    mockSelectOrder.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const store = useTagsStore()
    await store.fetchTags()

    expect(store.error).toBe('boom')
  })

  it('createTag inserts and keeps the list sorted', async () => {
    mockSelectOrder.mockResolvedValue({
      data: [{ id: 1, name: 'chest', created_at: '2024-01-01T00:00:00Z' }],
      error: null,
    })
    const newTag = { id: 2, name: 'abs', created_at: '2024-01-02T00:00:00Z' }
    mockInsertSingle.mockResolvedValue({ data: newTag, error: null })

    const store = useTagsStore()
    await store.fetchTags()
    const result = await store.createTag('abs')

    expect(result).toEqual(newTag)
    expect(store.tags.map((t) => t.name)).toEqual(['abs', 'chest'])
  })
})
