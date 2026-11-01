<template>
  <div class="hform">
    <div class="hform__header">
      <button class="hform__back" aria-label="Terug" @click="goBack">‹</button>
      <div class="hform__header-text">
        <div class="hform__supra">Habit</div>
        <h1 class="hform__title">{{ isEdit ? 'Bewerken' : 'Nieuwe habit' }}</h1>
      </div>
    </div>

    <div v-if="isEdit && !store.loaded" class="hform__message">Laden…</div>
    <div v-else-if="isEdit && !habit" class="hform__message">Habit niet gevonden.</div>

    <form v-else class="hform__form" novalidate @submit.prevent="save">
      <section class="card hform__section">
        <label class="hform__label" for="habit-name">Wat wil je verbeteren?</label>
        <input
          id="habit-name"
          v-model="name"
          class="hform__input"
          type="text"
          maxlength="100"
          placeholder="Bijv. 4x per week sporten"
        >
        <label class="hform__label hform__label--spaced" for="habit-why">Zodat…</label>
        <input
          id="habit-why"
          v-model="why"
          class="hform__input"
          type="text"
          maxlength="500"
          placeholder="ik me fitter voel (optioneel)"
        >
      </section>

      <section class="card hform__section">
        <div class="hform__label">Type</div>
        <div v-if="!isEdit" class="hform__options" role="radiogroup" aria-label="Type">
          <label
            v-for="k in KINDS"
            :key="k"
            class="hform__option"
            :class="{ 'hform__option--active': kind === k }"
          >
            <input v-model="kind" class="hform__radio" type="radio" name="kind" :value="k">
            <span class="hform__option-text">
              <span class="hform__option-title">{{ KIND_LABELS[k] }}</span>
              <span class="hform__option-desc">{{ KIND_DESCRIPTIONS[k] }}</span>
            </span>
          </label>
        </div>
        <p v-else class="hform__fixed">
          {{ KIND_LABELS[kind] }}: {{ KIND_DESCRIPTIONS[kind].toLowerCase() }}
          <span class="hform__hint">Het type ligt vast; maak een nieuwe habit om het te wijzigen.</span>
        </p>
      </section>

      <section class="card hform__section">
        <label class="hform__label" for="habit-target">Doel</label>
        <div class="hform__target">
          <span>{{ TARGET_TEXT[kind].prefix }}</span>
          <input
            id="habit-target"
            v-model.number="target"
            class="hform__input hform__input--number"
            type="number"
            :min="TARGET_RANGE[kind].min"
            :max="TARGET_RANGE[kind].max"
            :step="TARGET_RANGE[kind].step"
            inputmode="decimal"
          >
          <span>{{ TARGET_TEXT[kind].suffix }}</span>
        </div>
        <p v-if="kind === 'weight'" class="hform__hint">Negatief voor afvallen, bijv. −0,5.</p>
        <p v-if="isEdit" class="hform__hint">Een nieuw doel geldt vanaf deze week; eerdere weken houden hun doel.</p>
      </section>

      <section v-if="kind === 'do'" class="card hform__section">
        <label class="hform__label" for="habit-auto">Automatisch afvinken</label>
        <select id="habit-auto" v-model="autoSource" class="hform__input">
          <option :value="null">Nee, alleen zelf afvinken</option>
          <option value="workouts">Op dagen met een opgeslagen workout</option>
          <option value="weight">Op dagen dat ik mijn gewicht log</option>
        </select>
        <p class="hform__hint">Automatisch afgevinkte dagen kun je altijd zelf aanpassen.</p>
      </section>

      <section class="card hform__section">
        <label class="hform__label" for="habit-start">Startdatum</label>
        <input id="habit-start" v-model="startDate" class="hform__input" type="date" :max="today">
        <p class="hform__hint">Kies een eerdere datum als je terug wilt invullen.</p>
      </section>

      <p v-if="shownError" class="hform__error" role="alert">{{ shownError }}</p>

      <button class="hform__submit" type="submit" :disabled="saving">
        {{ isEdit ? 'Opslaan' : 'Habit toevoegen' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHabitsStore } from '@/stores/habits'
import { todayLocalIso, weekStartIso } from '@/utils/dates'
import { targetForWeek } from '@/utils/habitWeek'
import { KIND_DESCRIPTIONS, KIND_LABELS } from '@/content/habitCopy'
import type { HabitAutoSource, HabitKind } from '@/types/habits'

const KINDS: HabitKind[] = ['do', 'avoid', 'weight']

const TARGET_TEXT: Record<HabitKind, { prefix: string; suffix: string }> = {
  do: { prefix: 'Minstens', suffix: 'dagen per week' },
  avoid: { prefix: 'Hoogstens', suffix: 'dagen per week niet gelukt' },
  weight: { prefix: 'Hoogstens', suffix: 'kg verandering per week' },
}

const TARGET_RANGE: Record<HabitKind, { min: number; max: number; step: number; integer: boolean }> = {
  do: { min: 1, max: 7, step: 1, integer: true },
  avoid: { min: 0, max: 6, step: 1, integer: true },
  weight: { min: -5, max: 5, step: 0.1, integer: false },
}

const DEFAULT_TARGET: Record<HabitKind, number> = { do: 3, avoid: 1, weight: 0.3 }

const route = useRoute()
const router = useRouter()
const store = useHabitsStore()
const today = todayLocalIso()

const habitId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => habitId.value !== null)
const habit = computed(() => store.habits.find((h) => h.id === habitId.value) ?? null)

