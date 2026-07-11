import { describe, it, expect } from 'vitest'
import { isNewE1RMPr, e1rmDeltaPct } from '@/utils/prDetection'

describe('isNewE1RMPr', () => {
  it('is a PR when the current best beats every prior session', () => {
    expect(isNewE1RMPr(120, 110)).toBe(true)
  })

  it('is not a PR when weaker than the prior best', () => {
    expect(isNewE1RMPr(100, 110)).toBe(false)
  })

  it('is not a PR when equal to the prior best', () => {
    expect(isNewE1RMPr(110, 110)).toBe(false)
  })

  it('treats tiny floating-point differences as equal (rounded to 0.5)', () => {
    expect(isNewE1RMPr(110.0001, 110)).toBe(false)
  })

  it('is not a PR the first time an exercise is logged (no history)', () => {
    expect(isNewE1RMPr(120, null)).toBe(false)
  })

  it('is not a PR when the current best is null', () => {
    expect(isNewE1RMPr(null, 110)).toBe(false)
  })
})

describe('e1rmDeltaPct', () => {
  it('is positive when stronger than last time', () => {
    expect(e1rmDeltaPct(110, 100)).toBeCloseTo(10)
  })

  it('is negative when weaker than last time', () => {
    expect(e1rmDeltaPct(92, 100)).toBeCloseTo(-8)
  })

  it('returns null without a previous session', () => {
    expect(e1rmDeltaPct(110, null)).toBeNull()
  })

  it('returns null when there is no current best', () => {
    expect(e1rmDeltaPct(null, 100)).toBeNull()
  })
})
