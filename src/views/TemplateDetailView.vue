<template>
  <div class="tdetail">
    <div class="tdetail__header">
      <button class="tdetail__back" @click="router.push('/workout/templates')">‹</button>
      <div class="tdetail__header-text">
        <div class="tdetail__supra">Template</div>
        <h1 class="tdetail__title">{{ template?.name ?? '…' }}</h1>
      </div>
    </div>

    <div v-if="loading" class="tdetail__muted">Laden…</div>
    <div v-else-if="error" class="tdetail__error">{{ error }}</div>

    <div v-else class="tdetail__content">
      <button class="tdetail__start" :disabled="starting" @click="handleStart">
        {{ starting ? 'Bezig…' : 'Workout starten' }}
      </button>

      <button class="tdetail__edit" type="button" @click="router.push(`/workout/templates/${templateId}/edit`)">
        Oefeningen bewerken ›
      </button>

      <section class="tdetail__section">
        <h2 class="tdetail__section-title">Oefeningen</h2>
        <ul v-if="templateExercises.length" class="tdetail__ex-list card">
          <li v-for="te in templateExercises" :key="te.id" class="tdetail__ex-item">
            {{ te.exercise?.name ?? 'Oefening' }}
          </li>
        </ul>
        <p v-else class="tdetail__muted-inline">Nog geen oefeningen in deze template.</p>
      </section>

      <section class="tdetail__section">
        <h2 class="tdetail__section-title">Workouts met dit template</h2>
        <div v-if="historyLoading" class="tdetail__muted-inline">Laden…</div>
        <div v-else-if="templateWorkouts.length === 0" class="tdetail__muted-inline">
          Nog geen workouts gestart vanaf dit template.
        </div>
        <ul v-else class="tdetail__history card">
          <li
            v-for="w in templateWorkouts"
            :key="w.id"
            class="tdetail__history-item"
            @click="router.push(`/workout/history/${w.id}`)"
          >
            <span class="tdetail__history-name">{{ w.name || formatDate(w.date) }}</span>
            <span class="tdetail__history-sub">
              {{ formatDate(w.date) }} · {{ w.exercise_count }} oefeningen
            </span>
          </li>
        </ul>
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
import { useRouter, useRoute } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useWorkoutTemplates } from '@/composables/useWorkoutTemplates'
import { useWorkouts } from '@/composables/useWorkouts'

const router = useRouter()
const route = useRoute()
const templateId = computed(() => Number(route.params.id))

const { template, templateExercises, loading, error, loadTemplate, deleteTemplate } = useWorkoutTemplates()
const { templateWorkouts, loading: historyLoading, startWorkout, fetchWorkoutsByTemplate } = useWorkouts()

const starting = ref(false)
const showDeleteConfirm = ref(false)

onMounted(async () => {
  await loadTemplate(templateId.value)
  await fetchWorkoutsByTemplate(templateId.value)
})

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

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
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
  margin: 8px 0 10px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.tdetail__ex-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tdetail__ex-item {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.tdetail__ex-item:last-child {
  border-bottom: none;
}

.tdetail__history {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tdetail__history-item {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tdetail__history-item:last-child {
  border-bottom: none;
}

.tdetail__history-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  text-transform: capitalize;
}

.tdetail__history-sub {
  font-size: 13px;
  color: var(--color-text-2);
  text-transform: capitalize;
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
