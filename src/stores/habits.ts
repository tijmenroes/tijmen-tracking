import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { todayLocalIso, weekStartIso } from '@/utils/dates'
import { evaluateWeek, evaluateWeeks, habitDay, type HabitHistory, type WeekResult } from '@/utils/habitWeek'
import type { DailyCheckin, Habit, HabitAutoSource, HabitKind, HabitLog, HabitTarget, WeightPoint } from '@/types/habits'

const LBS_TO_KG = 0.45359237
const NO_DATES: ReadonlySet<string> = new Set()

export interface NewHabit {
  name: string
  why: string | null
  kind: HabitKind
  auto_source: HabitAutoSource | null
  start_date: string
  target: number
}

export type HabitPatch = Partial<Pick<Habit, 'name' | 'why' | 'auto_source' | 'start_date'>>

/**
 * Habits, their logs and daily check-ins. Everything is loaded once and kept
 * as raw rows; week results are derived on the fly by the pure functions in
 * utils/habitWeek, so a backfilled day or edited workout never leaves a stale
 * cached result behind.
 *
 * user_id is never sent: the columns default to auth.uid() and RLS checks it.
 */
export const useHabitsStore = defineStore('habits', () => {
  const habits = ref<Habit[]>([])
  const targets = ref<HabitTarget[]>([])
  const logs = ref<HabitLog[]>([])
  const checkins = ref<DailyCheckin[]>([])
  const workoutDates = ref<string[]>([])
  const weights = ref<WeightPoint[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const activeHabits = computed(() =>
    habits.value.filter((h) => !h.archived_at).sort((a, b) => a.sort_order - b.sort_order),
  )
  const archivedHabits = computed(() => habits.value.filter((h) => h.archived_at))

  const logsByHabit = computed(() => {
    const byHabit = new Map<number, Map<string, boolean>>()
    for (const log of logs.value) {
      const map = byHabit.get(log.habit_id) ?? new Map<string, boolean>()
      map.set(log.date, log.done)
      byHabit.set(log.habit_id, map)
    }
    return byHabit
  })
  const workoutDateSet = computed(() => new Set(workoutDates.value))
  const weightDateSet = computed(() => new Set(weights.value.map((w) => w.date)))
  const checkinDateSet = computed(() => new Set(checkins.value.map((c) => c.date)))

  function historyFor(habit: Habit): HabitHistory {
    const autoDates =
      habit.auto_source === 'workouts'
        ? workoutDateSet.value
        : habit.auto_source === 'weight'
          ? weightDateSet.value
          : NO_DATES
    return {
      targets: targets.value.filter((t) => t.habit_id === habit.id),
      logs: logsByHabit.value.get(habit.id) ?? new Map(),
      autoDates,
      checkinDates: checkinDateSet.value,
      weights: weights.value,
    }
  }

  function weeksFor(habit: Habit, today = todayLocalIso()): WeekResult[] {
    return evaluateWeeks(habit, today, historyFor(habit))
  }

  function weekFor(habit: Habit, weekStart: string, today = todayLocalIso()): WeekResult {
    return evaluateWeek(habit, weekStart, today, historyFor(habit))
  }

  function checkinFor(date: string): DailyCheckin | undefined {
    return checkins.value.find((c) => c.date === date)
  }

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null

    // PostgREST returns at most 1000 rows by default. Sorting newest first
    // means a long history loses its oldest rows, not the weeks on screen.
    const [habitsRes, targetsRes, logsRes, checkinsRes, workoutsRes, weightsRes] = await Promise.all([
      supabase.from('habits').select('*').order('sort_order'),
      supabase.from('habit_targets').select('habit_id, effective_from, target'),
      supabase.from('habit_logs').select('habit_id, date, done').order('date', { ascending: false }),
      supabase.from('daily_checkins').select('date, happiness').order('date', { ascending: false }),
      supabase.from('workouts').select('date').eq('status', 'saved').order('date', { ascending: false }),
      supabase.from('Weight').select('date, weight, is_kg').order('date', { ascending: false }),
    ])
    loading.value = false

    const err = [habitsRes, targetsRes, logsRes, checkinsRes, workoutsRes, weightsRes].find((r) => r.error)?.error
    if (err) {
      error.value = err.message
      return
    }

    habits.value = (habitsRes.data ?? []) as Habit[]
    targets.value = ((targetsRes.data ?? []) as HabitTarget[]).map((t) => ({ ...t, target: Number(t.target) }))
    logs.value = (logsRes.data ?? []) as HabitLog[]
    checkins.value = (checkinsRes.data ?? []) as DailyCheckin[]
    workoutDates.value = ((workoutsRes.data ?? []) as { date: string }[]).map((w) => w.date)
    weights.value = ((weightsRes.data ?? []) as { date: string | null; weight: number | null; is_kg: boolean | null }[])
      .filter((w) => w.date !== null && w.weight !== null)
      .map((w) => ({ date: w.date!, kg: w.is_kg === false ? w.weight! * LBS_TO_KG : w.weight! }))
    loaded.value = true
  }

  async function createHabit(input: NewHabit): Promise<Habit | null> {
    error.value = null
    const sortOrder = habits.value.reduce((max, h) => Math.max(max, h.sort_order), -1) + 1
    const { data, error: err } = await supabase
      .from('habits')
      .insert({
        name: input.name,
        why: input.why,
        kind: input.kind,
        auto_source: input.kind === 'do' ? input.auto_source : null,
        start_date: input.start_date,
        sort_order: sortOrder,
      })
      .select()
      .single()
    if (err) {
      error.value = err.message
      return null
    }
    const habit = data as Habit

    const target: HabitTarget = {
      habit_id: habit.id,
      effective_from: weekStartIso(input.start_date),
      target: input.target,
    }
    const { error: targetErr } = await supabase.from('habit_targets').insert(target)
    if (targetErr) {
      // Two inserts without a transaction: undo the first so no habit is left without a target.
      await supabase.from('habits').delete().eq('id', habit.id)
      error.value = targetErr.message
      return null
    }

    habits.value.push(habit)
    targets.value.push(target)
    return habit
  }

  async function updateHabit(id: number, patch: HabitPatch): Promise<boolean> {
    error.value = null
    const { data, error: err } = await supabase.from('habits').update(patch).eq('id', id).select().single()
    if (err) {
      error.value = err.message
      return false
    }
    habits.value = habits.value.map((h) => (h.id === id ? (data as Habit) : h))
    return true
  }

  /** Change the target from the current week on; older weeks keep theirs. */
  async function setTarget(habitId: number, target: number, today = todayLocalIso()): Promise<boolean> {
    error.value = null
    const row: HabitTarget = { habit_id: habitId, effective_from: weekStartIso(today), target }
    const { error: err } = await supabase
      .from('habit_targets')
      .upsert(row, { onConflict: 'habit_id,effective_from' })
    if (err) {
      error.value = err.message
      return false
    }
    targets.value = [
      ...targets.value.filter((t) => !(t.habit_id === habitId && t.effective_from === row.effective_from)),
      row,
    ]
    return true
  }

  async function setArchived(id: number, archived: boolean): Promise<boolean> {
    error.value = null
    const { data, error: err } = await supabase
      .from('habits')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single()
    if (err) {
      error.value = err.message
      return false
    }
    habits.value = habits.value.map((h) => (h.id === id ? (data as Habit) : h))
    return true
  }

  async function deleteHabit(id: number): Promise<boolean> {
    error.value = null
    const { error: err } = await supabase.from('habits').delete().eq('id', id)
    if (err) {
      error.value = err.message
      return false
    }
    habits.value = habits.value.filter((h) => h.id !== id)
    targets.value = targets.value.filter((t) => t.habit_id !== id)
    logs.value = logs.value.filter((l) => l.habit_id !== id)
    return true
  }

  async function reorderHabits(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const items = [...activeHabits.value]
    const [moved] = items.splice(fromIndex, 1)
    if (!moved) return
    items.splice(toIndex, 0, moved)

    const previous = habits.value
    const orderById = new Map(items.map((h, i) => [h.id, i]))
    habits.value = habits.value.map((h) => (orderById.has(h.id) ? { ...h, sort_order: orderById.get(h.id)! } : h))

    const results = await Promise.all(
      items.map((h, i) => supabase.from('habits').update({ sort_order: i }).eq('id', h.id).select('id')),
    )
    const err = results.find((r) => r.error)?.error
    const missing = results.some((r) => !r.error && !r.data?.length)
    if (err || missing) {
      error.value = err?.message ?? 'Volgorde opslaan mislukt'
      habits.value = previous
    }
  }

  // Writes to the same cell run one after another, so quick double taps reach
  // the database in the order they were made.
  const writeQueues = new Map<string, Promise<void>>()
  function enqueue(key: string, write: () => Promise<void>): Promise<void> {
    const next = (writeQueues.get(key) ?? Promise.resolve()).then(write).catch((e: unknown) => {
      error.value = e instanceof Error ? e.message : String(e)
    })
    writeQueues.set(key, next)
    void next.finally(() => {
      if (writeQueues.get(key) === next) writeQueues.delete(key)
    })
    return next
  }

  function putLog(habitId: number, date: string, done: boolean | undefined) {
    const rest = logs.value.filter((l) => !(l.habit_id === habitId && l.date === date))
    logs.value = done === undefined ? rest : [...rest, { habit_id: habitId, date, done }]
  }

  /**
   * Set (or with `done: null`, clear) an explicit log. Optimistic: the screen
   * updates first; a failed write is rolled back unless a newer tap replaced it.
   */
  async function setLog(habitId: number, date: string, done: boolean | null) {
    error.value = null
    const previous = logsByHabit.value.get(habitId)?.get(date)
    const next = done ?? undefined
    putLog(habitId, date, next)

    await enqueue(`${habitId}:${date}`, async () => {
      const { error: err } =
        done === null
          ? await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date)
          : await supabase.from('habit_logs').upsert({ habit_id: habitId, date, done }, { onConflict: 'habit_id,date' })
      if (err) {
        error.value = err.message
        if (logsByHabit.value.get(habitId)?.get(date) === next) putLog(habitId, date, previous)
      }
    })
  }

  /** Flip a day of a 'do'/'avoid' habit. No-op for days that can't be logged. */
  async function toggleDay(habit: Habit, date: string, today = todayLocalIso()) {
    const day = habitDay(habit, date, today, historyFor(habit))
    if (day.done === null) return
    await setLog(habit.id, date, !day.done)
  }

  /** 'weight' habits: cycle a week through automatic → achieved → missed → automatic. */
  async function cycleWeekOverride(habit: Habit, weekStart: string) {
    const current = logsByHabit.value.get(habit.id)?.get(weekStart)
    const next = current === undefined ? true : current ? false : null
    await setLog(habit.id, weekStart, next)
  }

  async function upsertCheckin(date: string, fields: { happiness?: number | null; journal?: string | null }) {
    error.value = null
    const { error: err } = await supabase
      .from('daily_checkins')
      .upsert({ date, ...fields }, { onConflict: 'user_id,date' })
    if (err) {
      error.value = err.message
      return false
    }
    return true
  }

  async function saveHappiness(date: string, happiness: number | null) {
    const previous = checkinFor(date)
    checkins.value = [...checkins.value.filter((c) => c.date !== date), { date, happiness }]
    const ok = await upsertCheckin(date, { happiness })
    if (!ok) {
      checkins.value = checkins.value.filter((c) => c.date !== date)
      if (previous) checkins.value.push(previous)
    }
  }

  /** The journal is only fetched for the day on screen, never in bulk. */
  async function loadJournal(date: string): Promise<string> {
    const { data, error: err } = await supabase
      .from('daily_checkins')
      .select('journal')
      .eq('date', date)
      .maybeSingle()
    if (err) {
      error.value = err.message
      return ''
    }
    return (data as { journal: string | null } | null)?.journal ?? ''
  }

  async function saveJournal(date: string, text: string): Promise<boolean> {
    const journal = text.trim() || null
    const ok = await upsertCheckin(date, { journal })
    if (ok && !checkinFor(date)) checkins.value = [...checkins.value, { date, happiness: null }]
    return ok
  }

  return {
    habits,
    targets,
    logs,
    checkins,
    workoutDates,
    weights,
    loading,
    loaded,
    error,
    activeHabits,
    archivedHabits,
    historyFor,
    weeksFor,
    weekFor,
    checkinFor,
    load,
    createHabit,
    updateHabit,
    setTarget,
    setArchived,
    deleteHabit,
    reorderHabits,
    setLog,
    toggleDay,
    cycleWeekOverride,
    saveHappiness,
    loadJournal,
    saveJournal,
  }
})
