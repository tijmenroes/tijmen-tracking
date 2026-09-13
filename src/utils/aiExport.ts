/**
 * Builds the JSON payload for the "Exporteer voor AI" screen.
 *
 * The payload is meant to be pasted straight into a chat with a language model,
 * so it is written for a reader that has never seen this app: every field name
 * says what it holds, units are in the key name (`weight_kg`, `duration_seconds`)
 * and a small `reading_guide` explains the handful of fields that are not
 * self-evident.
 *
 * Everything here is pure — the Supabase round-trips live in
 * `@/composables/useAiExport`. That split keeps the shaping rules (which sets
 * count as empty, how a strength set differs from an endurance set) testable
 * without a database.
 */

/** Raw rows as they come back from the nested Supabase select. */
export interface RawSetRow {
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  distance_km: number | null
}

export interface RawWorkoutExerciseRow {
  sort_order: number
  notes: string | null
  pain_scale: number | null
  exercise: {
    name: string
    type: string
    notes: string | null
    tags?: { name: string }[] | null
  } | null
  exercise_sets?: RawSetRow[] | null
}

export interface RawWorkoutRow {
  date: string
  name: string | null
  notes: string | null
  template?: { name: string } | null
  workout_exercises?: RawWorkoutExerciseRow[] | null
}

export interface RawWeightRow {
  date: string | null
  weight: number | null
}

export interface BuildAiExportInput {
  from: string
  to: string
  workouts: RawWorkoutRow[]
  weights: RawWeightRow[]
  profile: {
    goals: string | null
    notes: string | null
    llm_prompt: string | null
  }
  /** Free-text the user typed on the export screen for this specific export. */
  userNotes: string | null
  /** Injected so the output is deterministic in tests. */
  generatedAt?: string
}

/** A strength set carries load × reps, an endurance set time × distance. */
export type ExportSet =
  | { set: number; weight_kg: number | null; reps: number | null }
  | { set: number; duration_seconds: number | null; distance_km: number | null }

export interface ExportExercise {
  name: string
  /** 'strength' → weight_kg + reps, 'endurance' → duration_seconds + distance_km. */
  type: string
  /** Tags from the catalogue, e.g. ["back", "lats", "compound"]. */
  muscle_groups: string[]
  /** Catalogue-level note about the exercise itself. */
  exercise_notes: string | null
  /** Note the user wrote during this specific session. */
  session_notes: string | null
  /** 1 (barely noticeable) – 10 (severe), null when no pain was logged. */
  pain_scale: number | null
  sets: ExportSet[]
}

export interface ExportWorkout {
  date: string
  name: string | null
  notes: string | null
  exercises: ExportExercise[]
}

export interface ExportBodyWeight {
  unit: 'kg'
  first_kg: number | null
  last_kg: number | null
  min_kg: number | null
  max_kg: number | null
  change_kg: number | null
  entries: { date: string; weight_kg: number }[]
}

export interface AiExportPayload {
  schema_version: number
  generated_at: string
  export_type: 'fitness_history'
  reading_guide: Record<string, string>
  question: string | null
  user_notes: string | null
  athlete: {
    goals: string | null
    notes: string | null
  }
  date_range: { from: string; to: string }
  summary: {
    workout_count: number
    exercise_session_count: number
    set_count: number
    distinct_exercises: number
  }
  body_weight: ExportBodyWeight
  workouts: ExportWorkout[]
}

const SCHEMA_VERSION = 1

/**
 * Explains the fields a model cannot infer from the name alone. Kept short on
 * purpose: every line here is context the model pays for in tokens.
 */
const READING_GUIDE: Record<string, string> = {
  export_type: 'Strength/endurance training log exported from a personal fitness tracker.',
  units: 'Loads and body weight in kilograms, distances in kilometres, durations in seconds.',
  sets: 'One entry per logged set, in the order performed. set = the set number within that exercise.',
  strength_vs_endurance:
    'Exercises of type "strength" report weight_kg and reps; type "endurance" reports duration_seconds and distance_km.',
  muscle_groups:
    'Tags from the exercise catalogue (muscle groups and movement category). Use these when the exercise name is unfamiliar.',
  pain_scale: 'Pain logged for that exercise in that session, 1 (mild) to 10 (severe). null = no pain logged.',
  nulls: 'null means "not recorded", not zero.',
  gaps: 'Only saved workouts are included. Missing dates are rest days or unlogged days.',
}

