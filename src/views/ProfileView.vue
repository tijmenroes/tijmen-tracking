<template>
  <div class="profile">
    <div class="profile__header">
      <button class="profile__back" @click="router.push('/')">‹</button>
      <div>
        <div class="profile__supra">Instellingen</div>
        <h1 class="profile__title">Profiel</h1>
      </div>
    </div>

    <div v-if="loading" class="profile__loading">Laden…</div>

    <div v-else class="profile__content">
      <!-- Current weight (read-only, from weight logs) -->
      <div class="card profile__section">
        <div class="profile__section-label">Huidig gewicht</div>
        <div v-if="currentWeight !== null" class="profile__weight-display">
          {{ currentWeight }} kg
          <span class="profile__weight-date">{{ currentWeightDate }}</span>
        </div>
        <div v-else class="profile__weight-empty">Nog geen gewicht gelogd.</div>
      </div>

      <!-- Goals -->
      <div class="card profile__section">
        <label class="profile__section-label" for="goals">Doelen</label>
        <textarea
          id="goals"
          v-model="form.goals"
          class="profile__textarea"
          placeholder="Bijv. schouder versterken, grotere borst, sterkere knieën voor hardlopen..."
          rows="4"
        />
      </div>

      <!-- Personal notes -->
      <div class="card profile__section">
        <label class="profile__section-label" for="notes">Persoonlijke notities</label>
        <textarea
          id="notes"
          v-model="form.notes"
          class="profile__textarea"
          placeholder="Bijv. instabiele linkerschouder, eerder blessure aan rechterknie..."
          rows="3"
        />
      </div>

      <!-- LLM prompt prefix -->
      <div class="card profile__section">
        <label class="profile__section-label" for="llm-prompt">AI prompt prefix</label>
        <p class="profile__section-hint">
          Deze tekst wordt bovenaan iedere AI-export geplaatst. Gebruik het om context te geven aan het taalmodel.
        </p>
        <textarea
          id="llm-prompt"
          v-model="form.llmPrompt"
          class="profile__textarea"
          placeholder="Bijv. Jij bent een ervaren personal trainer. Analyseer mijn trainingsdata en geef concrete tips voor progressie en blessurepreventie."
          rows="4"
        />
      </div>

      <p v-if="saveError" class="profile__error">{{ saveError }}</p>
      <p v-if="saveSuccess" class="profile__success">Opgeslagen.</p>

      <button class="profile__save" :disabled="saving" @click="handleSave">
        {{ saving ? 'Opslaan…' : 'Opslaan' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useWeights } from '@/composables/useWeights'

const router = useRouter()
const profileStore = useProfileStore()
const { weights, fetchWeights } = useWeights()

const loading = ref(true)
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

const currentWeight = ref<number | null>(null)
const currentWeightDate = ref<string>('')

const form = ref({
  goals: '',
  notes: '',
  llmPrompt: '',
})

onMounted(async () => {
  await Promise.all([profileStore.load(), fetchWeights()])

  form.value.goals = profileStore.goals ?? ''
  form.value.notes = profileStore.notes ?? ''
  form.value.llmPrompt = profileStore.llmPrompt ?? ''

  const latest = weights.value[0]
  if (latest?.weight != null) {
    currentWeight.value = latest.weight
    if (latest.date) {
      const [y, m, d] = latest.date.split('-').map(Number)
      currentWeightDate.value = new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
    }
  }

  loading.value = false
})

async function handleSave() {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  const err = await profileStore.save({
    goals: form.value.goals || null,
    notes: form.value.notes || null,
    llm_prompt: form.value.llmPrompt || null,
  })

  saving.value = false
  if (err) {
    saveError.value = err.message
  } else {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  }
}
</script>

<style scoped>
.profile {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.profile__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.profile__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.profile__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.profile__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.profile__loading {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.profile__content {
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

.profile__section-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  margin-bottom: 8px;
}

.profile__section-hint {
  font-size: 13px;
  color: var(--color-text-2);
  margin: 0 0 10px;
}

.profile__weight-display {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.profile__weight-date {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-3);
}

.profile__weight-empty {
  font-size: 14px;
  color: var(--color-text-3);
}

.profile__textarea {
  width: 100%;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--font);
  color: var(--color-text);
  resize: vertical;
  box-sizing: border-box;
}

.profile__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.profile__error {
  margin: 0;
  font-size: 13px;
  color: var(--color-up);
}

.profile__success {
  margin: 0;
  font-size: 13px;
  color: var(--color-down);
}

.profile__save {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
  transition: opacity 150ms;
}

.profile__save:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
