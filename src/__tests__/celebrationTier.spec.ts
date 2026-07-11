import { describe, it, expect } from 'vitest'
import { celebrationTier, isMilestone } from '@/utils/celebrationTier'

describe('isMilestone', () => {
  it('matches the explicit early milestones', () => {
    expect(isMilestone(5)).toBe(true)
    expect(isMilestone(10)).toBe(true)
    expect(isMilestone(25)).toBe(true)
  })

  it('matches every round 50 beyond the list', () => {
    expect(isMilestone(50)).toBe(true)
    expect(isMilestone(150)).toBe(true)
    expect(isMilestone(500)).toBe(true)
  })

  it('is false for ordinary numbers', () => {
    expect(isMilestone(7)).toBe(false)
    expect(isMilestone(19)).toBe(false)
    expect(isMilestone(0)).toBe(false)
  })
})

describe('celebrationTier', () => {
  it('is normal with no PR and no milestone', () => {
    expect(celebrationTier({ prCount: 0, workoutNumber: 7 })).toBe('normal')
  })

  it('is pr with a PR but no milestone', () => {
    expect(celebrationTier({ prCount: 2, workoutNumber: 7 })).toBe('pr')
  })

  it('is milestone on a round number without a PR', () => {
    expect(celebrationTier({ prCount: 0, workoutNumber: 10 })).toBe('milestone')
  })

  it('is epic with both a PR and a milestone', () => {
    expect(celebrationTier({ prCount: 1, workoutNumber: 10 })).toBe('epic')
  })
})
