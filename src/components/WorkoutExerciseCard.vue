<template>
  <div class="we-card">
    <div class="we-card__header">
      <div class="we-card__title-block">
        <div class="we-card__title-row">
          <button class="we-card__name" @click="$emit('detail', workoutExercise)">
            {{ workoutExercise.exercise?.name }}
          </button>
          <span class="we-card__badge" :class="`we-card__badge--${workoutExercise.exercise?.type}`">
            {{ workoutExercise.exercise?.type === 'strength' ? 'Kracht' : 'Uithouding' }}
          </span>
        </div>
        <p v-if="templateNote" class="we-card__subtitle">{{ templateNote }}</p>
      </div>
      <button class="we-card__remove" title="Verwijder oefening" @click="handleRemoveClick">×</button>
    </div>

    <!-- Previous session reference -->
    <div v-if="previousSets.length > 0" class="we-card__prev">
      <div class="we-card__prev-head">
        <div class="we-card__prev-label">Vorige keer</div>
        <button
          class="we-card__prev-apply"
          type="button"
          title="Vul huidige sets in met vorige keer"
          :disabled="applyingPrevious"
          @click="handleApplyPrevious"
        >
          ↓
        </button>
      </div>
      <div v-for="s in previousSets" :key="s.id" class="we-card__prev-row">
        <span class="we-card__set-num">{{ s.set_number }}</span>
        <template v-if="workoutExercise.exercise?.type === 'strength'">
          <span>{{ s.weight_kg ?? '—' }} kg</span>
          <span>{{ s.reps ?? '—' }} reps</span>
        </template>
        <template v-else>
          <span>{{ formatDuration(s.duration_seconds) }}</span>
          <span v-if="s.distance_km != null">{{ s.distance_km }} km</span>
        </template>
      </div>
    </div>

    <!-- Current sets -->
    <div class="we-card__sets">
      <div v-if="sets.length === 0" class="we-card__sets-empty">Nog geen sets gelogd.</div>
      <div v-for="(s, idx) in sets" :key="s.id" class="we-card__set-row">
        <span class="we-card__set-num">{{ idx + 1 }}</span>

        <template v-if="workoutExercise.exercise?.type === 'strength'">
          <input
            class="we-card__input"
            type="text"
            inputmode="decimal"
            placeholder="kg"
            :value="s.weight_kg ?? ''"
            @change="updateSet(s.id, 'weight_kg', $event)"
          >
          <input
            class="we-card__input"
            type="number"
            inputmode="numeric"
            placeholder="reps"
            :value="s.reps ?? ''"
            @change="updateSet(s.id, 'reps', $event)"
          >
        </template>

        <template v-else>
          <input
            class="we-card__input we-card__input--wide"
            type="number"
            inputmode="numeric"
            placeholder="seconden"
            :value="s.duration_seconds ?? ''"
            @change="updateSet(s.id, 'duration_seconds', $event)"
          >
          <input
            class="we-card__input"
            type="text"
            inputmode="decimal"
            placeholder="km"
            :value="s.distance_km ?? ''"
            @change="updateSet(s.id, 'distance_km', $event)"
          >
        </template>

        <button class="we-card__del" @click="handleDeleteSet(s.id)">−</button>
      </div>
    </div>

    <button class="we-card__add-set" @click="handleAddSet">+ Set toevoegen</button>

    <!-- Extra data accordion -->
    <button class="we-card__accordion-toggle" @click="accordionOpen = !accordionOpen">
      <span>{{ accordionOpen ? 'Verberg extra' : 'Extra notities & pijn' }}</span>
      <span class="we-card__accordion-indicator" :class="{ 'we-card__accordion-indicator--open': accordionOpen }">›</span>
    </button>

    <div v-if="accordionOpen" class="we-card__accordion">
      <div class="we-card__accordion-field">
        <label class="we-card__accordion-label">Pijnniveau (1–10)</label>
        <div class="we-card__pain-row">
          <button
            v-for="n in 10"
            :key="n"
            class="we-card__pain-btn"
            :class="{ 'we-card__pain-btn--active': localPainScale === n }"
            @click="setPainScale(n)"
          >{{ n }}</button>
          <button
            v-if="localPainScale !== null"
            class="we-card__pain-clear"
            @click="setPainScale(null)"
          >×</button>
        </div>
      </div>

      <div class="we-card__accordion-field">
        <label class="we-card__accordion-label">Notities</label>
        <textarea
          v-model="localNotes"
          class="we-card__notes"
          placeholder="Bijv. schouder voelde stijf, goede pomp..."
          rows="3"
          @blur="saveExtra"
        />
      </div>
    </div>

    <ConfirmModal
      v-if="showRemoveConfirm"
      title="Oefening verwijderen"
      :message="`Weet je zeker dat je “${workoutExercise.exercise?.name}” uit deze workout wilt verwijderen? Gelogde sets gaan verloren.`"
      confirm-label="Verwijderen"
      danger
      @confirm="confirmRemove"
      @cancel="showRemoveConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { WorkoutExercise, ExerciseSet } from '@/types/fitness'
