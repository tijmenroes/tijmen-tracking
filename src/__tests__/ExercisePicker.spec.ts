import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExercisePicker from '@/components/ExercisePicker.vue'
import { useExercisesStore } from '@/stores/exercises'
import type { Exercise, Tag } from '@/types/fitness'

const back = { id: 1, name: 'back', created_at: 'x' }
const biceps = { id: 2, name: 'biceps', created_at: 'x' }
const chest = { id: 3, name: 'chest', created_at: 'x' }

const tags: Tag[] = [back, biceps, chest]

const exercises: Exercise[] = [
  { id: 10, name: 'Row', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [back, biceps] },
  { id: 11, name: 'Bench', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [chest] },
  { id: 12, name: 'Curl', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [biceps] },
  { id: 13, name: 'Romanian Deadlift', type: 'strength', notes: null, aliases: ['RDL'], created_by: null, created_at: 'x', tags: [] },
]

function mountPicker(exerciseList = exercises) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useExercisesStore()
  store.usageCounts = new Map([
    [10, 5],
    [11, 2],
    [12, 8],
    [13, 0],
  ])
  vi.spyOn(store, 'fetchUsageCounts').mockResolvedValue(undefined)
  return mount(ExercisePicker, {
    props: { exercises: exerciseList, tags, loading: false },
    global: { plugins: [pinia] },
  })
}

function visibleNames(wrapper: ReturnType<typeof mountPicker>) {
  return wrapper.findAll('.picker-list__name').map((n) => n.text())
}

describe('ExercisePicker filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows all exercises when no tag filter is selected', () => {
    const wrapper = mountPicker()
    expect(visibleNames(wrapper)).toEqual(['Bench', 'Curl', 'Romanian Deadlift', 'Row'])
  })

  it('searches by alias (case-insensitive)', async () => {
    const wrapper = mountPicker()
    await wrapper.find('.exercise-filter__search').setValue('rdl')
    expect(visibleNames(wrapper)).toEqual(['Romanian Deadlift'])
  })

  it('searches by name substring', async () => {
    const wrapper = mountPicker()
    await wrapper.find('.exercise-filter__search').setValue('ben')
    expect(visibleNames(wrapper)).toEqual(['Bench'])
  })

  it('combines search with tag filter (AND)', async () => {
    const wrapper = mountPicker()
    await wrapper.find('.exercise-filter__search').setValue('r') // Row + Romanian Deadlift
    await wrapper.find('.exercise-filter__select').setValue(String(back.id))
    expect(visibleNames(wrapper)).toEqual(['Row'])
  })

  it('filters by a single tag via select', async () => {
    const wrapper = mountPicker()
    await wrapper.find('.exercise-filter__select').setValue(String(chest.id))
    expect(visibleNames(wrapper)).toEqual(['Bench'])
  })

  it('shows an empty state when a filter matches nothing', async () => {
    const wrapper = mountPicker()
    await wrapper.find('.exercise-filter__search').setValue('zzzzz')
    expect(wrapper.find('.picker-sheet__empty').text()).toContain('Geen oefeningen')
  })

  it('sorts by frequency and shows usage counts', async () => {
    const wrapper = mountPicker()
    const sortSelect = wrapper.findAll('.exercise-filter__select')[1]!
    await sortSelect.setValue('frequency')
    expect(visibleNames(wrapper)).toEqual(['Curl', 'Row', 'Bench', 'Romanian Deadlift'])
    expect(wrapper.findAll('.picker-list__count').map((n) => n.text())).toEqual(['8', '5', '2', '0'])
  })
})

describe('ExercisePicker multi-select', () => {
  it('toggles selection on item click', async () => {
    const wrapper = mountPicker()
    await wrapper.findAll('.picker-list__item')[0]!.trigger('click')
    await wrapper.findAll('.picker-list__item')[1]!.trigger('click')
    expect(wrapper.find('.picker-sheet__confirm').text()).toBe('Toevoegen (2)')
  })

  it('emits confirm with selected exercises in selection order', async () => {
    const wrapper = mountPicker()
    const items = wrapper.findAll('.picker-list__item')
    const curl = items.find((item) => item.text().includes('Curl'))!
    const row = items.find((item) => item.text().includes('Row'))!
    await curl.trigger('click')
    await row.trigger('click')
    await wrapper.find('.picker-sheet__confirm').trigger('click')

    const emitted = wrapper.emitted('confirm')?.[0]?.[0] as Exercise[]
    expect(emitted.map((e) => e.name)).toEqual(['Curl', 'Row'])
  })

  it('emits confirm with empty list when closed without selection', async () => {
    const wrapper = mountPicker()
    await wrapper.find('.picker-sheet__close').trigger('click')
    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual([])
  })

  it('deselects on second click', async () => {
    const wrapper = mountPicker()
    const row = wrapper.findAll('.picker-list__item').find((item) => item.text().includes('Row'))!
    await row.trigger('click')
    await row.trigger('click')
    expect(wrapper.find('.picker-sheet__confirm').text()).toBe('Toevoegen')
  })
})
