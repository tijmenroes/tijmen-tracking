import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHabitsStore } from '@/stores/habits'
import type { Habit } from '@/types/habits'

type Result = { data: unknown; error: { message: string } | null }

/**
 * Minimal Supabase stand-in: every query builder method is chainable and
 * recorded; the chain is a promise that resolves to the result registered for
 * "<table>.<operation>" (or an empty success).
 */
const db = vi.hoisted(() => {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []
  const results = new Map<string, Result | (() => Promise<Result>)>()

  function from(table: string) {
    let op: string | null = null
    // The result is picked a microtask later, after the chain has named its operation.
    const query = new Promise<Result>((resolve) => {
      queueMicrotask(() => {
        const registered = results.get(`${table}.${op ?? 'select'}`)
        resolve(typeof registered === 'function' ? registered() : (registered ?? { data: [], error: null }))
      })
    })
    const builder = query as Promise<Result> & Record<string, unknown>
    for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order', 'single', 'maybeSingle']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        if (['insert', 'update', 'upsert', 'delete'].includes(method)) op = method
        else if (method === 'select' && op === null) op = 'select'
        return builder
      }
    }
    return builder
  }

  return { calls, results, from }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => db.from(table) } }))

function callsTo(table: string, method: string) {
  return db.calls.filter((c) => c.table === table && c.method === method).map((c) => c.args)
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    user_id: 'user-1',
    name: 'Sporten',
    why: null,
    kind: 'do',
    auto_source: null,
    start_date: '2026-10-05',
    sort_order: 0,
    archived_at: null,
    created_at: '2026-10-05T08:00:00Z',
    ...overrides,
  }
}

function deferred() {
  let resolve!: (r: Result) => void
  const promise = new Promise<Result>((r) => (resolve = r))
  return { promise, resolve }
}

