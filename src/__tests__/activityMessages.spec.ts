import { describe, expect, it } from 'vitest'
import { activityMessages, renderActivityMessage } from '@/content/activityMessages'
import type { ActivityEvent } from '@/types/fitness'

function event(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 1,
    board_id: 1,
    actor_user_id: 'user-1',
    actor_nickname: 'Tijmen',
    event_type: 'workout_completed',
    workout_id: 4,
    weight_id: null,
    payload: { workout_name: 'Pull day', pr_count: 0, variant: 0 },
    occurred_at: '2026-08-18T10:00:00Z',
    created_at: '2026-08-18T10:00:00Z',
    ...overrides,
  }
}

describe('activityMessages', () => {
  it('contains ten variants for every category and all supplied examples', () => {
    expect(Object.values(activityMessages).every((messages) => messages.length === 10)).toBe(true)
    const copy = Object.values(activityMessages).flat()
    expect(copy).toEqual(expect.arrayContaining([
      'Wat een lekker ding',
      'Lekker bezig pik!',
      'Wat een kk beest',
      'Niet normaal deze vent!!',
      'Mama mia hij wordt sexy',
      'Om te smullen wordt hij',
    ]))
  })

  it('renders a named workout without PRs', () => {
    expect(renderActivityMessage(event())).toBe(
      'Tijmen heeft workout “Pull day” afgerond. Lekker bezig pik!',
    )
  })

  it('renders plural PRs with a stable selected variant', () => {
    expect(renderActivityMessage(event({
      actor_nickname: 'Jasper',
      payload: { workout_name: 'Pull day', pr_count: 3, variant: 1 },
    }))).toBe(
      "Jasper heeft workout “Pull day” afgerond 3 nieuwe PR's. Niet normaal deze vent!!",
    )
  })

  it('renders all weekly weight classifications', () => {
    expect(renderActivityMessage(event({
      event_type: 'weight_weekly',
      workout_id: null,
      weight_id: 2,
      payload: { category: 'loss', delta_kg: -1, variant: 0 },
    }))).toBe('Tijmen is 1,0 kg afgevallen deze week! Wat een lekker ding')

    expect(renderActivityMessage(event({
      event_type: 'weight_weekly',
      workout_id: null,
      weight_id: 3,
      payload: { category: 'stable', delta_kg: 0.1, variant: 0 },
    }))).toContain('stabiel gebleven')

    expect(renderActivityMessage(event({
      event_type: 'weight_weekly',
      workout_id: null,
      weight_id: 4,
      payload: { category: 'gain', delta_kg: 0.8, variant: 0 },
    }))).toContain('0,8 kg aangekomen')
  })
})
