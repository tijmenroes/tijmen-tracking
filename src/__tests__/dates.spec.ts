import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import {
  toLocalIso,
  todayLocalIso,
  parseLocalIsoDate,
  addDaysIso,
  weekStartIso,
} from '@/utils/dates'

// These tests are only meaningful in a zone that isn't UTC, so pin one instead
// of depending on the machine running them. In Amsterdam in 2026, DST starts
// Sun 29 March (UTC+1 → UTC+2) and ends Sun 25 October (UTC+2 → UTC+1).
beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Amsterdam')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('todayLocalIso', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the local date at 00:30, not the UTC date', () => {
    // 23:30 UTC on 31 Oct is 00:30 on 1 Nov in Amsterdam (UTC+1).
    const now = new Date('2026-10-31T23:30:00Z')
    expect(now.toISOString().slice(0, 10)).toBe('2026-10-31') // the old, buggy answer
    expect(todayLocalIso(now)).toBe('2026-11-01')
  })

  it('returns the local date up to 02:00 in summer time (UTC+2)', () => {
    expect(todayLocalIso(new Date('2026-07-14T22:30:00Z'))).toBe('2026-07-15') // 00:30
    expect(todayLocalIso(new Date('2026-07-14T23:59:00Z'))).toBe('2026-07-15') // 01:59
  })

  it('returns the same date for the last minute of the local day', () => {
    expect(todayLocalIso(new Date('2026-11-01T22:59:00Z'))).toBe('2026-11-01') // 23:59
  })

  it('defaults to the current moment', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T23:30:00Z'))
    expect(todayLocalIso()).toBe('2026-11-01')
  })
})

describe('toLocalIso', () => {
  it('zero-pads month and day', () => {
    expect(toLocalIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('parseLocalIsoDate', () => {
  it('returns local midnight on that date', () => {
    const d = parseLocalIsoDate('2026-11-01')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 1])
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0])
  })

  it('differs from new Date(iso), which parses as UTC midnight', () => {
    expect(parseLocalIsoDate('2026-11-01').toISOString()).toBe('2026-10-31T23:00:00.000Z')
    expect(new Date('2026-11-01').getHours()).toBe(1)
  })

  it('returns local midnight on DST transition days', () => {
    // Midnight is still before the 02:00/03:00 switch, so it carries the old offset.
    expect(parseLocalIsoDate('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z')
    expect(parseLocalIsoDate('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })

  it('round-trips through toLocalIso', () => {
    for (const iso of ['2026-03-29', '2026-10-25', '2028-02-29', '2026-12-31']) {
      expect(toLocalIso(parseLocalIsoDate(iso))).toBe(iso)
    }
  })

  it.each([
    '',
    '2026-1-5',
    '01-11-2026',
    '2026-11-01T00:00:00Z',
    '2026-13-01',
    '2026-02-31',
    '2026-02-29',
  ])('throws on malformed input or impossible date %j', (bad) => {
    expect(() => parseLocalIsoDate(bad)).toThrow(RangeError)
  })
})

describe('addDaysIso', () => {
  it('moves forward and backward across month and year ends', () => {
    expect(addDaysIso('2026-11-01', 0)).toBe('2026-11-01')
    expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles leap years', () => {
    expect(addDaysIso('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('counts calendar days across the 23-hour spring-forward day', () => {
    // Subtracting 24h of milliseconds from local midnight on 30 March lands on 28 March.
    expect(addDaysIso('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDaysIso('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDaysIso('2026-03-30', -1)).toBe('2026-03-29')
    expect(addDaysIso('2026-03-23', 7)).toBe('2026-03-30')
  })

  it('counts calendar days across the 25-hour fall-back day', () => {
    // Adding 24h of milliseconds to local midnight on 25 October stays on 25 October.
    expect(addDaysIso('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDaysIso('2026-10-26', -1)).toBe('2026-10-25')
    expect(addDaysIso('2026-10-19', 7)).toBe('2026-10-26')
  })
})

describe('weekStartIso', () => {
  it('returns the date itself for a Monday', () => {
    expect(weekStartIso('2026-11-02')).toBe('2026-11-02')
  })

  it('returns the Monday six days earlier for a Sunday', () => {
    expect(weekStartIso('2026-11-08')).toBe('2026-11-02')
    expect(weekStartIso('2026-11-01')).toBe('2026-10-26')
  })

  it('returns the preceding Monday mid-week', () => {
    expect(weekStartIso('2026-11-04')).toBe('2026-11-02')
  })

  it('crosses the year boundary', () => {
    // Fri 1 Jan 2027 and Sun 3 Jan 2027 both belong to the week of Mon 28 Dec 2026.
    expect(weekStartIso('2027-01-01')).toBe('2026-12-28')
    expect(weekStartIso('2027-01-03')).toBe('2026-12-28')
  })

  it('handles weeks that contain a DST transition', () => {
    expect(weekStartIso('2026-03-29')).toBe('2026-03-23')
    expect(weekStartIso('2026-10-25')).toBe('2026-10-19')
  })
})
