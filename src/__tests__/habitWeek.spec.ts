import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  evaluateWeek,
  evaluateWeeks,
  habitDay,
  summarizeWeeks,
  targetForWeek,
  weekDates,
  weeklyAverages,
  type HabitHistory,
} from '@/utils/habitWeek'
import type { Habit, WeightPoint } from '@/types/habits'

// Mondays used throughout. DST ends Sun 25 Oct 2026 in Amsterdam, so spans
// across W4 are an hour longer than whole weeks.
const W1 = '2026-10-05'
const W2 = '2026-10-12'
const W3 = '2026-10-19'
const W4 = '2026-10-26'
const W5 = '2026-11-02'
const W6 = '2026-11-09'

beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Amsterdam')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    user_id: 'user-1',
    name: 'Sporten',
    why: null,
    kind: 'do',
    auto_source: null,
    start_date: W1,
    sort_order: 0,
    archived_at: null,
    created_at: '2026-10-05T08:00:00Z',
    ...overrides,
  }
}

function makeHistory(overrides: Partial<HabitHistory> = {}): HabitHistory {
  return {
    targets: [{ habit_id: 1, effective_from: W1, target: 4 }],
    logs: new Map(),
    autoDates: new Set(),
    checkinDates: new Set(),
    weights: [],
    ...overrides,
  }
}

function logs(entries: Record<string, boolean>): Map<string, boolean> {
  return new Map(Object.entries(entries))
}

function checked(...dates: string[]): Map<string, boolean> {
  return new Map(dates.map((d) => [d, true]))
}

describe('habitDay', () => {
  it('do-habit without logs: elapsed days are unchecked', () => {
    const day = habitDay(makeHabit(), '2026-10-06', '2026-10-08', makeHistory())
    expect(day).toMatchObject({ done: false, source: 'default' })
  })

  it('avoid-habit without logs: elapsed days are checked', () => {
    const day = habitDay(makeHabit({ kind: 'avoid' }), '2026-10-06', '2026-10-08', makeHistory())
    expect(day).toMatchObject({ done: true, source: 'default' })
  })

  it('the auto source checks a day that has a workout', () => {
    const habit = makeHabit({ auto_source: 'workouts' })
    const day = habitDay(habit, '2026-10-06', '2026-10-08', makeHistory({ autoDates: new Set(['2026-10-06']) }))
    expect(day).toMatchObject({ done: true, source: 'auto' })
  })

  it('an explicit uncheck beats the auto source', () => {
    const habit = makeHabit({ auto_source: 'workouts' })
    const history = makeHistory({ autoDates: new Set(['2026-10-06']), logs: logs({ '2026-10-06': false }) })
    expect(habitDay(habit, '2026-10-06', '2026-10-08', history)).toMatchObject({ done: false, source: 'manual' })
  })

  it('ignores auto dates when the habit has no auto source', () => {
    const history = makeHistory({ autoDates: new Set(['2026-10-06']) })
    expect(habitDay(makeHabit(), '2026-10-06', '2026-10-08', history).done).toBe(false)
  })

  it('future days and days before the start cannot be logged', () => {
    const habit = makeHabit({ start_date: '2026-10-06' })
    expect(habitDay(habit, '2026-10-09', '2026-10-08', makeHistory())).toMatchObject({ done: null, future: true })
    expect(habitDay(habit, '2026-10-05', '2026-10-08', makeHistory())).toMatchObject({
      done: null,
      beforeStart: true,
    })
  })
})

describe('evaluateWeek – do', () => {
  const fourDays = checked('2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08')

  it('is achieved as soon as the target is reached, but only counts once the week is over', () => {
    const history = makeHistory({ logs: fourDays })
    expect(evaluateWeek(makeHabit(), W1, '2026-10-08', history)).toMatchObject({
      status: 'achieved',
      counted: false,
      value: 4,
    })
    expect(evaluateWeek(makeHabit(), W1, W2, history)).toMatchObject({ status: 'achieved', counted: true })
  })

  it('is in progress below target during the week', () => {
    const history = makeHistory({ logs: checked('2026-10-05', '2026-10-06') })
    expect(evaluateWeek(makeHabit(), W1, '2026-10-08', history)).toMatchObject({ status: 'in_progress', value: 2 })
  })

  it('is missed when the week ends below target', () => {
    const history = makeHistory({ logs: checked('2026-10-05', '2026-10-06', '2026-10-07') })
    expect(evaluateWeek(makeHabit(), W1, W2, history)).toMatchObject({ status: 'missed', counted: true, value: 3 })
  })

  it('counts auto-checked days toward the target', () => {
    const habit = makeHabit({ auto_source: 'workouts' })
    const history = makeHistory({
      autoDates: new Set(['2026-10-05', '2026-10-07']),
      logs: checked('2026-10-09', '2026-10-11'),
    })
    expect(evaluateWeek(habit, W1, W2, history)).toMatchObject({ status: 'achieved', value: 4 })
  })
})

