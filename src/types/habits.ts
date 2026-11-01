/** 'do': check the days you did it. 'avoid': days start checked, uncheck slips. 'weight': weekly average change. */
export type HabitKind = 'do' | 'avoid' | 'weight'

/** Table whose rows auto-check a 'do' habit on their date. */
export type HabitAutoSource = 'workouts' | 'weight'

export interface Habit {
  id: number
  user_id: string
  name: string
  why: string | null
  kind: HabitKind
  auto_source: HabitAutoSource | null
  start_date: string
  sort_order: number
  archived_at: string | null
  created_at: string
}

/**
 * Target valid from `effective_from` (a Monday) until the next change.
 * 'do' = min days done, 'avoid' = max days missed, 'weight' = max kg change per week.
 */
export interface HabitTarget {
  habit_id: number
  effective_from: string
  target: number
}

/** An explicit state the user set. For 'weight' habits: a week override stored on the Monday. */
export interface HabitLog {
  habit_id: number
  date: string
  done: boolean
}

export interface DailyCheckin {
  date: string
  happiness: number | null
}

/** One body-weight measurement, already converted to kg. */
export interface WeightPoint {
  date: string
  kg: number
}
