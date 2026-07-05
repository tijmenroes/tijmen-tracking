<template>
  <div class="tdetail">
    <div class="tdetail__header">
      <button class="tdetail__back" @click="router.push('/workout/templates')">‹</button>
      <div class="tdetail__header-text">
        <div class="tdetail__supra">Template</div>
        <h1 class="tdetail__title">{{ template?.name ?? '…' }}</h1>
      </div>
    </div>

    <div v-if="detailLoading" class="tdetail__muted">Laden…</div>
    <div v-else-if="error" class="tdetail__error">{{ error }}</div>

    <div v-else class="tdetail__content">
      <button class="tdetail__start" :disabled="starting" @click="handleStart">
        {{ starting ? 'Bezig…' : 'Workout starten' }}
      </button>

      <button class="tdetail__edit" type="button" @click="router.push(`/workout/templates/${templateId}/edit`)">
        Oefeningen bewerken ›
      </button>

      <section class="tdetail__section">
        <h2 class="tdetail__section-title">Workouts met dit template</h2>
        <p v-if="templateWorkouts.length > 0" class="tdetail__section-hint">
          Eerste en laatste keer per oefening ({{ templateWorkouts.length }}
          {{ templateWorkouts.length === 1 ? 'workout' : 'workouts' }}).
        </p>

        <div v-if="progressLoading" class="tdetail__muted-inline">Laden…</div>
        <div v-else-if="templateWorkouts.length === 0" class="tdetail__muted-inline">
          Nog geen workouts gestart vanaf dit template.
        </div>
        <div v-else-if="templateExercises.length === 0" class="tdetail__muted-inline">
          Voeg oefeningen toe aan dit template.
        </div>

        <div v-else class="tdetail__progress">
          <div
            v-for="item in exerciseProgress"
            :key="item.exercise_id"
            class="tdetail__progress-card card"
          >
            <h3 class="tdetail__progress-name">{{ item.exercise_name }}</h3>
            <div v-if="item.rows.length === 0" class="tdetail__progress-empty">
              Nog geen sets gelogd.
            </div>
            <table v-else class="tdetail__table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Set</th>
                  <th>Kg-reps</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in item.rows" :key="idx">
                  <td>{{ row.date }}</td>
                  <td>{{ row.set_number }}</td>
                  <td>{{ row.metric }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <button class="tdetail__delete" type="button" @click="showDeleteConfirm = true">
        Template verwijderen
      </button>
    </div>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Template verwijderen"
      :message="`Weet je zeker dat je “${template?.name}” wilt verwijderen? Bestaande workouts blijven bewaard.`"
      confirm-label="Verwijderen"
      danger
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useTemplatesStore } from '@/stores/templates'
import { useWorkouts } from '@/composables/useWorkouts'

import type { TemplateExerciseProgress } from '@/types/fitness'

const router = useRouter()
const route = useRoute()
const templateId = computed(() => Number(route.params.id))

const templatesStore = useTemplatesStore()
const { template, templateExercises, detailLoading, error } = storeToRefs(templatesStore)
const { loadTemplate, deleteTemplate, fetchTemplateExerciseProgress } = templatesStore
const { templateWorkouts, startWorkout, fetchWorkoutsByTemplate } = useWorkouts()

const starting = ref(false)
const showDeleteConfirm = ref(false)
const progressLoading = ref(false)
const exerciseProgress = ref<TemplateExerciseProgress[]>([])

onMounted(async () => {
  await loadTemplate(templateId.value)
  await fetchWorkoutsByTemplate(templateId.value)
  await loadProgress()
})

async function loadProgress() {
  progressLoading.value = true
  exerciseProgress.value = await fetchTemplateExerciseProgress(
    templateExercises.value,
    templateWorkouts.value,
  )
  progressLoading.value = false
}

async function handleStart() {
  starting.value = true
  const workout = await startWorkout({ templateId: templateId.value })
  starting.value = false
  if (workout) router.push(`/workout/session/${workout.id}`)
}

async function handleDelete() {
  showDeleteConfirm.value = false
  await deleteTemplate(templateId.value)
  if (!error.value) router.push('/workout/templates')
}
</script>

<style scoped>
.tdetail {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.tdetail__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tdetail__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.tdetail__header-text {
  flex: 1;
  min-width: 0;
}

.tdetail__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.tdetail__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.tdetail__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tdetail__muted,
.tdetail__error {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.tdetail__error {
  color: var(--color-up);
}

.tdetail__muted-inline {
  font-size: 14px;
  color: var(--color-text-2);
  margin: 0;
  padding: 8px 0;
}

.tdetail__start {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: var(--font);
}

.tdetail__start:disabled {
  opacity: 0.4;
  cursor: default;
}

.tdetail__edit {
  align-self: flex-start;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
  padding: 4px 0;
}

.tdetail__section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  margin: 8px 0 6px;
}

.tdetail__section-hint {
  font-size: 13px;
  color: var(--color-text-2);
  margin: 0 0 12px;
}

.tdetail__progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tdetail__progress-card {
  padding: 16px 18px;
}

.tdetail__progress-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 10px;
}

.tdetail__progress-empty {
  font-size: 13px;
  color: var(--color-text-3);
}

.tdetail__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tdetail__table th {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  padding: 0 8px 8px 0;
}

.tdetail__table td {
  padding: 5px 8px 5px 0;
  color: var(--color-text);
  border-top: 1px solid var(--color-hairline);
  font-variant-numeric: tabular-nums;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.tdetail__delete {
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
