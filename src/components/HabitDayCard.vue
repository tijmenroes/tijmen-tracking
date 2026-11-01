<template>
  <section class="day-card" :aria-label="`Check-in ${dayLabel}`">
    <div class="day-card__title">{{ dayLabel }}</div>

    <div class="day-card__label">Hoe was je dag?</div>
    <div class="scale">
      <button
        v-for="n in 10"
        :key="n"
        type="button"
        class="scale__btn"
        :class="{ 'scale__btn--active': happiness === n }"
        :aria-pressed="happiness === n"
        :aria-label="`Happiness ${n}`"
        @click="pick(n)"
      >
        {{ n }}
      </button>
    </div>

    <label class="day-card__label" :for="journalId">Journal</label>
    <textarea
      :id="journalId"
      v-model="journal"
      class="day-card__journal"
      rows="4"
      maxlength="10000"
      placeholder="Wat speelde er vandaag?"
      :disabled="journalLoading"
      @input="scheduleSave"
      @blur="flush"
    />
    <div class="day-card__status" aria-live="polite">{{ statusText }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useHabitsStore } from '@/stores/habits'
import { formatDayLabel } from '@/content/habitCopy'

const props = defineProps<{ date: string; today: string }>()

const SAVE_DELAY_MS = 800

const store = useHabitsStore()
const journalId = useId()

const journal = ref('')
const savedJournal = ref('')
/** The day the text in the textarea belongs to; lags `props.date` while switching days. */
const journalDate = ref(props.date)
const journalLoading = ref(false)
const saving = ref(false)
const justSaved = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const dayLabel = computed(() => formatDayLabel(props.date, props.today))
const happiness = computed(() => store.checkinFor(props.date)?.happiness ?? null)
const statusText = computed(() => (saving.value ? 'Opslaan…' : justSaved.value ? 'Opgeslagen' : ''))

function pick(n: number) {
  // Tapping the current value clears it again.
  void store.saveHappiness(props.date, happiness.value === n ? null : n)
}

function scheduleSave() {
  justSaved.value = false
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void flush(), SAVE_DELAY_MS)
}

async function flush() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (journal.value === savedJournal.value) return
  const date = journalDate.value
  const text = journal.value
  saving.value = true
  const ok = await store.saveJournal(date, text)
  saving.value = false
  if (ok && journalDate.value === date) {
    savedJournal.value = text
    justSaved.value = true
  }
}

watch(
  () => props.date,
  async (date) => {
    // Save unsaved text for the previous day before showing the new one.
    await flush()
    journalDate.value = date
    justSaved.value = false
    journalLoading.value = true
    const text = await store.loadJournal(date)
    if (journalDate.value !== date) return
    journal.value = text
    savedJournal.value = text
    journalLoading.value = false
  },
  { immediate: true },
)

onBeforeUnmount(() => void flush())
</script>

<style scoped>
.day-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
  padding: 16px 16px 12px;
}

.day-card__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
}

.day-card__label {
  display: block;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.scale {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 16px;
}

.scale__btn {
  height: 36px;
  padding: 0;
  border: 1.5px solid var(--color-hairline);
  border-radius: 9px;
  background: var(--color-card-2);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.scale__btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.day-card__journal {
  width: 100%;
  min-height: 96px;
  padding: 10px 12px;
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  background: var(--color-card-2);
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.4;
  resize: vertical;
}

.day-card__status {
  min-height: 18px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-3);
  text-align: right;
}
</style>
