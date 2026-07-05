<template>
  <BaseModal title="Workout aanpassen" @close="$emit('close')">
    <div class="workout-edit__field">
      <label class="workout-edit__label" for="workout-edit-name">Naam (optioneel)</label>
      <input
        id="workout-edit-name"
        v-model="localName"
        class="workout-edit__input"
        type="text"
        placeholder="Bijv. Push A"
      >
    </div>
    <div class="workout-edit__field">
      <label class="workout-edit__label" for="workout-edit-date">Datum</label>
      <input
        id="workout-edit-date"
        v-model="localDate"
        class="workout-edit__input"
        type="date"
        required
      >
    </div>
    <div v-if="allowSaveAsTemplate" class="workout-edit__checkbox-row">
      <label class="workout-edit__checkbox-label">
        <input
          v-model="saveAsTemplate"
          class="workout-edit__checkbox"
          type="checkbox"
          :disabled="!hasExercises"
        >
        Opslaan als template
      </label>
      <p v-if="!hasExercises" class="workout-edit__hint">Voeg eerst oefeningen toe om als template op te slaan.</p>
    </div>
    <p v-if="saveError" class="workout-edit__error">{{ saveError }}</p>
    <template #footer>
      <button class="workout-edit__btn workout-edit__btn--cancel" type="button" @click="$emit('close')">
        Annuleren
      </button>
      <button
        class="workout-edit__btn workout-edit__btn--primary"
        type="button"
        :disabled="!localDate"
        @click="handleSave"
      >
        Opslaan
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import type { Workout } from '@/types/fitness'

const props = defineProps<{
  workout: Workout
  allowSaveAsTemplate?: boolean
  hasExercises?: boolean
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { name: string | null; date: string; saveAsTemplate: boolean }): void
}>()

const localName = ref('')
const localDate = ref('')
const saveAsTemplate = ref(false)
const saveError = ref<string | null>(null)

watch(
  () => props.workout,
  (wk) => {
    localName.value = wk.name ?? ''
    localDate.value = wk.date
    saveAsTemplate.value = false
    saveError.value = null
  },
  { immediate: true },
)

function handleSave() {
  if (!localDate.value) return
  saveError.value = null
  emit('save', {
    name: localName.value.trim() || null,
    date: localDate.value,
    saveAsTemplate: saveAsTemplate.value,
  })
}
</script>

<style scoped>
.workout-edit__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.workout-edit__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-3);
}

.workout-edit__input {
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

.workout-edit__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.workout-edit__checkbox-row {
  margin-bottom: 14px;
}

.workout-edit__checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
}

.workout-edit__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.workout-edit__hint {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 6px 0 0 28px;
}

.workout-edit__error {
  font-size: 13px;
  color: var(--color-up);
  margin: 0;
}

.workout-edit__btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.workout-edit__btn--cancel {
  background: var(--color-chip);
  color: var(--color-text);
}

.workout-edit__btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.workout-edit__btn--primary:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