import { useExerciseSets } from '@/composables/useExerciseSets'
import ConfirmModal from '@/components/ConfirmModal.vue'

const props = defineProps<{
  workoutExercise: WorkoutExercise
  templateNote?: string | null
  /** Current sets, loaded in bulk by the parent (no per-card fetch). */
  initialSets?: ExerciseSet[]
  /** Previous-session sets for the "vorige keer" reference; may arrive after mount. */
  previousSets?: ExerciseSet[]
  onUpdateExtra: (id: number, payload: { notes?: string | null; pain_scale?: number | null }) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'remove', id: number): void
  (e: 'detail', we: WorkoutExercise): void
  (e: 'logged-sets-change', hasLogged: boolean): void
}>()

const { sets, addSet, updateSet: updateSetData, deleteSet, applyPreviousSets } = useExerciseSets()

const previousSets = computed(() => props.previousSets ?? [])

const accordionOpen = ref(false)
const applyingPrevious = ref(false)
const showRemoveConfirm = ref(false)
const localNotes = ref<string>(props.workoutExercise.notes ?? '')
const localPainScale = ref<number | null>(props.workoutExercise.pain_scale ?? null)

onMounted(async () => {
  // Sets are provided by the parent in one bulk fetch; seed local state from them.
  sets.value = [...(props.initialSets ?? [])]
  if (sets.value.length === 0) {
    await handleAddSet()
  }
})

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

async function handleAddSet() {
  const nextNum = sets.value.length + 1
  const prev = sets.value[sets.value.length - 1] as ExerciseSet | undefined
  await addSet(props.workoutExercise.id, {
    set_number: nextNum,
    weight_kg: prev?.weight_kg ?? null,
    reps: prev?.reps ?? null,
    duration_seconds: prev?.duration_seconds ?? null,
    distance_km: prev?.distance_km ?? null,
  })
}

async function handleDeleteSet(id: number) {
  await deleteSet(id)
}

async function handleApplyPrevious() {
  if (previousSets.value.length === 0 || applyingPrevious.value) return
  applyingPrevious.value = true
  await applyPreviousSets(props.workoutExercise.id, previousSets.value)
  applyingPrevious.value = false
}

function hasLoggedSets(): boolean {
  return sets.value.some(
    (s) =>
      s.weight_kg != null ||
      s.reps != null ||
      s.duration_seconds != null ||
      s.distance_km != null,
  )
}

function hasLoggedData(): boolean {
  if (localNotes.value.trim()) return true
  if (localPainScale.value != null) return true
  return hasLoggedSets()
}

watch(
  sets,
  () => {
    emit('logged-sets-change', hasLoggedSets())
  },
  { deep: true, immediate: true },
)

function handleRemoveClick() {
  if (hasLoggedData()) {
    showRemoveConfirm.value = true
  } else {
    emit('remove', props.workoutExercise.id)
  }
}

