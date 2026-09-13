import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import WorkoutExportView from '@/views/WorkoutExportView.vue'
import type { AiExportPayload } from '@/utils/aiExport'

const mockPush = vi.fn<(path: string) => void>()
const mockGenerate =
  vi.fn<(from: string, to: string, userNotes: string | null) => Promise<AiExportPayload | null>>()
const mockCopyJson = vi.fn<(json: string) => Promise<boolean>>()
const mockDownloadJson = vi.fn<(json: string, filename: string) => void>()

const payload = ref<AiExportPayload | null>(null)
const generating = ref(false)
const error = ref<string | null>(null)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/useAiExport', () => ({
  useAiExport: () => ({ payload, generating, error, generate: mockGenerate }),
  copyJson: (json: string) => mockCopyJson(json),
  downloadJson: (json: string, filename: string) => mockDownloadJson(json, filename),
  exportFilename: (from: string, to: string) => `fitness-export_${from}_${to}.json`,
}))

function samplePayload(): AiExportPayload {
  return {
    schema_version: 1,
    generated_at: '2026-09-13T08:00:00.000Z',
    export_type: 'fitness_history',
    reading_guide: { units: 'kg' },
    question: null,
    user_notes: null,
    athlete: { goals: null, notes: null },
    date_range: { from: '2026-06-13', to: '2026-09-13' },
    summary: {
      workout_count: 2,
      exercise_session_count: 3,
      set_count: 9,
      distinct_exercises: 3,
    },
    body_weight: {
      unit: 'kg',
      first_kg: 84,
      last_kg: 82,
      min_kg: 82,
      max_kg: 84,
      change_kg: -2,
      entries: [
        { date: '2026-06-13', weight_kg: 84 },
        { date: '2026-09-13', weight_kg: 82 },
      ],
    },
    workouts: [],
  }
}

function isoDaysFromToday(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('WorkoutExportView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    payload.value = null
    generating.value = false
    error.value = null
    mockGenerate.mockResolvedValue(null)
    mockCopyJson.mockResolvedValue(true)
  })

  it('defaults the range to the last three months up to today', () => {
    const wrapper = mount(WorkoutExportView)
    const inputs = wrapper.findAll('input[type="date"]')

    expect((inputs[0]!.element as HTMLInputElement).value).toBe(isoDaysFromToday(3))
    expect((inputs[1]!.element as HTMLInputElement).value).toBe(isoDaysFromToday(0))
  })

  it('shows no result card before generating', () => {
    const wrapper = mount(WorkoutExportView)

    expect(wrapper.find('.wexport__preview').exists()).toBe(false)
    expect(wrapper.find('.wexport__actions').exists()).toBe(false)
  })

  it('passes the range and the notes to generate', async () => {
    const wrapper = mount(WorkoutExportView)
    const inputs = wrapper.findAll('input[type="date"]')
    await inputs[0]!.setValue('2026-01-01')
    await inputs[1]!.setValue('2026-03-01')
    await wrapper.find('textarea').setValue('Bulk vanaf maart')

    await wrapper.find('.wexport__generate').trigger('click')

    expect(mockGenerate).toHaveBeenCalledWith('2026-01-01', '2026-03-01', 'Bulk vanaf maart')
  })

  it('sends null instead of an empty string when no notes were typed', async () => {
    const wrapper = mount(WorkoutExportView)

    await wrapper.find('.wexport__generate').trigger('click')

    expect(mockGenerate).toHaveBeenCalledWith(expect.any(String), expect.any(String), null)
  })

  it('blocks generating when the end date is before the start date', async () => {
    const wrapper = mount(WorkoutExportView)
    const inputs = wrapper.findAll('input[type="date"]')
    await inputs[0]!.setValue('2026-05-01')
    await inputs[1]!.setValue('2026-04-01')

    const button = wrapper.find('.wexport__generate')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('De einddatum ligt voor de begindatum')
  })

  it('applies a preset to both dates', async () => {
    const wrapper = mount(WorkoutExportView)

    await wrapper.findAll('.wexport__preset')[0]!.trigger('click')

    const inputs = wrapper.findAll('input[type="date"]')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe(isoDaysFromToday(1))
    expect((inputs[1]!.element as HTMLInputElement).value).toBe(isoDaysFromToday(0))
  })

  it('renders the summary and a JSON preview once a payload exists', async () => {
    const wrapper = mount(WorkoutExportView)
    payload.value = samplePayload()
    await flushPromises()

    expect(wrapper.text()).toContain('2 workouts')
    expect(wrapper.text()).toContain('9 sets')
    expect(wrapper.text()).toContain('2 wegingen')
    expect(wrapper.find('.wexport__preview').text()).toContain('"schema_version": 1')
  })

  it('copies the full JSON and reports success', async () => {
    const wrapper = mount(WorkoutExportView)
    payload.value = samplePayload()
    await flushPromises()

    await wrapper.findAll('.wexport__action')[0]!.trigger('click')
    await flushPromises()

    expect(mockCopyJson).toHaveBeenCalledWith(JSON.stringify(samplePayload(), null, 2))
    expect(wrapper.text()).toContain('Gekopieerd')
  })

  it('explains the fallback when the clipboard is blocked', async () => {
    mockCopyJson.mockResolvedValue(false)
    const wrapper = mount(WorkoutExportView)
    payload.value = samplePayload()
    await flushPromises()

    await wrapper.findAll('.wexport__action')[0]!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('geblokkeerd door de browser')
  })

  it('downloads under a filename carrying the range', async () => {
    const wrapper = mount(WorkoutExportView)
    payload.value = samplePayload()
    await flushPromises()

    await wrapper.findAll('.wexport__action')[1]!.trigger('click')

    expect(mockDownloadJson).toHaveBeenCalledWith(
      expect.stringContaining('"schema_version": 1'),
      `fitness-export_${isoDaysFromToday(3)}_${isoDaysFromToday(0)}.json`,
    )
  })

  it('warns when the range holds no saved workouts', async () => {
    const empty = samplePayload()
    empty.summary.workout_count = 0
    const wrapper = mount(WorkoutExportView)
    payload.value = empty
    await flushPromises()

    expect(wrapper.text()).toContain('Geen opgeslagen workouts in deze periode')
  })

  it('surfaces an error from the composable', async () => {
    const wrapper = mount(WorkoutExportView)
    error.value = 'network down'
    await flushPromises()

    expect(wrapper.find('.wexport__error').text()).toBe('network down')
  })
})
