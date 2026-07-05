<template>
  <div class="wdetail">
    <div class="wdetail__header">
      <button class="wdetail__back" @click="router.back()">‹</button>
      <div class="wdetail__header-text">
        <div class="wdetail__supra">Workout</div>
        <h1 class="wdetail__title">{{ workout?.name || formattedDate || '…' }}</h1>
        <div v-if="workout?.name" class="wdetail__date">{{ formattedDate }}</div>
      </div>
      <button
        v-if="workout"
        class="wdetail__settings"
        type="button"
        title="Workout aanpassen"
        @click="showEditModal = true"
      >
        ⚙
      </button>
    </div>

    <div v-if="loading" class="wdetail__muted">Laden…</div>
    <div v-else-if="error" class="wdetail__error">{{ error }}</div>

    <div v-else class="wdetail__content">
      <button
        v-if="workout"
        class="wdetail__edit-log"
        type="button"
        @click="router.push(`/workout/session/${workout.id}`)"
      >
        Oefeningen en sets aanpassen ›
      </button>

      <p v-if="workout?.notes" class="wdetail__workout-notes card">{{ workout.notes }}</p>

      <div v-if="exerciseDetails.length === 0" class="wdetail__muted">
        Geen oefeningen in deze workout.
      </div>

      <div
        v-for="item in exerciseDetails"
        :key="item.workoutExercise.id"
        class="wdetail__exercise card"
      >
        <div class="wdetail__exercise-head">
          <button
            class="wdetail__exercise-name"
            type="button"
            @click="router.push(`/exercises/${item.workoutExercise.exercise_id}/detail`)"
          >
            {{ item.workoutExercise.exercise?.name ?? 'Oefening' }}
          </button>
          <span v-if="item.workoutExercise.pain_scale !== null" class="wdetail__pain-badge">
            Pijn {{ item.workoutExercise.pain_scale }}/10
          </span>
        </div>

        <div v-if="item.workoutExercise.notes" class="wdetail__session-notes">
          {{ item.workoutExercise.notes }}
        </div>

        <div v-if="item.sets.length === 0" class="wdetail__no-sets">Geen sets gelogd.</div>
        <table v-else class="wdetail__table">
          <thead>
            <tr>
              <th>Set</th>
              <template v-if="item.workoutExercise.exercise?.type === 'endurance'">
                <th>Tijd</th>
                <th>Km</th>
              </template>
              <template v-else>
                <th>Kg</th>
                <th>Reps</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in item.sets" :key="s.id">
              <td>{{ s.set_number }}</td>
              <template v-if="item.workoutExercise.exercise?.type === 'endurance'">
                <td>{{ formatDuration(s.duration_seconds) }}</td>
                <td>{{ s.distance_km ?? '—' }}</td>
              </template>
              <template v-else>
                <td>{{ s.weight_kg ?? '—' }}</td>
                <td>{{ s.reps ?? '—' }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <button class="wdetail__delete" type="button" @click="showDeleteConfirm = true">
        Workout verwijderen
      </button>
    </div>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Workout verwijderen"
      message="Weet je zeker dat je deze workout wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
      confirm-label="Verwijderen"
      danger
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />

    <WorkoutEditModal
      v-if="showEditModal && workout"
      :workout="workout"
      allow-save-as-template
      :has-exercises="exerciseDetails.length > 0"
      @close="showEditModal = false"
      @save="handleSaveWorkout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useWorkouts } from '@/composables/useWorkouts'
import ConfirmModal from '@/components/ConfirmModal.vue'
import WorkoutEditModal from '@/components/WorkoutEditModal.vue'
import { useTemplatesStore } from '@/stores/templates'
import type { ExerciseSet, WorkoutExercise } from '@/types/fitness'

interface ExerciseDetail {
  workoutExercise: WorkoutExercise
  sets: ExerciseSet[]
}

const router = useRouter()
const route = useRoute()
const { workout, workoutExercises, loading, error, loadWorkout, deleteWorkout, updateWorkout } = useWorkouts()
const { createTemplateFromWorkout } = useTemplatesStore()

const exerciseDetails = ref<ExerciseDetail[]>([])
const showDeleteConfirm = ref(false)
const showEditModal = ref(false)

const formattedDate = computed(() => {
  if (!workout.value) return ''
  const [y, m, d] = workout.value.date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

onMounted(async () => {
  await loadWorkout(Number(route.params.id))
  await loadSets()
})

async function loadSets() {
  const details: ExerciseDetail[] = []
  for (const we of workoutExercises.value) {
    const { data: setsData, error: setsErr } = await supabase
      .from('exercise_sets')
      .select('*')
      .eq('workout_exercise_id', we.id)
      .order('set_number')
    if (setsErr) {
      error.value = setsErr.message
      return
    }
    details.push({ workoutExercise: we, sets: (setsData ?? []) as ExerciseSet[] })
  }
  exerciseDetails.value = details
}

async function handleDelete() {
  if (!workout.value) return
  const id = workout.value.id
  showDeleteConfirm.value = false
  await deleteWorkout(id)
  if (!error.value) router.push('/workout/history')
}

async function handleSaveWorkout(payload: { name: string | null; date: string; saveAsTemplate: boolean }) {
  if (!workout.value) return
  await updateWorkout(workout.value.id, { name: payload.name, date: payload.date })
  if (error.value) return
  if (payload.saveAsTemplate) {
    const templateName = payload.name?.trim() || workout.value.name || 'Workout template'
    await createTemplateFromWorkout(workout.value.id, templateName)
    if (error.value) return
  }
  showEditModal.value = false
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
</script>

<style scoped>
.wdetail {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.wdetail__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.wdetail__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.wdetail__header-text {
  flex: 1;
  min-width: 0;
}

.wdetail__settings {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--color-text-3);
  cursor: pointer;
  margin-top: 20px;
  padding: 4px;
  flex-shrink: 0;
}

.wdetail__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.wdetail__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
  text-transform: capitalize;
}

.wdetail__date {
  font-size: 14px;
  color: var(--color-text-2);
  margin-top: 4px;
  text-transform: capitalize;
}

.wdetail__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wdetail__edit-log {
  width: 100%;
  background: var(--color-card);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font);
}

.wdetail__muted {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.wdetail__error {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-up);
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 16px 18px;
}

.wdetail__workout-notes {
  font-size: 14px;
  color: var(--color-text-2);
  font-style: italic;
  margin: 0;
}

.wdetail__exercise-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.wdetail__exercise-name {
  background: none;
  border: none;
  padding: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font);
}

.wdetail__pain-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--color-up-soft);
  color: var(--color-up);
  flex-shrink: 0;
}

.wdetail__session-notes {
  font-size: 13px;
  color: var(--color-text-2);
  font-style: italic;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--color-card-2);
  border-radius: 8px;
}

.wdetail__no-sets {
  font-size: 13px;
  color: var(--color-text-3);
}

.wdetail__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.wdetail__table th {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  padding: 0 8px 8px 0;
}

.wdetail__table td {
  padding: 5px 8px 5px 0;
  color: var(--color-text);
  border-top: 1px solid var(--color-hairline);
  font-variant-numeric: tabular-nums;
}

.wdetail__delete {
  margin-top: 8px;
  align-self: center;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-up);
  cursor: pointer;
  font-family: var(--font);
  padding: 8px 12px;
}
</style>