describe('habits store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    db.calls.length = 0
    db.results.clear()
  })

  describe('load', () => {
    it('loads every table once and converts pounds to kilograms', async () => {
      db.results.set('habits.select', { data: [makeHabit()], error: null })
      db.results.set('habit_targets.select', {
        data: [{ habit_id: 1, effective_from: '2026-10-05', target: '4' }],
        error: null,
      })
      db.results.set('workouts.select', { data: [{ date: '2026-10-06' }], error: null })
      db.results.set('Weight.select', {
        data: [
          { date: '2026-10-06', weight: 80, is_kg: true },
          { date: '2026-10-07', weight: 176, is_kg: false },
          { date: null, weight: 81, is_kg: true },
        ],
        error: null,
      })

      const store = useHabitsStore()
      await store.load()
      await store.load()

      expect(callsTo('habits', 'select')).toHaveLength(1)
      expect(store.targets).toEqual([{ habit_id: 1, effective_from: '2026-10-05', target: 4 }])
      expect(store.workoutDates).toEqual(['2026-10-06'])
      expect(store.weights).toHaveLength(2)
      expect(store.weights[1]!.kg).toBeCloseTo(79.83, 2)
      // Only saved workouts count.
      expect(callsTo('workouts', 'eq')).toContainEqual(['status', 'saved'])
    })

    it('stops with an error when a query fails', async () => {
      db.results.set('habit_logs.select', { data: null, error: { message: 'kapot' } })
      const store = useHabitsStore()
      await store.load()
      expect(store.error).toBe('kapot')
      expect(store.loaded).toBe(false)
    })
  })

  describe('createHabit', () => {
    const input = {
      name: 'Sporten',
      why: null,
      kind: 'do' as const,
      auto_source: 'workouts' as const,
      start_date: '2026-10-07',
      target: 4,
    }

    it('inserts the habit and its first target from the start week', async () => {
      db.results.set('habits.insert', { data: makeHabit({ id: 7, start_date: '2026-10-07' }), error: null })
      const store = useHabitsStore()

      const created = await store.createHabit(input)

      expect(created?.id).toBe(7)
      expect(callsTo('habit_targets', 'insert')).toEqual([
        [{ habit_id: 7, effective_from: '2026-10-05', target: 4 }],
      ])
      expect(store.activeHabits.map((h) => h.id)).toEqual([7])
    })

    it('removes the habit again when the target cannot be saved', async () => {
      db.results.set('habits.insert', { data: makeHabit({ id: 7 }), error: null })
      db.results.set('habit_targets.insert', { data: null, error: { message: 'nee' } })
      const store = useHabitsStore()

      expect(await store.createHabit(input)).toBeNull()
      expect(callsTo('habits', 'delete')).toHaveLength(1)
      expect(callsTo('habits', 'eq')).toContainEqual(['id', 7])
      expect(store.habits).toEqual([])
      expect(store.error).toBe('nee')
    })

    it('never stores an auto source on non-do habits', async () => {
      db.results.set('habits.insert', { data: makeHabit({ kind: 'avoid' }), error: null })
      await useHabitsStore().createHabit({ ...input, kind: 'avoid' })
      expect(callsTo('habits', 'insert')[0]![0]).toMatchObject({ kind: 'avoid', auto_source: null })
    })
  })

  describe('setTarget', () => {
    it('upserts the target from the current week and replaces a same-week change', async () => {
      const store = useHabitsStore()
      store.targets = [
        { habit_id: 1, effective_from: '2026-10-05', target: 4 },
        { habit_id: 1, effective_from: '2026-10-26', target: 3 },
      ]

      await store.setTarget(1, 2, '2026-10-29')

      expect(callsTo('habit_targets', 'upsert')).toEqual([
        [{ habit_id: 1, effective_from: '2026-10-26', target: 2 }, { onConflict: 'habit_id,effective_from' }],
      ])
      expect(store.targets).toEqual([
        { habit_id: 1, effective_from: '2026-10-05', target: 4 },
        { habit_id: 1, effective_from: '2026-10-26', target: 2 },
      ])
    })
  })

  describe('toggleDay', () => {
    const today = '2026-10-08'

    it('updates the screen before the write finishes', async () => {
      const write = deferred()
      db.results.set('habit_logs.upsert', () => write.promise)
      const store = useHabitsStore()
      const habit = makeHabit()
      store.habits = [habit]

      const pending = store.toggleDay(habit, '2026-10-06', today)
      expect(store.logs).toEqual([{ habit_id: 1, date: '2026-10-06', done: true }])

      write.resolve({ data: null, error: null })
      await pending
      expect(callsTo('habit_logs', 'upsert')).toEqual([
        [{ habit_id: 1, date: '2026-10-06', done: true }, { onConflict: 'habit_id,date' }],
      ])
    })

    it('rolls back when the write fails', async () => {
      db.results.set('habit_logs.upsert', { data: null, error: { message: 'offline' } })
      const store = useHabitsStore()
      const habit = makeHabit()
      store.habits = [habit]

      await store.toggleDay(habit, '2026-10-06', today)

      expect(store.logs).toEqual([])
      expect(store.error).toBe('offline')
    })

    it('writes an explicit uncheck to override an auto-checked day', async () => {
      const store = useHabitsStore()
      const habit = makeHabit({ auto_source: 'workouts' })
      store.habits = [habit]
      store.workoutDates = ['2026-10-06']

      await store.toggleDay(habit, '2026-10-06', today)

      expect(store.logs).toEqual([{ habit_id: 1, date: '2026-10-06', done: false }])
      expect(store.weekFor(habit, '2026-10-05', today).value).toBe(0)
    })

    it('ignores future days', async () => {
      const store = useHabitsStore()
      const habit = makeHabit()
      await store.toggleDay(habit, '2026-10-09', today)
      expect(db.calls).toEqual([])
    })

    it('sends quick double taps to the database in order', async () => {
      const first = deferred()
      const order: boolean[] = []
      db.results.set('habit_logs.upsert', () => {
        const upserts = callsTo('habit_logs', 'upsert')
        const done = (upserts[upserts.length - 1]![0] as { done: boolean }).done
        order.push(done)
        return order.length === 1 ? first.promise : Promise.resolve({ data: null, error: null })
      })
      const store = useHabitsStore()
      const habit = makeHabit()
      store.habits = [habit]

      const tap1 = store.toggleDay(habit, '2026-10-06', today)
      const tap2 = store.toggleDay(habit, '2026-10-06', today)
      await new Promise((resolve) => setTimeout(resolve))
      // The second write waits for the first one to finish.
      expect(order).toEqual([true])

      first.resolve({ data: null, error: null })
      await Promise.all([tap1, tap2])
      expect(order).toEqual([true, false])
      expect(store.logs).toEqual([{ habit_id: 1, date: '2026-10-06', done: false }])
    })
  })

  describe('cycleWeekOverride', () => {
    it('cycles automatic → achieved → missed → automatic', async () => {
      const store = useHabitsStore()
      const habit = makeHabit({ kind: 'weight' })
      store.habits = [habit]

      await store.cycleWeekOverride(habit, '2026-10-05')
      expect(store.logs).toEqual([{ habit_id: 1, date: '2026-10-05', done: true }])
      await store.cycleWeekOverride(habit, '2026-10-05')
      expect(store.logs).toEqual([{ habit_id: 1, date: '2026-10-05', done: false }])
      await store.cycleWeekOverride(habit, '2026-10-05')
      expect(store.logs).toEqual([])
      expect(callsTo('habit_logs', 'delete')).toHaveLength(1)
    })
  })

  describe('check-ins', () => {
    it('saves happiness optimistically, keyed on the date', async () => {
      const store = useHabitsStore()
      await store.saveHappiness('2026-10-06', 7)
      expect(store.checkinFor('2026-10-06')).toEqual({ date: '2026-10-06', happiness: 7 })
      expect(callsTo('daily_checkins', 'upsert')).toEqual([
        [{ date: '2026-10-06', happiness: 7 }, { onConflict: 'user_id,date' }],
      ])
    })

    it('restores the previous happiness when saving fails', async () => {
      db.results.set('daily_checkins.upsert', { data: null, error: { message: 'offline' } })
      const store = useHabitsStore()
      store.checkins = [{ date: '2026-10-06', happiness: 5 }]
      await store.saveHappiness('2026-10-06', 8)
      expect(store.checkinFor('2026-10-06')?.happiness).toBe(5)
    })

    it('saves an empty journal as null and registers the check-in', async () => {
      const store = useHabitsStore()
      await store.saveJournal('2026-10-06', '   ')
      expect(callsTo('daily_checkins', 'upsert')[0]![0]).toEqual({ date: '2026-10-06', journal: null })
      expect(store.checkinFor('2026-10-06')).toBeDefined()
    })
  })

  describe('reorderHabits', () => {
    it('renumbers the active habits in their new order', async () => {
      db.results.set('habits.update', { data: [{ id: 0 }], error: null })
      const store = useHabitsStore()
      store.habits = [
        makeHabit({ id: 1, sort_order: 0 }),
        makeHabit({ id: 2, sort_order: 1 }),
        makeHabit({ id: 3, sort_order: 2 }),
      ]

      await store.reorderHabits(2, 0)

      expect(store.activeHabits.map((h) => h.id)).toEqual([3, 1, 2])
      expect(callsTo('habits', 'update')).toEqual([[{ sort_order: 0 }], [{ sort_order: 1 }], [{ sort_order: 2 }]])
    })
  })
})
