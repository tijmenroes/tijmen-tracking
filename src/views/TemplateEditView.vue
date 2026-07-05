<template>
  <div class="tedit">
    <div class="tedit__header">
      <button class="tedit__back" @click="router.push(`/workout/templates/${templateId}`)">‹</button>
      <div class="tedit__header-text">
        <div class="tedit__supra">Template</div>
        <h1 class="tedit__title">{{ template?.name ?? '…' }}</h1>
      </div>
      <button class="tedit__rename" type="button" title="Naam wijzigen" @click="openRename">✎</button>
    </div>

    <div v-if="loading" class="tedit__muted">Laden…</div>
    <div v-else-if="error" class="tedit__error">{{ error }}</div>

    <div v-else class="tedit__content">
      <div v-if="templateExercises.length === 0" class="tedit__empty">
        Nog geen oefeningen. Voeg er een toe!
      </div>

      <ul v-else class="tedit__list card">
        <li v-for="te in templateExercises" :key="te.id" class="tedit__item">
          <span class="tedit__item-name">{{ te.exercise?.name ?? 'Oefening' }}</span>
          <button class="tedit__item-del" type="button" title="Verwijderen" @click="handleRemove(te.id)">×</button>
        </li>
      </ul>

      <button class="tedit__add-btn" @click="showPicker = true">+ Oefening toevoegen</button>
    </div>

    <ExercisePicker
      v-if="showPicker"
      :exercises="exercises"
      :tags="tags"
      :loading="exercisesLoading"
      @confirm="handleConfirmExercises"
    />

    <BaseModal v-if="showRename" title="Template hernoemen" @close="showRename = false">
      <input v-model="renameName" class="tedit__modal-input" type="text" @keydown.enter="handleRename">
      <template #footer>
        <button class="tedit__modal-btn tedit__modal-btn--cancel" @click="showRename = false">Annuleren</button>
        <button
          class="tedit__modal-btn tedit__modal-btn--primary"
          :disabled="!renameName.trim()"
          @click="handleRename"
        >
          Opslaan
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ExercisePicker from '@/components/ExercisePicker.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useWorkoutTemplates } from '@/composables/useWorkoutTemplates'
import { useExercises } from '@/composables/useExercises'
import { useTags } from '@/composables/useTags'
import type { Exercise } from '@/types/fitness'

const router = useRouter()
const route = useRoute()
const templateId = computed(() => Number(route.params.id))

const {
  template,
  templateExercises,
  loading,
  error,
  loadTemplate,
  renameTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
} = useWorkoutTemplates()
const { exercises, loading: exercisesLoading, fetchExercises } = useExercises()
const { tags, fetchTags } = useTags()

const showPicker = ref(false)
const showRename = ref(false)
const renameName = ref('')

onMounted(async () => {
  await loadTemplate(templateId.value)
  await Promise.all([fetchExercises(), fetchTags()])
})

function openRename() {
  renameName.value = template.value?.name ?? ''
  showRename.value = true
}

async function handleRename() {
  if (!renameName.value.trim()) return
  await renameTemplate(templateId.value, renameName.value.trim())
  if (!error.value) showRename.value = false
}

async function handleConfirmExercises(selected: Exercise[]) {
  showPicker.value = false
  for (const ex of selected) {
    await addExerciseToTemplate(templateId.value, ex.id)
  }
}

async function handleRemove(templateExerciseId: number) {
  await removeExerciseFromTemplate(templateExerciseId)
}
</script>

<style scoped>
.tedit {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.tedit__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tedit__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.tedit__header-text {
  flex: 1;
  min-width: 0;
}

.tedit__rename {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-3);
  cursor: pointer;
  margin-top: 20px;
  padding: 4px;
}

.tedit__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.tedit__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.tedit__content {
  padding: 0 16px;
}

.tedit__muted,
.tedit__error {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.tedit__error {
  color: var(--color-up);
}

.tedit__empty {
  text-align: center;
  padding: 40px 0 24px;
  font-size: 15px;
  color: var(--color-text-2);
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  margin-bottom: 16px;
}

.tedit__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tedit__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
}

.tedit__item:last-child {
  border-bottom: none;
}

.tedit__item-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.tedit__item-del {
  background: var(--color-chip);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 17px;
  color: var(--color-text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tedit__add-btn {
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

.tedit__modal-input {
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

.tedit__modal-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.tedit__modal-btn--cancel {
  background: var(--color-chip);
  color: var(--color-text);
}

.tedit__modal-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.tedit__modal-btn--primary:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
