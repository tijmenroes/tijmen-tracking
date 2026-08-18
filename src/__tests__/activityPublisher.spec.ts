import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publishWorkoutCompletion } from '@/services/activityPublisher'
import { supabase } from '@/lib/supabase'

const mockLoadStats = vi.fn<(_workoutId: number) => Promise<{ prCount: number } | null>>()

vi.mock('@/composables/useWorkoutStats', () => ({
  useWorkoutStats: () => ({ loadStats: mockLoadStats }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn<() => Promise<never>>() },
}))

describe('publishWorkoutCompletion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('publishes the PR count calculated by workout stats', async () => {
    mockLoadStats.mockResolvedValue({ prCount: 3 })
    vi.mocked(supabase.rpc).mockResolvedValue(undefined as never)

    await publishWorkoutCompletion(42)

    expect(supabase.rpc).toHaveBeenCalledWith('publish_workout_activity', {
      p_workout_id: 42,
      p_pr_count: 3,
    })
  })

  it('publishes a normal completion when stats are unavailable', async () => {
    mockLoadStats.mockResolvedValue(null)
    vi.mocked(supabase.rpc).mockResolvedValue(undefined as never)

    await publishWorkoutCompletion(42)

    expect(supabase.rpc).toHaveBeenCalledWith(
      'publish_workout_activity',
      expect.objectContaining({ p_pr_count: 0 }),
    )
  })
})