function confirmRemove() {
  showRemoveConfirm.value = false
  emit('remove', props.workoutExercise.id)
}

const DECIMAL_FIELDS = new Set(['weight_kg', 'distance_km'])

function parseSetValue(raw: string, field: string): number | null {
  if (raw.trim() === '') return null
  const normalized = DECIMAL_FIELDS.has(field) ? raw.replace(',', '.') : raw
  const num = Number(normalized)
  return Number.isNaN(num) ? null : num
}

function updateSet(id: number, field: string, event: Event) {
  const input = event.target as HTMLInputElement
  const num = parseSetValue(input.value, field)
  updateSetData(id, { [field]: num })
  input.value = num == null ? '' : String(num)
}

async function setPainScale(n: number | null) {
  localPainScale.value = n
  await props.onUpdateExtra(props.workoutExercise.id, {
    notes: localNotes.value || null,
    pain_scale: n,
  })
}

async function saveExtra() {
  await props.onUpdateExtra(props.workoutExercise.id, {
    notes: localNotes.value || null,
    pain_scale: localPainScale.value,
  })
}
</script>

<style scoped>
.we-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 16px 18px 14px;
}

.we-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.we-card__title-block {
  flex: 1;
  min-width: 0;
}

.we-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.we-card__subtitle {
  font-size: 13px;
  color: var(--color-text-2);
  margin: 3px 0 0;
}

.we-card__name {
  background: none;
  border: none;
  padding: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.we-card__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
}

.we-card__badge--strength {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.we-card__badge--endurance {
  background: var(--color-down-soft);
  color: var(--color-down);
}

.we-card__remove {
  background: var(--color-chip);
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  font-size: 17px;
  color: var(--color-text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 8px;
}

/* Previous sets */
.we-card__prev {
  background: var(--color-card-2);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.we-card__prev-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.we-card__prev-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
}

.we-card__prev-apply {
  background: var(--color-primary-soft);
  border: none;
  border-radius: 8px;
  width: 28px;
  height: 28px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: var(--font);
  line-height: 1;
}

.we-card__prev-apply:disabled {
  opacity: 0.4;
  cursor: default;
}

.we-card__prev-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-2);
  padding: 3px 0;
}

/* Current sets */
.we-card__sets-empty {
  font-size: 14px;
  color: var(--color-text-3);
  margin-bottom: 10px;
}

.we-card__set-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.we-card__set-num {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-3);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.we-card__input {
  flex: 1;
  height: 38px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 10px;
  font-size: 16px;
  font-family: var(--font);
  color: var(--color-text);
  min-width: 0;
}

.we-card__input--wide {
  flex: 2;
}

.we-card__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.we-card__del {
  background: var(--color-up-soft);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  font-size: 18px;
  color: var(--color-up);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.we-card__add-set {
  width: 100%;
  margin-top: 6px;
  background: var(--color-primary-soft);
  border: none;
  border-radius: 10px;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
}

/* Accordion */
.we-card__accordion-toggle {
  width: 100%;
  margin-top: 10px;
  background: none;
  border: none;
  border-top: 1px solid var(--color-hairline);
  padding: 10px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font);
}

.we-card__accordion-indicator {
  display: inline-block;
  transition: transform 200ms;
  font-size: 16px;
}

.we-card__accordion-indicator--open {
  transform: rotate(90deg);
}

.we-card__accordion {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.we-card__accordion-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.we-card__accordion-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
}

.we-card__pain-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
}

.we-card__pain-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--color-hairline);
  background: var(--color-card-2);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  cursor: pointer;
  font-family: var(--font);
}

.we-card__pain-btn--active {
  background: var(--color-up-soft);
  border-color: var(--color-up);
  color: var(--color-up);
}

.we-card__pain-clear {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--color-chip);
  font-size: 14px;
  color: var(--color-text-3);
  cursor: pointer;
  font-family: var(--font);
}

.we-card__notes {
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

.we-card__notes:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
