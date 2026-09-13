import { describe, it, expect } from 'vitest'
import { buildAiExport, type BuildAiExportInput, type RawWorkoutRow } from '@/utils/aiExport'

function strengthSet(set_number: number, weight_kg: number | null, reps: number | null) {
  return { set_number, weight_kg, reps, duration_seconds: null, distance_km: null }
}

function workout(overrides: Partial<RawWorkoutRow> = {}): RawWorkoutRow {
  return {
    date: '2026-07-01',
    name: 'Push A',
    notes: null,
    template: null,
    workout_exercises: [
      {
        sort_order: 0,
        notes: null,
        pain_scale: null,
        exercise: { name: 'Bench Press', type: 'strength', notes: null, tags: [{ name: 'chest' }] },
        exercise_sets: [strengthSet(1, 80, 8)],
      },
    ],
    ...overrides,
  }
}

function input(overrides: Partial<BuildAiExportInput> = {}): BuildAiExportInput {
  return {
    from: '2026-06-01',
    to: '2026-09-01',
    workouts: [],
    weights: [],
    profile: { goals: null, notes: null, llm_prompt: null },
    userNotes: null,
    generatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('buildAiExport', () => {
  it('carries the range, profile context and generated timestamp', () => {
    const result = buildAiExport(
      input({
        profile: { goals: '  Bulk  ', notes: 'Left shoulder', llm_prompt: 'Act as a coach' },
        userNotes: '  Cut afgerond  ',
      }),
    )

    expect(result.schema_version).toBe(1)
    expect(result.generated_at).toBe('2026-09-01T10:00:00.000Z')
    expect(result.date_range).toEqual({ from: '2026-06-01', to: '2026-09-01' })
    expect(result.question).toBe('Act as a coach')
    expect(result.user_notes).toBe('Cut afgerond')
    expect(result.athlete).toEqual({ goals: 'Bulk', notes: 'Left shoulder' })
    expect(result.reading_guide.pain_scale).toContain('1')
  })

  it('turns blank profile and note fields into null', () => {
    const result = buildAiExport(
      input({ profile: { goals: '   ', notes: '', llm_prompt: null }, userNotes: '  ' }),
    )

    expect(result.question).toBeNull()
    expect(result.user_notes).toBeNull()
    expect(result.athlete).toEqual({ goals: null, notes: null })
  })

  it('shapes a strength exercise with sorted tags and sets', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({
            workout_exercises: [
              {
                sort_order: 0,
                notes: ' Voelde zwaar ',
                pain_scale: 3,
                exercise: {
                  name: 'Barbell Row',
                  type: 'strength',
                  notes: 'Keep back flat',
                  tags: [{ name: 'lats' }, { name: 'back' }],
                },
                exercise_sets: [strengthSet(2, 70, 8), strengthSet(1, 60, 10)],
              },
            ],
          }),
        ],
      }),
    )

    const exercise = result.workouts[0]!.exercises[0]!
    expect(exercise.name).toBe('Barbell Row')
    expect(exercise.muscle_groups).toEqual(['back', 'lats'])
    expect(exercise.exercise_notes).toBe('Keep back flat')
    expect(exercise.session_notes).toBe('Voelde zwaar')
    expect(exercise.pain_scale).toBe(3)
    expect(exercise.sets).toEqual([
      { set: 1, weight_kg: 60, reps: 10 },
      { set: 2, weight_kg: 70, reps: 8 },
    ])
  })

  it('reports endurance sets with time and distance instead of load', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({
            workout_exercises: [
              {
                sort_order: 0,
                notes: null,
                pain_scale: null,
                exercise: { name: 'Running', type: 'endurance', notes: null, tags: [] },
                exercise_sets: [
                  {
                    set_number: 1,
                    weight_kg: null,
                    reps: null,
                    duration_seconds: 1800,
                    distance_km: 5.2,
                  },
                ],
              },
            ],
          }),
        ],
      }),
    )

    expect(result.workouts[0]!.exercises[0]!.sets).toEqual([
      { set: 1, duration_seconds: 1800, distance_km: 5.2 },
    ])
  })

  it('drops sets where nothing was logged', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({
            workout_exercises: [
              {
                sort_order: 0,
                notes: null,
                pain_scale: null,
                exercise: { name: 'Squat', type: 'strength', notes: null, tags: [] },
                exercise_sets: [strengthSet(1, 100, 5), strengthSet(2, null, null)],
              },
            ],
          }),
        ],
      }),
    )

    expect(result.workouts[0]!.exercises[0]!.sets).toEqual([{ set: 1, weight_kg: 100, reps: 5 }])
  })

  it('drops an exercise without sets, notes or pain, and the workout if nothing remains', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({
            workout_exercises: [
              {
                sort_order: 0,
                notes: null,
                pain_scale: null,
                exercise: { name: 'Squat', type: 'strength', notes: null, tags: [] },
                exercise_sets: [],
              },
            ],
          }),
        ],
      }),
    )

    expect(result.workouts).toEqual([])
    expect(result.summary.workout_count).toBe(0)
  })

  it('keeps an exercise without sets when the user logged a note or pain', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({
            workout_exercises: [
              {
                sort_order: 0,
                notes: null,
                pain_scale: 7,
                exercise: { name: 'Overhead Press', type: 'strength', notes: null, tags: [] },
                exercise_sets: [],
              },
            ],
          }),
        ],
      }),
    )

    expect(result.workouts[0]!.exercises[0]).toMatchObject({ pain_scale: 7, sets: [] })
  })

  it('orders exercises by sort_order and workouts by date', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({ date: '2026-07-10', name: 'B' }),
          workout({
            date: '2026-07-02',
            name: 'A',
            workout_exercises: [
              {
                sort_order: 2,
                notes: null,
                pain_scale: null,
                exercise: { name: 'Second', type: 'strength', notes: null, tags: [] },
                exercise_sets: [strengthSet(1, 40, 10)],
              },
              {
                sort_order: 1,
                notes: null,
                pain_scale: null,
                exercise: { name: 'First', type: 'strength', notes: null, tags: [] },
                exercise_sets: [strengthSet(1, 40, 10)],
              },
            ],
          }),
        ],
      }),
    )

    expect(result.workouts.map((w) => w.date)).toEqual(['2026-07-02', '2026-07-10'])
    expect(result.workouts[0]!.exercises.map((e) => e.name)).toEqual(['First', 'Second'])
  })

  it('falls back to the template name when the workout is unnamed', () => {
    const result = buildAiExport(
      input({ workouts: [workout({ name: null, template: { name: 'Pull B' } })] }),
    )

    expect(result.workouts[0]!.name).toBe('Pull B')
  })

  it('counts workouts, exercise sessions, sets and distinct exercises', () => {
    const result = buildAiExport(
      input({
        workouts: [
          workout({ date: '2026-07-01' }),
          workout({
            date: '2026-07-03',
            workout_exercises: [
              {
                sort_order: 0,
                notes: null,
                pain_scale: null,
                exercise: { name: 'Bench Press', type: 'strength', notes: null, tags: [] },
                exercise_sets: [strengthSet(1, 82.5, 8), strengthSet(2, 82.5, 7)],
              },
              {
                sort_order: 1,
                notes: null,
                pain_scale: null,
                exercise: { name: 'Dips', type: 'strength', notes: null, tags: [] },
                exercise_sets: [strengthSet(1, 0, 12)],
              },
            ],
          }),
        ],
      }),
    )

    expect(result.summary).toEqual({
      workout_count: 2,
      exercise_session_count: 3,
      set_count: 4,
      distinct_exercises: 2,
    })
  })

  it('summarises body weight over the range', () => {
    const result = buildAiExport(
      input({
        weights: [
          { date: '2026-08-01', weight: 80.5 },
          { date: '2026-06-01', weight: 84 },
          { date: '2026-07-01', weight: 85.2 },
          { date: null, weight: 70 },
          { date: '2026-07-15', weight: null },
        ],
      }),
    )

    expect(result.body_weight.entries).toEqual([
      { date: '2026-06-01', weight_kg: 84 },
      { date: '2026-07-01', weight_kg: 85.2 },
      { date: '2026-08-01', weight_kg: 80.5 },
    ])
    expect(result.body_weight.first_kg).toBe(84)
    expect(result.body_weight.last_kg).toBe(80.5)
    expect(result.body_weight.min_kg).toBe(80.5)
    expect(result.body_weight.max_kg).toBe(85.2)
    expect(result.body_weight.change_kg).toBe(-3.5)
  })

  it('returns an empty body weight block when nothing was weighed', () => {
    const result = buildAiExport(input())

    expect(result.body_weight).toEqual({
      unit: 'kg',
      first_kg: null,
      last_kg: null,
      min_kg: null,
      max_kg: null,
      change_kg: null,
      entries: [],
    })
  })
})
