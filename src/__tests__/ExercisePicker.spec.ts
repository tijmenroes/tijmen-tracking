import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ExercisePicker from '@/components/ExercisePicker.vue'
import type { Exercise } from '@/types/fitness'

const back = { id: 1, name: 'back', created_at: 'x' }
const biceps = { id: 2, name: 'biceps', created_at: 'x' }
const chest = { id: 3, name: 'chest', created_at: 'x' }

const exercises: Exercise[] = [
  { id: 10, name: 'Row', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [back, biceps] },
  { id: 11, name: 'Bench', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [chest] },
  { id: 12, name: 'Curl', type: 'strength', notes: null, aliases: [], created_by: null, created_at: 'x', tags: [biceps] },
  { id: 13, name: 'Romanian Deadlift', type: 'strength', notes: null, aliases: ['RDL'], created_by: null, created_at: 'x', tags: [] },
]

function visibleNames(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('.picker-list__name').map((n) => n.text())
}

describe('ExercisePicker filtering', () => {
  it('shows all exercises when no tag filter is selected', () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    expect(visibleNames(wrapper)).toEqual(['Row', 'Bench', 'Curl', 'Romanian Deadlift'])
  })

  it('searches by alias (case-insensitive)', async () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    await wrapper.find('.picker-search__input').setValue('rdl')
    expect(visibleNames(wrapper)).toEqual(['Romanian Deadlift'])
  })

  it('searches by name substring', async () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    await wrapper.find('.picker-search__input').setValue('ben')
    expect(visibleNames(wrapper)).toEqual(['Bench'])
  })

  it('combines search with tag filter (AND)', async () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    await wrapper.find('.picker-search__input').setValue('r') // Row + Romanian Deadlift
    await wrapper.findAll('.picker-filter')[0]!.trigger('click') // back → only Row has it
    expect(visibleNames(wrapper)).toEqual(['Row'])
  })

  it('lists distinct available tags sorted by name', () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    expect(wrapper.findAll('.picker-filter').map((c) => c.text())).toEqual(['back', 'biceps', 'chest'])
  })

  it('filters by a single tag', async () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    // filters are alphabetical: back, biceps, chest → click "chest"
    await wrapper.findAll('.picker-filter')[2]!.trigger('click')
    expect(visibleNames(wrapper)).toEqual(['Bench'])
  })

  it('matches ANY selected tag (union), not all', async () => {
    const wrapper = mount(ExercisePicker, { props: { exercises, loading: false } })
    const chips = wrapper.findAll('.picker-filter')
    await chips[0]!.trigger('click') // back
    await chips[2]!.trigger('click') // chest
    expect(visibleNames(wrapper)).toEqual(['Row', 'Bench'])
  })

  it('shows an empty state when a filter matches nothing', async () => {
    const noTagExercises: Exercise[] = [
      { id: 20, name: 'Mystery', type: 'strength', notes: null, created_by: null, created_at: 'x', tags: [back] },
    ]
    const wrapper = mount(ExercisePicker, { props: { exercises: noTagExercises, loading: false } })
    await wrapper.findAll('.picker-filter')[0]!.trigger('click') // back → matches
    expect(visibleNames(wrapper)).toEqual(['Mystery'])
  })
})