describe('evaluateWeek – avoid', () => {
  const avoid = makeHabit({ kind: 'avoid' })
  const maxOne = [{ habit_id: 1, effective_from: W1, target: 1 }]

  it('no logs in a finished week means every day went well', () => {
    expect(evaluateWeek(avoid, W1, W2, makeHistory({ targets: maxOne }))).toMatchObject({
      status: 'achieved',
      counted: true,
      value: 0,
    })
  })

  it('fails early once the misses exceed the maximum', () => {
    const history = makeHistory({ targets: maxOne, logs: logs({ '2026-10-05': false, '2026-10-06': false }) })
    expect(evaluateWeek(avoid, W1, '2026-10-07', history)).toMatchObject({
      status: 'missed',
      counted: false,
      value: 2,
    })
  })

  it('stays in progress while within the maximum', () => {
    const history = makeHistory({ targets: maxOne, logs: logs({ '2026-10-05': false }) })
    expect(evaluateWeek(avoid, W1, '2026-10-07', history)).toMatchObject({ status: 'in_progress', value: 1 })
  })

  it('never pre-checks future days', () => {
    const result = evaluateWeek(avoid, W1, W1, makeHistory({ targets: maxOne }))
    expect(result.days.map((d) => d.done)).toEqual([true, null, null, null, null, null, null])
  })
})

describe('target history', () => {
  it('a change applies from its week; earlier weeks keep the old target', () => {
    const threePerWeek = [W1, W2, W3].flatMap((w) => weekDates(w).slice(0, 3))
    const history = makeHistory({
      targets: [
        { habit_id: 1, effective_from: W1, target: 4 },
        { habit_id: 1, effective_from: W3, target: 3 },
      ],
      logs: checked(...threePerWeek),
    })
    const results = evaluateWeeks(makeHabit(), W4, history)
    expect(results.map((r) => [r.weekStart, r.target, r.status])).toEqual([
      [W1, 4, 'missed'],
      [W2, 4, 'missed'],
      [W3, 3, 'achieved'],
      [W4, 3, 'in_progress'],
    ])
  })

  it('weeks before the first change use the first target', () => {
    expect(targetForWeek([{ habit_id: 1, effective_from: W3, target: 3 }], W1)).toBe(3)
    expect(targetForWeek([], W1)).toBeNull()
  })
})

describe('partial weeks and incomplete data', () => {
  it('shows the partial first week but does not count it', () => {
    const habit = makeHabit({ start_date: '2026-10-07' })
    const history = makeHistory({ logs: checked('2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10') })
    expect(evaluateWeek(habit, W1, W2, history)).toMatchObject({
      status: 'achieved',
      partial: true,
      counted: false,
    })
  })

  it('marks a week incomplete when an elapsed day has no check-in; today does not count', () => {
    const today = '2026-10-08'
    const all = makeHistory({ checkinDates: new Set(['2026-10-05', '2026-10-06', '2026-10-07']) })
    expect(evaluateWeek(makeHabit(), W1, today, all).incomplete).toBe(false)

    const gap = makeHistory({ checkinDates: new Set(['2026-10-05', '2026-10-07']) })
    expect(evaluateWeek(makeHabit(), W1, today, gap).incomplete).toBe(true)
  })
})