const name = ref('')
const why = ref('')
const kind = ref<HabitKind>('do')
const target = ref<number | ''>(DEFAULT_TARGET.do)
const autoSource = ref<HabitAutoSource | null>(null)
const startDate = ref(today)
const saving = ref(false)
const submitted = ref(false)
let originalTarget: number | null = null

watch(kind, (k) => {
  if (!isEdit.value) target.value = DEFAULT_TARGET[k]
})

const validationError = computed(() => {
  if (!name.value.trim()) return 'Geef je habit een naam.'
  const range = TARGET_RANGE[kind.value]
  const value = target.value
  if (value === '' || !Number.isFinite(value)) return 'Vul een doel in.'
  if (range.integer && !Number.isInteger(value)) return 'Het doel moet een heel getal zijn.'
  if (value < range.min || value > range.max) return `Kies een doel tussen ${range.min} en ${range.max}.`
  if (!startDate.value) return 'Kies een startdatum.'
  if (startDate.value > today) return 'De startdatum kan niet in de toekomst liggen.'
  return null
})

const shownError = computed(() => (submitted.value ? validationError.value : null) ?? store.error)

function goBack() {
  void router.push(isEdit.value ? `/habits/${habitId.value}` : '/habits')
}

function fillFromHabit() {
  const h = habit.value
  if (!h) return
  name.value = h.name
  why.value = h.why ?? ''
  kind.value = h.kind
  autoSource.value = h.auto_source
  startDate.value = h.start_date
  originalTarget = targetForWeek(store.historyFor(h).targets, weekStartIso(today))
  target.value = originalTarget ?? DEFAULT_TARGET[h.kind]
}

async function save() {
  submitted.value = true
  if (validationError.value || target.value === '') return
  saving.value = true
  const value = Math.round(target.value * 100) / 100
  const fields = {
    name: name.value.trim(),
    why: why.value.trim() || null,
    auto_source: kind.value === 'do' ? autoSource.value : null,
    start_date: startDate.value,
  }

  if (!isEdit.value) {
    const created = await store.createHabit({ ...fields, kind: kind.value, target: value })
    saving.value = false
    if (created) void router.push('/habits')
    return
  }

  const id = habitId.value!
  let ok = await store.updateHabit(id, fields)
  if (ok && value !== originalTarget) ok = await store.setTarget(id, value, today)
  saving.value = false
  if (ok) void router.push(`/habits/${id}`)
}

onMounted(async () => {
  store.error = null
  await store.load()
  fillFromHabit()
})
</script>

<style scoped>
.hform {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.hform__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.hform__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.hform__header-text {
  flex: 1;
  min-width: 0;
}

.hform__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.hform__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.hform__message {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.hform__form {
  padding: 0 16px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.hform__section {
  padding: 16px;
}

.hform__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.hform__label--spaced {
  margin-top: 14px;
}

.hform__input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  color: var(--color-text);
  font-size: 16px;
}

.hform__input--number {
  width: 76px;
  flex-shrink: 0;
  text-align: center;
}

.hform__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hform__option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1.5px solid var(--color-hairline);
  border-radius: 12px;
  cursor: pointer;
}

.hform__option--active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.hform__radio {
  margin-top: 3px;
  accent-color: var(--color-primary);
}

.hform__option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hform__option-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.hform__option-desc {
  font-size: 13px;
  color: var(--color-text-2);
}

.hform__fixed {
  margin: 0;
  font-size: 15px;
  color: var(--color-text);
}

.hform__target {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  color: var(--color-text);
}

.hform__hint {
  display: block;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}

.hform__error {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--color-up);
}

.hform__submit {
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 14px;
  background: var(--color-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.hform__submit:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
