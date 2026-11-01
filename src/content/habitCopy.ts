import { parseLocalIsoDate, addDaysIso } from '@/utils/dates'
import type { WeekResult, WeekStatus } from '@/utils/habitWeek'
import type { Habit, HabitAutoSource, HabitKind } from '@/types/habits'

export const KIND_LABELS: Record<HabitKind, string> = {
  do: 'Doen',
  avoid: 'Laten',
  weight: 'Gewichtsdoel',
}

export const KIND_DESCRIPTIONS: Record<HabitKind, string> = {
  do: 'Vink de dagen aan waarop je het deed.',
  avoid: 'Dagen staan standaard aan; vink uit als het niet lukte.',
  weight: 'Vergelijkt je gemiddelde gewicht met vorige week.',
}

export const AUTO_SOURCE_LABELS: Record<HabitAutoSource, string> = {
  workouts: 'Workout gelogd',
  weight: 'Gewicht gelogd',
}

export const STATUS_LABELS: Record<WeekStatus, string> = {
  achieved: 'Behaald',
  missed: 'Niet behaald',
  in_progress: 'Bezig',
  no_data: 'Geen data',
  not_started: '—',
}

const kgChange = new Intl.NumberFormat('nl-NL', {
  signDisplay: 'exceptZero',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

export function formatKgChange(kg: number): string {
  return `${kgChange.format(kg)} kg`
}

function days(n: number): string {
  return n === 1 ? 'dag' : 'dagen'
}

export function targetLabel(kind: HabitKind, target: number): string {
  if (kind === 'do') return `minstens ${target} ${days(target)} per week`
  if (kind === 'avoid') return `hoogstens ${target} ${days(target)} per week niet gelukt`
  return `hoogstens ${formatKgChange(target)} per week`
}

/** Short progress text for one week, e.g. "2/4", "1× mis (max 1)", "+0,2 kg/wk". */
export function weekValueLabel(habit: Habit, result: WeekResult): string {
  if (habit.kind === 'do') return `${result.value ?? 0}/${result.target ?? '–'}`
  if (habit.kind === 'avoid') return `${result.value ?? 0}× mis (max ${result.target ?? '–'})`
  if (result.value === null) return result.status === 'in_progress' ? 'nog geen meting' : 'geen meting'
  return `${formatKgChange(result.value)}/wk`
}

function shortDate(iso: string): string {
  return parseLocalIsoDate(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

/** "27 okt – 2 nov" */
export function formatWeekRange(weekStart: string): string {
  return `${shortDate(weekStart)} – ${shortDate(addDaysIso(weekStart, 6))}`
}

/** "Vandaag", "Gisteren" or "di 28 okt". */
export function formatDayLabel(date: string, today: string): string {
  if (date === today) return 'Vandaag'
  if (date === addDaysIso(today, -1)) return 'Gisteren'
  return parseLocalIsoDate(date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatLongDate(iso: string): string {
  return parseLocalIsoDate(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "ma", "di", … for a date. */
export function weekdayInitial(iso: string): string {
  return parseLocalIsoDate(iso).toLocaleDateString('nl-NL', { weekday: 'short' }).slice(0, 2)
}
