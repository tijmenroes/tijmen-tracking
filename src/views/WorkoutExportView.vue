<template>
  <div class="wexport">
    <div class="wexport__header">
      <button class="wexport__back" @click="router.push('/workout')">‹</button>
      <div>
        <div class="wexport__supra">Fitness tracker</div>
        <h1 class="wexport__title">Exporteer voor AI</h1>
      </div>
    </div>

    <div class="wexport__content">
      <div class="card">
        <span class="wexport__label">Periode</span>
        <p class="wexport__hint">
          Alle opgeslagen workouts en gewichtsmetingen tussen deze twee datums gaan mee.
        </p>
        <div class="wexport__range">
          <label class="wexport__field">
            <span class="wexport__field-label">Van</span>
            <input v-model="from" class="wexport__input" type="date" :max="to" />
          </label>
          <label class="wexport__field">
            <span class="wexport__field-label">Tot en met</span>
            <input v-model="to" class="wexport__input" type="date" :min="from" />
          </label>
        </div>
        <div class="wexport__presets">
          <button
            v-for="preset in presets"
            :key="preset.months"
            type="button"
            class="wexport__preset"
            @click="applyPreset(preset.months)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <div class="card">
        <label class="wexport__label" for="user-notes">Extra context</label>
        <p class="wexport__hint">
          Optioneel. Komt als <code>user_notes</code> in de JSON, naast je AI prompt prefix uit je
          profiel.
        </p>
        <textarea
          id="user-notes"
          v-model="userNotes"
          class="wexport__textarea"
          placeholder="Bijv. Laatste 6 weken gecut op 2000 kcal, vanaf nu bulk. Linkerschouder blijft gevoelig bij drukken."
          rows="4"
        />
      </div>

      <button class="wexport__generate" :disabled="generating || !rangeValid" @click="handleGenerate">
        {{ generating ? 'Genereren…' : 'Genereer' }}
      </button>

      <p v-if="!rangeValid" class="wexport__error">De einddatum ligt voor de begindatum.</p>
      <p v-if="error" class="wexport__error">{{ error }}</p>

      <div v-if="payload && json" class="card">
        <span class="wexport__label">Resultaat</span>
        <p class="wexport__summary">
          {{ payload.summary.workout_count }}
          {{ payload.summary.workout_count === 1 ? 'workout' : 'workouts' }} ·
          {{ payload.summary.set_count }} sets ·
          {{ payload.summary.distinct_exercises }}
          {{ payload.summary.distinct_exercises === 1 ? 'oefening' : 'oefeningen' }} ·
          {{ payload.body_weight.entries.length }} wegingen · {{ sizeLabel }}
        </p>

        <p v-if="payload.summary.workout_count === 0" class="wexport__empty">
          Geen opgeslagen workouts in deze periode. De JSON is leeg op je profielgegevens na.
        </p>

        <div class="wexport__actions">
          <button type="button" class="wexport__action" @click="handleCopy">
            {{ copyState === 'copied' ? 'Gekopieerd' : 'Kopieer JSON' }}
          </button>
          <button type="button" class="wexport__action" @click="handleDownload">Download</button>
        </div>
        <p v-if="copyState === 'failed'" class="wexport__error">
          Kopiëren is geblokkeerd door de browser. Gebruik download, of selecteer de tekst hieronder.
        </p>

        <button type="button" class="wexport__toggle" @click="showPreview = !showPreview">
          {{ showPreview ? 'Verberg preview' : 'Toon preview' }}
        </button>
        <template v-if="showPreview">
          <pre class="wexport__preview">{{ previewText }}</pre>
          <p v-if="previewTruncated" class="wexport__hint">
            Preview afgekapt na {{ PREVIEW_LIMIT.toLocaleString('nl-NL') }} tekens. Kopie en download
            bevatten de volledige JSON.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAiExport, copyJson, downloadJson, exportFilename } from '@/composables/useAiExport'
import { toLocalIso, todayLocalIso } from '@/utils/dates'

const PREVIEW_LIMIT = 20000

const router = useRouter()
const { payload, generating, error, generate } = useAiExport()

function monthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return toLocalIso(d)
}

const presets = [
  { months: 1, label: '1 maand' },
  { months: 3, label: '3 maanden' },
  { months: 6, label: '6 maanden' },
  { months: 12, label: '1 jaar' },
]

const from = ref(monthsAgo(3))
const to = ref(todayLocalIso())
const userNotes = ref('')
const showPreview = ref(true)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

const rangeValid = computed(() => from.value !== '' && to.value !== '' && from.value <= to.value)
const json = computed(() => (payload.value ? JSON.stringify(payload.value, null, 2) : ''))
const previewTruncated = computed(() => json.value.length > PREVIEW_LIMIT)
const previewText = computed(() =>
  previewTruncated.value ? `${json.value.slice(0, PREVIEW_LIMIT)}\n…` : json.value,
)
const sizeLabel = computed(() => {
  const kb = new Blob([json.value]).size / 1024
  return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} kB`
})

function applyPreset(months: number) {
  from.value = monthsAgo(months)
  to.value = todayLocalIso()
}

async function handleGenerate() {
  copyState.value = 'idle'
  await generate(from.value, to.value, userNotes.value || null)
}

async function handleCopy() {
  copyState.value = (await copyJson(json.value)) ? 'copied' : 'failed'
}

function handleDownload() {
  downloadJson(json.value, exportFilename(from.value, to.value))
}
</script>

<style scoped>
.wexport {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.wexport__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.wexport__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.wexport__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.wexport__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.wexport__content {
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

.wexport__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
  margin-bottom: 8px;
}

.wexport__hint {
  font-size: 13px;
  color: var(--color-text-2);
  margin: 0 0 10px;
}

.wexport__range {
  display: flex;
  gap: 10px;
}

.wexport__field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wexport__field-label {
  font-size: 12px;
  color: var(--color-text-3);
}

.wexport__input,
.wexport__textarea {
  width: 100%;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 10px 12px;
  font-size: 16px;
  font-family: var(--font);
  color: var(--color-text);
  box-sizing: border-box;
}

.wexport__textarea {
  resize: vertical;
}

.wexport__input:focus,
.wexport__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.wexport__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.wexport__preset {
  border: none;
  border-radius: 999px;
  background: var(--color-chip);
  color: var(--color-text-2);
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
}

.wexport__generate {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  transition: opacity 150ms;
}

.wexport__generate:disabled {
  opacity: 0.5;
  cursor: default;
}

.wexport__summary {
  font-size: 14px;
  color: var(--color-text-2);
  margin: 0 0 12px;
}

.wexport__empty {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 0 0 12px;
}

.wexport__actions {
  display: flex;
  gap: 10px;
}

.wexport__action {
  flex: 1;
  height: 42px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
}

.wexport__toggle {
  margin-top: 12px;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
}

.wexport__preview {
  margin: 10px 0 0;
  max-height: 380px;
  overflow: auto;
  background: var(--color-card-2);
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-2);
  white-space: pre;
}

.wexport__error {
  margin: 0;
  font-size: 13px;
  color: var(--color-up);
}
</style>
