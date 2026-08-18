import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActivityFeedStore } from '@/stores/activityFeed'

type FeedResponse = { data: unknown[] | null; error: { message: string } | null }

const mockLimit = vi.fn<(limit: number) => Promise<FeedResponse>>()
const mockOrder = vi.fn<(_column: string, _options: { ascending: boolean }) => { limit: typeof mockLimit }>(
  () => ({ limit: mockLimit }),
)
const mockSelect = vi.fn<(_columns: string) => { order: typeof mockOrder }>(() => ({ order: mockOrder }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn<(_table: string) => { select: typeof mockSelect }>(() => ({ select: mockSelect })),
  },
}))

describe('activityFeed store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches at most five newest events', async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      occurred_at: `2026-08-${18 - index}T10:00:00Z`,
    }))
    mockLimit.mockResolvedValue({ data: rows, error: null })

    const store = useActivityFeedStore()
    await store.fetchRecent()

    expect(mockOrder).toHaveBeenCalledWith('occurred_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(5)
    expect(store.events).toEqual(rows)
    expect(store.error).toBeNull()
  })

  it('clears stale events and exposes fetch errors', async () => {
    mockLimit
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Feed unavailable' } })

    const store = useActivityFeedStore()
    await store.fetchRecent()
    await store.fetchRecent()

    expect(store.events).toEqual([])
    expect(store.error).toBe('Feed unavailable')
  })
})
