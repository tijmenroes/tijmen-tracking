import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import HabitsView from '@/views/HabitsView.vue'
import { useHabitsStore } from '@/stores/habits'
import type { Habit } from '@/types/habits'

const mockPush = vi.fn<(path: string) => void>()
const upserts = vi.hoisted(() => [] as unknown[][])

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Every query succeeds with no rows; upserts are recorded.
vi.mock('@/lib/supabase', () => {
  function from() {
    const builder = Promise.resolve({ data: [], error: null }) as Promise<unknown> & Record<string, unknown>
    for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle']) {
      builder[method] = () => builder
    }
    builder.upsert = (...args: unknown[]) => {
      upserts.push(args)
      return builder
    }
    return builder
  }
  return { supabase: { from } }
})

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

/** Seed the store as if load() already ran, so the view skips fetching. */
function seed(habits: Habit[]) {
  const store = useHabitsStore()
  store.habits = habits
  store.targets = habits.map((h) => ({ habit_id: h.id, effective_from: '2026-10-05', target: h.kind === 'avoid' ? 1 : 4 }))
  store.loaded = true
  return store
}

function mountView() {
  return mount(HabitsView, { global: { stubs: { HabitDayCard: true } } })
}

describe('HabitsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    upserts.length = 0
    // Wednesday 28 Oct 2026, local time; only Date is faked so promises still flush.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 28, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows seven day cells per habit; days after today are disabled', () => {
    seed([makeHabit()])
    const cells = mountView().findAll('.habit-row .cell')
    expect(cells).toHaveLength(7)
    expect(cells.map((c) => c.attributes('disabled') !== undefined)).toEqual([
      false, false, false, true, true, true, true,
    ])
  })

  it('highlights today in the day header', () => {
    seed([makeHabit()])
    expect(mountView().find('.grid__day--today').text()).toContain('28')
  })

  it('checks a day on tap and saves it', async () => {
    const store = seed([makeHabit()])
    const wrapper = mountView()

    await wrapper.findAll('.habit-row .cell')[1]!.trigger('click')
    await flushPromises()

    expect(store.logs).toEqual([{ habit_id: 1, date: '2026-10-27', done: true }])
    expect(upserts[0]![0]).toEqual({ habit_id: 1, date: '2026-10-27', done: true })
    const cell = wrapper.findAll('.habit-row .cell')[1]!
    expect(cell.text()).toBe('✓')
    expect(cell.classes()).toContain('cell--on')
    expect(wrapper.find('.habit-row__progress').text()).toBe('1/4')
  })

  it('shows elapsed days of an avoid-habit as checked by default', () => {
    seed([makeHabit({ kind: 'avoid', name: 'Geen alcohol' })])
    const symbols = mountView().findAll('.habit-row .cell').map((c) => c.text())
    expect(symbols).toEqual(['✓', '✓', '✓', '', '', '', ''])
  })

  it('shows one week cell instead of day cells for a weight goal', () => {
    seed([makeHabit({ kind: 'weight', name: 'Lean bulk' })])
    const wrapper = mountView()
    expect(wrapper.find('.weight-cell').exists()).toBe(true)
    expect(wrapper.findAll('.habit-row .cell')).toHaveLength(0)
  })

  it('shows the empty state without habits', async () => {
    seed([])
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Nog geen habits.')
    await wrapper.find('.grid__empty-btn').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/habits/new')
  })

  it('goes back a week but never past the current week', async () => {
    seed([makeHabit()])
    const wrapper = mountView()
    const [prev, next] = wrapper.findAll('.week-nav__btn')

    expect(next!.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.habits__title').text()).toBe('Deze week')

    await prev!.trigger('click')
    expect(wrapper.find('.habits__title').text()).toBe('Vorige week')
    // A past week has no future days left.
    expect(wrapper.findAll('.habit-row .cell').every((c) => c.attributes('disabled') === undefined)).toBe(true)
  })

  it('lists archived habits separately from the week grid', async () => {
    seed([makeHabit(), makeHabit({ id: 2, name: 'Oud', archived_at: '2026-10-20T10:00:00Z', sort_order: 1 })])
    const wrapper = mountView()

    expect(wrapper.findAll('.habit-row')).toHaveLength(1)
    await wrapper.find('.archived__toggle').trigger('click')
    expect(wrapper.find('.archived__list').text()).toContain('Oud')
  })
})
