import { addDaysIso, parseLocalIsoDate, toLocalIso, weekStartIso } from '@/utils/dates'
import type { Habit, HabitTarget, WeightPoint } from '@/types/habits'

/**
 * Pure habit evaluation: turns a habit plus its raw rows into day states and
 * week results. Nothing here touches Supabase, so every rule in the spec
 * (docs/habit-tracker.md) is covered by plain unit tests.
 *
 * Weeks run Monday–Sunday and are identified by their Monday ('YYYY-MM-DD').
 */

export type DaySource = 'manual' | 'auto' | 'default'

export interface HabitDay {
  date: string
  /** null when the day can't be logged: in the future or before the habit started. */
  done: boolean | null
  source: DaySource
  future: boolean
  beforeStart: boolean
}

export type WeekStatus = 'achieved' | 'missed' | 'in_progress' | 'no_data' | 'not_started'

export interface WeekResult {
  weekStart: string
  status: WeekStatus
  /** Counts toward "x/y weken": the week is over and wasn't the habit's partial first week. */
  counted: boolean
  /** The habit started after this week's Monday. */
  partial: boolean
  /** An elapsed day in this week has no daily check-in, so the logs may be incomplete. */
  incomplete: boolean
  target: number | null
  /** 'do': days done, 'avoid': days missed, 'weight': kg change per week (null if unknown). */
  value: number | null
  /** 'weight' only: the change was spread over weeks without a measurement. */
  estimated: boolean
  /** 'weight' only: the user set this week's result by hand. */
  overridden: boolean
  /** The 7 days of the week; empty for 'weight' habits. */
  days: HabitDay[]
}

/** Everything a habit's evaluation depends on besides the habit itself. */
export interface HabitHistory {
  targets: HabitTarget[]
  /** Explicit states by date. For 'weight' habits: week overrides keyed by Monday. */
  logs: ReadonlyMap<string, boolean>
  /** Dates on which the habit's auto source has a row. */
  autoDates: ReadonlySet<string>
  /** Dates that have a daily check-in. */
  checkinDates: ReadonlySet<string>
  /** All body-weight measurements (only used by 'weight' habits). */
  weights: WeightPoint[]
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i))
}

/** Mondays from `fromWeek` to `toWeek`, inclusive. */
export function weekStartsBetween(fromWeek: string, toWeek: string): string[] {
  const weeks: string[] = []
  for (let w = fromWeek; w <= toWeek; w = addDaysIso(w, 7)) weeks.push(w)
  return weeks
}

function weeksBetween(fromWeek: string, toWeek: string): number {
  const ms = parseLocalIsoDate(toWeek).getTime() - parseLocalIsoDate(fromWeek).getTime()
  // Round: a DST change makes the span an hour shorter or longer than whole weeks.
  return Math.round(ms / (7 * 86_400_000))
}

/**
 * The target in force for a week: the latest change on or before it. Weeks
 * before the first change (possible after moving the start date back) use the
 * first target.
 */
export function targetForWeek(targets: HabitTarget[], weekStart: string): number | null {
  const sorted = [...targets].sort((a, b) => a.effective_from.localeCompare(b.effective_from))
  let current: number | null = sorted[0]?.target ?? null
  for (const t of sorted) {
    if (t.effective_from <= weekStart) current = t.target
  }
  return current
}

/** Archived habits stop at their archive date, so later weeks never count as missed. */
export function habitEndDate(habit: Habit, today: string): string {
  if (!habit.archived_at) return today
  const archived = toLocalIso(new Date(habit.archived_at))
  return archived < today ? archived : today
}

/**
 * A day's state. Precedence: what the user set explicitly, then the auto
 * source, then the kind's default (unchecked for 'do', checked for 'avoid').
 */
export function habitDay(habit: Habit, date: string, today: string, history: HabitHistory): HabitDay {
  const future = date > today
  const beforeStart = date < habit.start_date
  if (future || beforeStart) return { date, done: null, source: 'default', future, beforeStart }

  const logged = history.logs.get(date)
  if (logged !== undefined) return { date, done: logged, source: 'manual', future, beforeStart }

  if (habit.auto_source && history.autoDates.has(date)) {
    return { date, done: true, source: 'auto', future, beforeStart }
  }
  return { date, done: habit.kind === 'avoid', source: 'default', future, beforeStart }
}

function emptyResult(weekStart: string, target: number | null): WeekResult {
  return {
    weekStart,
    status: 'not_started',
    counted: false,
    partial: false,
    incomplete: false,
    target,
    value: null,
    estimated: false,
    overridden: false,
    days: [],
  }
}

