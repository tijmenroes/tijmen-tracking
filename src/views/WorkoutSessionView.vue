<template>
  <div class="workout">
    <div class="workout__header">
      <button class="workout__back" @click="router.back()">‹</button>
      <div class="workout__header-text">
        <div class="workout__supra">Fitness tracker</div>
        <h1 class="workout__title">{{ workout?.name || 'Workout' }}</h1>
        <div class="workout__date">{{ formattedDate }}</div>
      </div>
      <button
        v-if="workout"
        class="workout__settings-btn"
        type="button"
        title="Workout aanpassen"
        @click="showEditModal = true"
      >
        ⚙
      </button>
    </div>

    <div v-if="loading" class="workout__loading">Laden…</div>
    <div v-else-if="error" class="workout__error">{{ error }}</div>

    <div v-else class="workout__content">
      <div v-if="workoutExercises.length === 0" class="workout__empty">
        Geen oefeningen nog. Voeg er een toe!
      </div>

      <div class="workout__exercises">
        <WorkoutExerciseCard
          v-for="we in workoutExercises"
          :key="we.id"
          :workout-exercise="we"
          :on-update-extra="updateWorkoutExercise"
          @remove="handleRemoveExercise"
          @detail="router.push(`/exercises/${we.exercise_id}/detail`)"
        />
      </div>

      <button class="workout__add-btn" @click="showPicker = true">
        + Oefening toevoegen
      </button>

      <div v-if="workout" class="workout__footer">
        <p class="workout__save-hint">
          Lege sets worden bij het opslaan automatisch verwijderd.
        </p>
        <button class="workout__save-btn" :disabled="saving" @click="handleSave">
          {{ saving ? 'Opslaan…' : 'Workout opslaan' }}
        </button>
        <button class="workout__delete-btn" type="button" @click="showDeleteConfirm = true">
          Workout verwijderen
        </button>
      </div>
    </div>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Workout verwijderen"
      message="Weet je zeker dat je deze workout wilt verwijderen? Alle ingevulde sets gaan verloren."
      confirm-label="Verwijderen"
      danger
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />

    <ExercisePicker
      v-if="showPicker"
      :exercises="exercises"
      :tags="tags"
      :loading="exercisesLoading"
      @confirm="handleConfirmExercises"
    />

    <WorkoutEditModal
      v-if="showEditModal && workout"
      :workout="workout"
      allow-save-as-template
      :has-exercises="workoutExercises.length > 0"
      @close="showEditModal = false"
      @save="handleSaveWorkout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import WorkoutExerciseCard from '@/components/WorkoutExerciseCard.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'
import WorkoutEditModal from '@/components/WorkoutEditModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useWorkouts } from '@/composables/useWorkouts'
import { useWorkoutTemplates } from '@/composables/useWorkoutTemplates'
import { useExercises } from '@/composables/useExercises'
import { useTags } from '@/composables/useTags'
import type { Exercise } from '@/types/fitness'

const router = useRouter()
const route = useRoute()
const { workout, workoutExercises, loading, error, loadWorkout, updateWorkout, addExerciseToWorkout, removeExerciseFromWorkout, updateWorkoutExercise, saveWorkout, deleteWorkout } = useWorkouts()
const { exercises, loading: exercisesLoading, fetchExercises } = useExercises()
const { tags, fetchTags } = useTags()
const { createTemplateFromWorkout } = useWorkoutTemplates()

const showPicker = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const saving = ref(false)

const formattedDate = computed(() => {
  if (!workout.value) return ''
  const [y, m, d] = workout.value.date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
})

onMounted(async () => {
  await loadWorkout(Number(route.params.id))
  await Promise.all([fetchExercises(), fetchTags()])
})

async function handleConfirmExercises(selected: Exercise[]) {
  showPicker.value = false
  for (const ex of selected) {
    await addExerciseToWorkout(ex.id)
  }
}

async function handleRemoveExercise(id: number) {
  await removeExerciseFromWorkout(id)
}

async function handleSave() {
  if (!workout.value || saving.value) return
  saving.value = true
  const result = await saveWorkout(workout.value.id)
  saving.value = false
  if (!result) return
  if (result.deleted) {
    router.push('/workout')
  } else {
    router.push(`/workout/history/${route.params.id}`)
  }
}

async function handleDelete() {
  if (!workout.value) return
  const id = workout.value.id
  showDeleteConfirm.value = false
  await deleteWorkout(id)
  if (!error.value) router.push('/workout')
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
</script>

<style scoped>
.workout {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.workout__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.workout__header-text {
  flex: 1;
}

.workout__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.workout__settings-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--color-text-3);
  cursor: pointer;
  margin-top: 20px;
  padding: 4px;
}

.workout__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.workout__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 2px;
  color: var(--color-text);
}

.workout__date {
  font-size: 14px;
  color: var(--color-text-2);
  text-transform: capitalize;
}

.workout__loading,
.workout__error {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.workout__error {
  color: var(--color-up);
}

.workout__content {
  padding: 0 16px;
}

.workout__empty {
  text-align: center;
  padding: 40px 0 24px;
  font-size: 15px;
  color: var(--color-text-2);
}

.workout__exercises {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.workout__add-btn {
  width: 100%;
  padding: 15px;
  background: var(--color-card);
  border: 2px dashed var(--color-hairline);
  border-radius: var(--radius-card);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
  box-shadow: var(--shadow-card);
}

.workout__footer {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.workout__save-hint {
  font-size: 13px;
  color: var(--color-text-2);
  text-align: center;
  margin: 0;
}

.workout__save-btn {
  width: 100%;
  height: 52px;
  background: var(--color-primary);
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: var(--font);
}

.workout__save-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.workout__delete-btn {
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
