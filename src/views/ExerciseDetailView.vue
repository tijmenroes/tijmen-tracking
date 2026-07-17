<template>
  <div class="detail">
    <div class="detail__header">
      <button class="detail__back" @click="router.back()">‹</button>
      <div>
        <div class="detail__supra">Oefening</div>
        <h1 class="detail__title">{{ exerciseName }}</h1>
      </div>
    </div>

    <div v-if="loading" class="detail__loading">Laden…</div>
    <div v-else-if="error" class="detail__error">{{ error }}</div>

    <div v-else class="detail__content">
      <div v-if="exercise?.tags && exercise.tags.length" class="detail__tags">
        <span v-for="tag in exercise.tags" :key="tag.id" class="detail__tag">{{ tag.name }}</span>
      </div>

      <!-- Estimated 1RM headline -->
      <div v-if="isStrength && bestSet" class="card detail__pr">
        <div class="detail__section-label">Geschatte 1RM (predicted)</div>
        <div class="detail__pr-value">{{ roundE1RM(bestSet.e1rm) }} <span class="detail__pr-unit">kg</span></div>
        <div class="detail__pr-sub">Beste set: {{ bestSet.weight }} kg × {{ bestSet.reps }}</div>
      </div>

      <!-- e1RM over time -->
      <E1RMChart v-if="isStrength && e1rmPoints.length >= 3" :points="e1rmPoints" />

      <div v-if="history.length === 0" class="detail__empty">
        Nog geen sessies gelogd voor deze oefening.
      </div>

      <div v-for="session in visibleHistory" :key="session.date" class="detail__session card">
        <div class="detail__session-header">
          <span class="detail__session-date">{{ formatDate(session.date) }}</span>
          <span v-if="session.pain_scale !== null" class="detail__pain-badge">
            Pijn {{ session.pain_scale }}/10
          </span>
        </div>
        <div v-if="session.sessionNotes" class="detail__session-notes">{{ session.sessionNotes }}</div>
        <table class="detail__table">
          <thead>
            <tr>
              <th>Set</th>
              <th v-if="isStrength">Kg</th>
              <th v-if="isStrength">Reps</th>
              <th v-if="!isStrength">Tijd</th>
              <th v-if="!isStrength">Km</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in session.sets" :key="s.id">
              <td>{{ s.set_number }}</td>
              <template v-if="isStrength">
                <td>{{ s.weight_kg ?? '—' }}</td>
                <td>{{ s.reps ?? '—' }}</td>
              </template>
              <template v-else>
                <td>{{ formatDuration(s.duration_seconds) }}</td>
                <td>{{ s.distance_km ?? '—' }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        v-if="history.length > HISTORY_CAP && !showAllHistory"
        class="detail__load-more"
        @click="showAllHistory = true"
      >
        Toon alle {{ history.length }} sessies <span class="detail__load-more-arrow">↓</span>
      </button>

      <!-- Persistent exercise notes (cue / AI export) -->
      <div class="card detail__exercise-notes">
        <div class="detail__section-label">Notities over deze oefening</div>
        <textarea
          v-model="exerciseNotes"
          class="detail__notes-input"
          placeholder="Bijv. techniek tips, blessure-aandachtspunten..."
          rows="2"
          @blur="saveExerciseNotes"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { Exercise, ExerciseSet } from '@/types/fitness'
import { epley1RM, roundE1RM } from '@/utils/e1rm'
import E1RMChart, { type E1RMPoint } from '@/components/E1RMChart.vue'

interface SessionHistory {
  date: string
  sets: ExerciseSet[]
  sessionNotes: string | null
  pain_scale: number | null
}

const HISTORY_CAP = 8

const router = useRouter()
const route = useRoute()

const exerciseId = Number(route.params.id)
const exercise = ref<Exercise | null>(null)
const history = ref<SessionHistory[]>([])
const exerciseNotes = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const saveError = ref<string | null>(null)
const showAllHistory = ref(false)

const exerciseName = computed(() => exercise.value?.name ?? '…')
const isStrength = computed(() => exercise.value?.type === 'strength')

const visibleHistory = computed(() =>
  showAllHistory.value ? history.value : history.value.slice(0, HISTORY_CAP),
)

// Best set (highest e1RM) per session, oldest→newest handling done in the chart.
const e1rmPoints = computed<E1RMPoint[]>(() => {
  if (!isStrength.value) return []
  const points: E1RMPoint[] = []
  for (const session of history.value) {
    let best: number | null = null
    for (const s of session.sets) {
      const e = epley1RM(s.weight_kg, s.reps)
      if (e != null && (best == null || e > best)) best = e
    }
    if (best != null) points.push({ date: session.date, e1rm: best })
  }
  return points
})

// All-time best set — the headline PR, plus the weight×reps behind it.
const bestSet = computed(() => {
  if (!isStrength.value) return null
  let best: { e1rm: number; weight: number; reps: number; date: string } | null = null
  for (const session of history.value) {
    for (const s of session.sets) {
      const e = epley1RM(s.weight_kg, s.reps)
      if (e != null && (best == null || e > best.e1rm)) {
        best = { e1rm: e, weight: s.weight_kg!, reps: s.reps!, date: session.date }
      }
    }
  }
  return best
})

onMounted(async () => {
  loading.value = true

  const { data: ex, error: exErr } = await supabase
    .from('exercises')
    .select('*, tags(*)')
    .eq('id', exerciseId)
    .single()
  if (exErr) { error.value = exErr.message; loading.value = false; return }
  exercise.value = ex as Exercise
  exerciseNotes.value = ex.notes ?? ''

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) { loading.value = false; return }

  // Embed the sets so the whole history arrives in one request instead of one
  // query per session.
  const { data: weRows, error: weErr } = await supabase
    .from('workout_exercises')
    .select('id, notes, pain_scale, exercise_sets(*), workout:workouts!inner(date, user_id)')
    .eq('exercise_id', exerciseId)
    .eq('workout.user_id', userId)
    .order('workout(date)', { ascending: false })
  if (weErr) { error.value = weErr.message; loading.value = false; return }

  const sessions: SessionHistory[] = []
  for (const we of weRows ?? []) {
    const workout = we.workout as unknown as { date: string; user_id: string }
    const setsData = [...((we.exercise_sets ?? []) as ExerciseSet[])].sort(
      (a, b) => a.set_number - b.set_number,
    )
    if (setsData.length > 0) {
      sessions.push({
        date: workout.date,
        sets: setsData,
        sessionNotes: we.notes ?? null,
        pain_scale: we.pain_scale ?? null,
      })
    }
  }
  history.value = sessions
  loading.value = false
})