function evaluateCheckWeek(
  habit: Habit,
  weekStart: string,
  today: string,
  history: HabitHistory,
): WeekResult {
  const dates = weekDates(weekStart)
  const weekEnd = dates[6]!
  const target = targetForWeek(history.targets, weekStart)
  const days = dates.map((date) => habitDay(habit, date, today, history))

  if (weekEnd < habit.start_date || weekStart > today) {
    return { ...emptyResult(weekStart, target), days }
  }

  const value = days.filter((d) => d.done === (habit.kind === 'do')).length
  const over = today > weekEnd

  let status: WeekStatus
  if (target === null) status = over ? 'no_data' : 'in_progress'
  else if (habit.kind === 'do') status = value >= target ? 'achieved' : over ? 'missed' : 'in_progress'
  // 'avoid' can only be confirmed once the week is over, but can fail early.
  else status = value > target ? 'missed' : over ? 'achieved' : 'in_progress'

  const partial = habit.start_date > weekStart
  return {
    weekStart,
    status,
    counted: over && !partial && (status === 'achieved' || status === 'missed'),
    partial,
    incomplete: days.some((d) => d.done !== null && d.date < today && !history.checkinDates.has(d.date)),
    target,
    value,
    estimated: false,
    overridden: false,
    days,
  }
}

/** Mean weight per week, keyed by Monday. */
export function weeklyAverages(weights: WeightPoint[]): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>()
  for (const w of weights) {
    const week = weekStartIso(w.date)
    const entry = sums.get(week) ?? { total: 0, count: 0 }
    entry.total += w.kg
    entry.count += 1
    sums.set(week, entry)
  }
  return new Map([...sums].map(([week, { total, count }]) => [week, total / count]))
}

/** Rate in kg/week for each week, spreading a change evenly over weeks without a measurement. */
function weeklyWeightChange(
  weeks: string[],
  averages: Map<string, number>,
): Map<string, { rate: number; estimated: boolean }> {
  const measured = [...averages.keys()].sort()
  const result = new Map<string, { rate: number; estimated: boolean }>()

  for (const week of weeks) {
    const earlier = measured.filter((m) => m < week)
    const prev = earlier[earlier.length - 1]
    if (!prev) continue
    // Measured weeks compare to the previous measurement; gap weeks borrow the
    // rate between the measurements on either side of them.
    const end = averages.has(week) ? week : measured.find((m) => m > week)
    if (!end) continue
    const span = weeksBetween(prev, end)
    const rate = (averages.get(end)! - averages.get(prev)!) / span
    result.set(week, { rate: Math.round(rate * 100) / 100, estimated: span > 1 })
  }
  return result
}

function evaluateWeightWeeks(habit: Habit, today: string, history: HabitHistory): WeekResult[] {
  const currentWeek = weekStartIso(today)
  const weeks = weekStartsBetween(weekStartIso(habit.start_date), currentWeek)
  // Measurements after today (or after archiving) don't exist yet as far as this habit is concerned.
  const averages = weeklyAverages(history.weights.filter((w) => w.date <= today))
  const changes = weeklyWeightChange(weeks, averages)

  return weeks.map((weekStart) => {
    const target = targetForWeek(history.targets, weekStart)
    const change = changes.get(weekStart)
    const override = history.logs.get(weekStart)
    const isCurrent = weekStart === currentWeek

    let status: WeekStatus
    if (override !== undefined) status = override ? 'achieved' : 'missed'
    else if (!change) status = isCurrent ? 'in_progress' : 'no_data'
    else if (isCurrent) status = 'in_progress'
    else if (target === null) status = 'no_data'
    else status = change.rate <= target ? 'achieved' : 'missed'

    const partial = habit.start_date > weekStart
    return {
      weekStart,
      status,
      counted: !isCurrent && !partial && (status === 'achieved' || status === 'missed'),
      partial,
      incomplete: false,
      target,
      value: change?.rate ?? null,
      estimated: change?.estimated ?? false,
      overridden: override !== undefined,
      days: [],
    }
  })
}

/** Results for every week from the habit's start up to today (or its archive date), oldest first. */
export function evaluateWeeks(habit: Habit, today: string, history: HabitHistory): WeekResult[] {
  const end = habitEndDate(habit, today)
  if (end < habit.start_date) return []
  if (habit.kind === 'weight') return evaluateWeightWeeks(habit, end, history)
  return weekStartsBetween(weekStartIso(habit.start_date), weekStartIso(end)).map((week) =>
    evaluateCheckWeek(habit, week, end, history),
  )
}

/** The result for one week; 'not_started' for weeks outside the habit's lifetime. */
export function evaluateWeek(
  habit: Habit,
  weekStart: string,
  today: string,
  history: HabitHistory,
): WeekResult {
  const end = habitEndDate(habit, today)
  if (habit.kind !== 'weight') return evaluateCheckWeek(habit, weekStart, end, history)
  const found = evaluateWeeks(habit, today, history).find((r) => r.weekStart === weekStart)
  return found ?? emptyResult(weekStart, targetForWeek(history.targets, weekStart))
}

/** "x/y weken behaald": only finished, full weeks count. */
export function summarizeWeeks(results: WeekResult[]): { achieved: number; counted: number } {
  const counted = results.filter((r) => r.counted)
  return { achieved: counted.filter((r) => r.status === 'achieved').length, counted: counted.length }
}