function isEmptySet(s: RawSetRow): boolean {
  return (
    s.weight_kg == null && s.reps == null && s.duration_seconds == null && s.distance_km == null
  )
}

function toExportSet(s: RawSetRow, type: string): ExportSet {
  return type === 'endurance'
    ? { set: s.set_number, duration_seconds: s.duration_seconds, distance_km: s.distance_km }
    : { set: s.set_number, weight_kg: s.weight_kg, reps: s.reps }
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildBodyWeight(rows: RawWeightRow[]): ExportBodyWeight {
  const entries = rows
    .filter((w): w is { date: string; weight: number } => w.date != null && w.weight != null)
    .map((w) => ({ date: w.date, weight_kg: w.weight }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (entries.length === 0) {
    return {
      unit: 'kg',
      first_kg: null,
      last_kg: null,
      min_kg: null,
      max_kg: null,
      change_kg: null,
      entries: [],
    }
  }

  const values = entries.map((e) => e.weight_kg)
  const first = values[0] ?? null
  const last = values[values.length - 1] ?? null

  return {
    unit: 'kg',
    first_kg: first,
    last_kg: last,
    min_kg: Math.min(...values),
    max_kg: Math.max(...values),
    change_kg:
      first != null && last != null ? Math.round((last - first) * 10) / 10 : null,
    entries,
  }
}

/**
 * An exercise survives when it has at least one non-empty set, or when the user
 * left a note or a pain score on it — "I started this and stopped" is signal too.
 */
function buildExercise(row: RawWorkoutExerciseRow): ExportExercise | null {
  if (!row.exercise) return null

  const type = row.exercise.type
  const sets = (row.exercise_sets ?? [])
    .filter((s) => !isEmptySet(s))
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => toExportSet(s, type))

  const sessionNotes = trimToNull(row.notes)
  if (sets.length === 0 && sessionNotes === null && row.pain_scale == null) return null

  return {
    name: row.exercise.name,
    type,
    muscle_groups: (row.exercise.tags ?? []).map((t) => t.name).sort((a, b) => a.localeCompare(b)),
    exercise_notes: trimToNull(row.exercise.notes),
    session_notes: sessionNotes,
    pain_scale: row.pain_scale ?? null,
    sets,
  }
}

function buildWorkout(row: RawWorkoutRow): ExportWorkout | null {
  const exercises = (row.workout_exercises ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(buildExercise)
    .filter((e): e is ExportExercise => e !== null)

  if (exercises.length === 0) return null

  return {
    date: row.date,
    name: trimToNull(row.name) ?? trimToNull(row.template?.name) ?? null,
    notes: trimToNull(row.notes),
    exercises,
  }
}

export function buildAiExport(input: BuildAiExportInput): AiExportPayload {
  const workouts = input.workouts
    .map(buildWorkout)
    .filter((w): w is ExportWorkout => w !== null)
    .sort((a, b) => a.date.localeCompare(b.date))

  const exerciseSessions = workouts.flatMap((w) => w.exercises)
  const distinctExercises = new Set(exerciseSessions.map((e) => e.name))

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: input.generatedAt ?? new Date().toISOString(),
    export_type: 'fitness_history',
    reading_guide: READING_GUIDE,
    question: trimToNull(input.profile.llm_prompt),
    user_notes: trimToNull(input.userNotes),
    athlete: {
      goals: trimToNull(input.profile.goals),
      notes: trimToNull(input.profile.notes),
    },
    date_range: { from: input.from, to: input.to },
    summary: {
      workout_count: workouts.length,
      exercise_session_count: exerciseSessions.length,
      set_count: exerciseSessions.reduce((total, e) => total + e.sets.length, 0),
      distinct_exercises: distinctExercises.size,
    },
    body_weight: buildBodyWeight(input.weights),
    workouts,
  }
}
