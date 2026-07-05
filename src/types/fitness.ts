export interface Tag {
  id: number
  name: string
  created_at: string
}

export interface Exercise {
  id: number
  name: string
  type: 'strength' | 'endurance'
  notes: string | null
  aliases?: string[]
  created_by: string | null
  created_at: string
  tags?: Tag[]
}

export interface Workout {
  id: number
  user_id: string
  date: string
  name: string | null
  notes: string | null
  template_id: number | null
  created_at: string
}

export interface WorkoutTemplate {
  id: number
  user_id: string
  name: string
  created_at: string
  template_exercises?: TemplateExercise[]
}

export interface TemplateExercise {
  id: number
  template_id: number
  exercise_id: number
  sort_order: number
  created_at: string
  exercise?: Exercise
}

export interface TemplateSummary extends WorkoutTemplate {
  exercise_count: number
}

export interface WorkoutSummary extends Workout {
  exercise_count: number
}

export interface WorkoutExercise {
  id: number
  workout_id: number
  exercise_id: number
  sort_order: number
  notes: string | null
  pain_scale: number | null
  created_at: string
  exercise?: Exercise
}

export interface Profile {
  id: string
  is_admin: boolean
  goals: string | null
  notes: string | null
  llm_prompt: string | null
  created_at: string
}

export interface ExerciseSet {
  id: number
  workout_exercise_id: number
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  distance_km: number | null
  created_at: string
}
