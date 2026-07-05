<template>
  <div class="wdash">
    <div class="wdash__header">
      <button class="wdash__back" @click="router.push('/')">‹</button>
      <div>
        <div class="wdash__supra">Fitness tracker</div>
        <h1 class="wdash__title">Workout</h1>
      </div>
    </div>

    <div class="wdash__content">
      <button class="wdash__start" :disabled="starting" @click="handleStart">
        {{ starting ? 'Bezig…' : '+ Workout starten' }}
      </button>
      <div v-if="error" class="wdash__error">{{ error }}</div>

      <!-- Templates -->
      <section class="wdash__section">
        <div class="wdash__section-head">
          <h2 class="wdash__section-title">Templates</h2>
          <button
            v-if="recentTemplates.length > 0"
            class="wdash__section-link"
            @click="router.push('/workout/templates')"
          >
            Alle templates ›
          </button>
        </div>

        <div v-if="templatesLoading" class="wdash__muted">Laden…</div>
        <div v-else-if="recentTemplates.length === 0" class="wdash__muted">
          Nog geen templates.
          <button class="wdash__inline-link" @click="showNewTemplate = true">Maak er een ›</button>
        </div>
        <ul v-else class="wdash__list">
          <li
            v-for="t in recentTemplates"
            :key="t.id"
            class="wdash__item"
            @click="handleStartFromTemplate(t.id)"
          >
            <div class="wdash__item-info">
              <span class="wdash__item-name">{{ t.name }}</span>
              <span class="wdash__item-sub">
                {{ t.exercise_count }} {{ t.exercise_count === 1 ? 'oefening' : 'oefeningen' }}
              </span>
            </div>
            <span class="wdash__item-action">Start ›</span>
          </li>
        </ul>

        <button v-if="recentTemplates.length > 0" class="wdash__text-btn" @click="showNewTemplate = true">
          + Nieuwe template
        </button>
      </section>

      <!-- Recente workouts -->
      <section class="wdash__section">
        <div class="wdash__section-head">
          <h2 class="wdash__section-title">Recente workouts</h2>
          <button
            v-if="recentWorkouts.length > 0"
            class="wdash__section-link"
            @click="router.push('/workout/history')"
          >
            Alle workouts ›
          </button>
        </div>

        <div v-if="loading" class="wdash__muted">Laden…</div>
        <div v-else-if="recentWorkouts.length === 0" class="wdash__muted">
          Nog geen workouts. Start je eerste!
        </div>
        <ul v-else class="wdash__list">
          <li
            v-for="w in recentWorkouts"
            :key="w.id"
            class="wdash__item"
            @click="router.push(`/workout/history/${w.id}`)"
          >
            <div class="wdash__item-info">
              <span class="wdash__item-name">{{ w.name || formatDate(w.date) }}</span>
              <span class="wdash__item-sub">
                <template v-if="w.name">{{ formatDate(w.date) }} · </template>{{ w.exercise_count }} {{ w.exercise_count === 1 ? 'oefening' : 'oefeningen' }}
              </span>
            </div>
            <span class="wdash__item-chevron">›</span>
          </li>
        </ul>
      </section>

      <button class="wdash__secondary" @click="router.push('/workout/export')">
        Exporteer voor AI
      </button>
    </div>

    <BaseModal v-if="showNewTemplate" title="Nieuwe template" @close="showNewTemplate = false">
      <input
        v-model="newTemplateName"
        class="wdash__modal-input"
        type="text"
        placeholder="Naam template (bijv. Push A)"
        @keydown.enter="handleCreateTemplate"
      >
      <template #footer>
        <button class="wdash__modal-btn wdash__modal-btn--cancel" @click="showNewTemplate = false">
          Annuleren
        </button>
        <button
          class="wdash__modal-btn wdash__modal-btn--primary"
          :disabled="!newTemplateName.trim()"
          @click="handleCreateTemplate"
        >
          Aanmaken
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import { useWorkouts } from '@/composables/useWorkouts'
import { useWorkoutTemplates } from '@/composables/useWorkoutTemplates'

const router = useRouter()
const { recentWorkouts, loading, error, startWorkout, fetchRecentWorkouts } = useWorkouts()
const { recentTemplates, loading: templatesLoading, fetchRecentTemplates, createTemplate } = useWorkoutTemplates()

const starting = ref(false)
const showNewTemplate = ref(false)
const newTemplateName = ref('')

onMounted(async () => {
  await Promise.all([fetchRecentWorkouts(), fetchRecentTemplates()])
})

async function handleStart() {
  starting.value = true
  const workout = await startWorkout()
  starting.value = false
  if (workout) router.push(`/workout/session/${workout.id}`)
}

async function handleStartFromTemplate(templateId: number) {
  starting.value = true
  const workout = await startWorkout({ templateId })
  starting.value = false
  if (workout) router.push(`/workout/session/${workout.id}`)
}

async function handleCreateTemplate() {
  if (!newTemplateName.value.trim()) return
  const created = await createTemplate(newTemplateName.value.trim())
  if (created) {
    showNewTemplate.value = false
    newTemplateName.value = ''
    router.push(`/workout/templates/${created.id}/edit`)
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}
</script>

<style scoped>
.wdash {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.wdash__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.wdash__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.wdash__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.wdash__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.wdash__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wdash__start {
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

.wdash__start:disabled {
  opacity: 0.4;
  cursor: default;
}

.wdash__error {
  font-size: 13px;
  color: var(--color-up);
  text-align: center;
}

.wdash__section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.wdash__section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  margin: 0;
}

.wdash__section-link {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
  padding: 0;
}

.wdash__muted {
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-2);
}

.wdash__inline-link {
  display: block;
  margin-top: 8px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
}

.wdash__list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.wdash__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
  cursor: pointer;
}

.wdash__item:last-child {
  border-bottom: none;
}

.wdash__item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.wdash__item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.wdash__item-sub {
  font-size: 13px;
  color: var(--color-text-2);
}

.wdash__item-chevron,
.wdash__item-action {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  line-height: 1;
  flex-shrink: 0;
}

.wdash__text-btn {
  margin-top: 10px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
  padding: 4px 0;
}

.wdash__secondary {
  align-self: center;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
  padding: 4px 8px;
}

.wdash__modal-input {
  width: 100%;
  height: 44px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 12px;
  font-size: 15px;
  font-family: var(--font);
  color: var(--color-text);
  box-sizing: border-box;
}

.wdash__modal-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.wdash__modal-btn--cancel {
  background: var(--color-chip);
  color: var(--color-text);
}

.wdash__modal-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.wdash__modal-btn--primary:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