async function saveExerciseNotes() {
  saveError.value = null
  const { error: err } = await supabase
    .from('exercises')
    .update({ notes: exerciseNotes.value || null })
    .eq('id', exerciseId)
  if (err) saveError.value = err.message
  else if (exercise.value) exercise.value.notes = exerciseNotes.value || null
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
</script>

<style scoped>
.detail {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.detail__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.detail__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.detail__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.detail__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.detail__loading,
.detail__error,
.detail__empty {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.detail__error {
  color: var(--color-up);
}

.detail__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 16px 18px;
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail__tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.detail__pr {
  text-align: center;
  padding: 18px;
}

.detail__pr .detail__section-label {
  margin-bottom: 6px;
}

.detail__pr-value {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.detail__pr-unit {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-2);
}

.detail__pr-sub {
  font-size: 13px;
  color: var(--color-text-2);
  margin-top: 6px;
}

.detail__load-more {
  width: 100%;
  border: none;
  background: none;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font);
  color: var(--color-primary);
  cursor: pointer;
}

.detail__load-more-arrow {
  font-size: 13px;
}

.detail__section-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  margin-bottom: 8px;
}

.detail__notes-input {
  width: 100%;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 10px 12px;
  font-size: 16px;
  font-family: var(--font);
  color: var(--color-text);
  resize: vertical;
  box-sizing: border-box;
}

.detail__notes-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.detail__session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.detail__session-date {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-2);
  text-transform: capitalize;
}

.detail__pain-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--color-up-soft);
  color: var(--color-up);
}

.detail__session-notes {
  font-size: 13px;
  color: var(--color-text-2);
  font-style: italic;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--color-card-2);
  border-radius: 8px;
}

.detail__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.detail__table th {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  padding: 0 8px 8px 0;
}

.detail__table td {
  padding: 5px 8px 5px 0;
  color: var(--color-text);
  border-top: 1px solid var(--color-hairline);
  font-variant-numeric: tabular-nums;
}
</style>
