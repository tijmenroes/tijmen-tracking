import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWeights } from '@/composables/useWeights'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: mockSelect })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsert })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockUpdate })) })) })),
      delete: vi.fn(() => ({ eq: mockDelete })),
    })),
  },
}))

describe('useWeights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchWeights populates weights on success', async () => {
    const mockData = [
      { id: 1, created_at: '2024-01-01T00:00:00Z', weight: 75.5, is_kg: true },
    ]
    mockSelect.mockResolvedValue({ data: mockData, error: null })

    const { weights, fetchWeights } = useWeights()
    await fetchWeights()

    expect(weights.value).toEqual(mockData)
  })

  it('fetchWeights sets error on failure', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'Network error' } })

    const { error, fetchWeights } = useWeights()
    await fetchWeights()

    expect(error.value).toBe('Network error')
  })

  it('addWeight prepends new entry to weights', async () => {
    const newEntry = { id: 2, created_at: '2024-01-02T00:00:00Z', weight: 76, is_kg: true }
    mockInsert.mockResolvedValue({ data: newEntry, error: null })

    const { weights, addWeight } = useWeights()
    await addWeight(76, true)

    expect(weights.value[0]).toEqual(newEntry)
  })

  it('deleteWeight removes entry from weights', async () => {
    mockSelect.mockResolvedValue({
      data: [
        { id: 1, created_at: '2024-01-01T00:00:00Z', weight: 75.5, is_kg: true },
        { id: 2, created_at: '2024-01-02T00:00:00Z', weight: 76, is_kg: true },
      ],
      error: null,
    })
    mockDelete.mockResolvedValue({ error: null })

    const { weights, fetchWeights, deleteWeight } = useWeights()
    await fetchWeights()
    await deleteWeight(1)

    expect(weights.value.find((w) => w.id === 1)).toBeUndefined()
    expect(weights.value.length).toBe(1)
  })

  it('updateWeight replaces the entry in weights', async () => {
    mockSelect.mockResolvedValue({
      data: [{ id: 1, created_at: '2024-01-01T00:00:00Z', weight: 75.5, is_kg: true }],
      error: null,
    })
    const updated = { id: 1, created_at: '2024-01-01T00:00:00Z', weight: 80, is_kg: true }
    mockUpdate.mockResolvedValue({ data: updated, error: null })

    const { weights, fetchWeights, updateWeight } = useWeights()
    await fetchWeights()
    await updateWeight(1, 80)

    expect(weights.value[0]?.weight).toBe(80)
  })
})