describe('evaluateWeeks and summarizeWeeks', () => {
  it('evaluates from the start week up to the current week', () => {
    const weeks = evaluateWeeks(makeHabit(), '2026-10-21', makeHistory()).map((r) => r.weekStart)
    expect(weeks).toEqual([W1, W2, W3])
  })

  it('stops archived habits at their archive date', () => {
    const habit = makeHabit({ archived_at: '2026-10-14T10:00:00Z' })
    const results = evaluateWeeks(habit, '2026-11-01', makeHistory())
    expect(results.map((r) => [r.weekStart, r.status])).toEqual([
      [W1, 'missed'],
      [W2, 'in_progress'],
    ])
    expect(evaluateWeek(habit, W4, '2026-11-01', makeHistory()).status).toBe('not_started')
  })

  it('"x/y weeks" only counts finished, full weeks', () => {
    const habit = makeHabit({ start_date: '2026-10-07' })
    const history = makeHistory({
      logs: checked(...weekDates(W2).slice(0, 4), ...weekDates(W4).slice(0, 4)),
    })
    // W1 partial, W2 achieved, W3 missed, W4 achieved but still running.
    expect(summarizeWeeks(evaluateWeeks(habit, '2026-10-29', history))).toEqual({ achieved: 1, counted: 2 })
  })
})

describe('weight habit', () => {
  const lean = makeHabit({ kind: 'weight', name: 'Lean bulk', start_date: W2 })
  const maxGain = [{ habit_id: 1, effective_from: W2, target: 0.3 }]
  const weights: WeightPoint[] = [
    { date: '2026-10-05', kg: 80.0 },
    { date: '2026-10-08', kg: 80.2 }, // W1 avg 80.1 — before the start, used as baseline
    { date: '2026-10-14', kg: 80.3 }, // W2 +0.2
    { date: '2026-10-21', kg: 80.9 }, // W3 +0.6
    // W4: no measurement
    { date: '2026-11-04', kg: 81.3 }, // W5: +0.4 over two weeks
  ]

  function byWeek(today: string, history: Partial<HabitHistory> = {}) {
    const results = evaluateWeeks(lean, today, makeHistory({ targets: maxGain, weights, ...history }))
    return new Map(results.map((r) => [r.weekStart, r]))
  }

  it('averages measurements per week', () => {
    expect(weeklyAverages(weights).get(W1)).toBeCloseTo(80.1)
  })

  it('compares weekly averages, using measurements from before the start as baseline', () => {
    expect(byWeek(W6).get(W2)).toMatchObject({ status: 'achieved', value: 0.2, estimated: false, counted: true })
  })

  it('misses when the weekly gain exceeds the maximum', () => {
    expect(byWeek(W6).get(W3)).toMatchObject({ status: 'missed', value: 0.6 })
  })

  it('spreads a change over weeks without a measurement and marks them estimated', () => {
    const weeks = byWeek(W6)
    expect(weeks.get(W4)).toMatchObject({ status: 'achieved', value: 0.2, estimated: true, counted: true })
    expect(weeks.get(W5)).toMatchObject({ status: 'achieved', value: 0.2, estimated: true })
  })

  it('keeps the current week in progress, with or without a measurement', () => {
    expect(byWeek(W6).get(W6)).toMatchObject({ status: 'in_progress', value: null, counted: false })
    const withMeasurement = byWeek(W6, { weights: [...weights, { date: W6, kg: 81.5 }] })
    expect(withMeasurement.get(W6)).toMatchObject({ status: 'in_progress', value: 0.2 })
  })

  it('has no result without an earlier measurement to compare to', () => {
    const fromW2 = weights.filter((w) => w.date >= W2)
    expect(byWeek(W6, { weights: fromW2 }).get(W2)).toMatchObject({ status: 'no_data', counted: false })
  })

  it('lets a manual override beat the computed result', () => {
    expect(byWeek(W6, { logs: logs({ [W3]: true }) }).get(W3)).toMatchObject({
      status: 'achieved',
      overridden: true,
      counted: true,
    })
  })

  it('supports a cut with a negative maximum', () => {
    const cut = makeHabit({ kind: 'weight', start_date: W2 })
    const history = makeHistory({
      targets: [{ habit_id: 1, effective_from: W2, target: -0.5 }],
      weights: [
        { date: '2026-10-05', kg: 80 },
        { date: '2026-10-12', kg: 79.4 },
        { date: '2026-10-19', kg: 79.2 },
      ],
    })
    const results = evaluateWeeks(cut, W4, history)
    expect(results.map((r) => [r.weekStart, r.status])).toEqual([
      [W2, 'achieved'],
      [W3, 'missed'],
      [W4, 'in_progress'],
    ])
  })
})
