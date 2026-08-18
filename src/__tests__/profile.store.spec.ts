import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProfileStore } from '@/stores/profile'

type ProfileRow = {
  is_admin: boolean
  nickname: string | null
  goals: string | null
  notes: string | null
  llm_prompt: string | null
}

const mockSingle = vi.fn<() => Promise<{ data: ProfileRow | null }>>()
const mockEq = vi.fn<(_column: string, _value: string) => Promise<{ error: { message: string } | null }>>()
const mockUpdate = vi.fn<(_payload: Record<string, unknown>) => { eq: typeof mockEq }>(
  () => ({ eq: mockEq }),
)

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn<() => Promise<{ data: { user: { id: string } } }>>(
        () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
      ),
    },
    from: vi.fn<(_table: string) => {
      select: (_columns: string) => { single: typeof mockSingle }
      update: typeof mockUpdate
    }>(() => ({
      select: vi.fn<(_columns: string) => { single: typeof mockSingle }>(() => ({ single: mockSingle })),
      update: mockUpdate,
    })),
  },
}))

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads nickname with the private profile fields', async () => {
    mockSingle.mockResolvedValue({
      data: {
        is_admin: false,
        nickname: 'Tijmen',
        goals: null,
        notes: null,
        llm_prompt: null,
      },
    })

    const store = useProfileStore()
    await store.load()

    expect(store.nickname).toBe('Tijmen')
  })

  it('saves and updates nickname in local state', async () => {
    mockEq.mockResolvedValue({ error: null })
    const store = useProfileStore()

    const error = await store.save({
      nickname: 'Tijmen',
      goals: null,
      notes: null,
      llm_prompt: null,
    })

    expect(error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ nickname: 'Tijmen' }))
    expect(store.nickname).toBe('Tijmen')
  })
})
