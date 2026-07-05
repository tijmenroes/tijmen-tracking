<template>
  <div class="exercises">
    <div class="exercises__header">
      <button class="exercises__back" @click="router.push('/')">‹</button>
      <div>
        <div class="exercises__supra">Beheer</div>
        <h1 class="exercises__title">Oefeningen</h1>
      </div>
    </div>

    <div v-if="!isAdmin" class="exercises__no-access">
      Alleen admins kunnen oefeningen beheren.
    </div>

    <div v-else class="exercises__content">
      <!-- Add form -->
      <div class="exercises__form card">
        <div class="exercises__form-row">
          <input
            v-model="newName"
            class="exercises__input"
            type="text"
            placeholder="Naam oefening"
            @keydown.enter="handleCreate"
          >
          <select v-model="newType" class="exercises__select">
            <option value="strength">Kracht</option>
            <option value="endurance">Uithouding</option>
          </select>
        </div>

        <!-- Tag selection -->
        <div class="exercises__tags-label">Spiergroepen / tags</div>
        <TagSelector
          v-model="selectedTagIds"
          :tags="tags"
          class="exercises__tagsel"
          @create="handleCreateTag"
        />

        <button
          class="exercises__create-btn"
          :disabled="!newName.trim()"
          @click="handleCreate"
        >
          Aanmaken
        </button>
        <div v-if="error" class="exercises__error">{{ error }}</div>
      </div>

      <!-- Search + tag filter -->
      <ExerciseFilterBar v-model:query="query" v-model:filter-tag-id="filterTagId" :tags="tags" />

      <!-- List -->
      <div v-if="loading" class="exercises__loading">Laden…</div>
      <ul v-else class="exercises__list">
        <li v-for="ex in filteredExercises" :key="ex.id" class="exercises__item">
          <div class="exercises__item-info">
            <div class="exercises__item-top">
              <span class="exercises__item-name">{{ ex.name }}</span>
              <span class="exercises__item-badge" :class="`exercises__item-badge--${ex.type}`">
                {{ ex.type === 'strength' ? 'Kracht' : 'Uithouding' }}
              </span>
            </div>
            <div v-if="ex.tags && ex.tags.length" class="exercises__item-tags">
              <span v-for="tag in ex.tags" :key="tag.id" class="exercises__item-tag">{{ tag.name }}</span>
            </div>
          </div>
          <button class="exercises__item-edit" title="Aanpassen" @click="openEdit(ex)">✎</button>
          <button class="exercises__item-del" title="Verwijderen" @click="confirmTarget = ex">×</button>
        </li>
        <li v-if="exercises.length === 0" class="exercises__empty">Nog geen oefeningen.</li>
        <li v-else-if="filteredExercises.length === 0" class="exercises__empty">Geen oefeningen gevonden.</li>
      </ul>
    </div>

    <!-- Delete confirmation -->
    <ConfirmModal
      v-if="confirmTarget"
      title="Oefening verwijderen"
      :message="`Weet je zeker dat je “${confirmTarget.name}” wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`"
      confirm-label="Verwijderen"
      danger
      @confirm="handleDelete"
      @cancel="confirmTarget = null"
    />

    <!-- Edit exercise -->
    <BaseModal v-if="editTarget" title="Oefening aanpassen" @close="editTarget = null">
      <div class="exercises__form-row">
        <input v-model="editName" class="exercises__input" type="text" placeholder="Naam oefening">
        <select v-model="editType" class="exercises__select">
          <option value="strength">Kracht</option>
          <option value="endurance">Uithouding</option>
        </select>
      </div>
      <div class="exercises__tags-label">Spiergroepen / tags</div>
      <TagSelector v-model="editTagIds" :tags="tags" @create="handleCreateTagEdit" />
      <template #footer>
        <button class="exercises__modal-btn exercises__modal-btn--cancel" @click="editTarget = null">
          Annuleren
        </button>
        <button
          class="exercises__modal-btn exercises__modal-btn--primary"
          :disabled="!editName.trim()"
          @click="handleSaveEdit"
        >
          Opslaan
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { useExercises } from '@/composables/useExercises'
import { useTags } from '@/composables/useTags'
import { filterExercises } from '@/utils/exerciseSearch'
import TagSelector from '@/components/TagSelector.vue'
import ExerciseFilterBar from '@/components/ExerciseFilterBar.vue'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import type { Exercise } from '@/types/fitness'

const router = useRouter()
const profileStore = useProfileStore()
const { isAdmin } = storeToRefs(profileStore)
const { exercises, loading, error, fetchExercises, createExercise, updateExercise, updateExerciseTags, deleteExercise } = useExercises()
const { tags, fetchTags, createTag } = useTags()

const newName = ref('')
const newType = ref<Exercise['type']>('strength')
const selectedTagIds = ref<number[]>([])

const query = ref('')
const filterTagId = ref<number | null>(null)
const filteredExercises = computed(() => filterExercises(exercises.value, query.value, filterTagId.value))

const confirmTarget = ref<Exercise | null>(null)

const editTarget = ref<Exercise | null>(null)
const editName = ref('')
const editType = ref<Exercise['type']>('strength')
const editTagIds = ref<number[]>([])

onMounted(async () => {
  await profileStore.load()
  await Promise.all([fetchExercises(), fetchTags()])
})

async function handleCreateTag(name: string) {
  const tag = await createTag(name)
  if (tag) selectedTagIds.value = [...selectedTagIds.value, tag.id]
}

async function handleCreate() {
  if (!newName.value.trim()) return
  await createExercise(newName.value, newType.value, selectedTagIds.value)
  newName.value = ''
  selectedTagIds.value = []
}

async function handleDelete() {
  if (!confirmTarget.value) return
  await deleteExercise(confirmTarget.value.id)
  confirmTarget.value = null
}

function openEdit(ex: Exercise) {
  editTarget.value = ex
  editName.value = ex.name
  editType.value = ex.type
  editTagIds.value = (ex.tags ?? []).map((t) => t.id)
}

async function handleCreateTagEdit(name: string) {
  const tag = await createTag(name)
  if (tag) editTagIds.value = [...editTagIds.value, tag.id]
}

async function handleSaveEdit() {
  if (!editTarget.value || !editName.value.trim()) return
  const id = editTarget.value.id
  await updateExercise(id, { name: editName.value, type: editType.value })
  await updateExerciseTags(id, editTagIds.value)
  editTarget.value = null
}
</script>

<style scoped>
.exercises {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.exercises__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.exercises__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.exercises__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.exercises__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.exercises__no-access {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.exercises__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 16px 18px;
}

.exercises__form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.exercises__input {
  flex: 2;
  height: 42px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 12px;
  font-size: 15px;
  font-family: var(--font);
  color: var(--color-text);
  min-width: 0;
}

.exercises__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.exercises__select {
  flex: 1;
  height: 42px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 8px;
  font-size: 14px;
  font-family: var(--font);
  color: var(--color-text);
  min-width: 0;
}

.exercises__tags-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  margin-bottom: 8px;
}

.exercises__tagsel {
  margin-bottom: 12px;
}

.exercises__create-btn {
  width: 100%;
  height: 44px;
  background: var(--color-primary);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  font-family: var(--font);
}

.exercises__create-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.exercises__error {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-up);
}

.exercises__loading {
  padding: 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.exercises__list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.exercises__item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
  gap: 12px;
}

.exercises__item:last-child {
  border-bottom: none;
}

.exercises__item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.exercises__item-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exercises__item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.exercises__item-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
  background: var(--color-chip);
  color: var(--color-text-2);
}

.exercises__item-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.exercises__item-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
}

.exercises__item-badge--strength {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.exercises__item-badge--endurance {
  background: var(--color-down-soft);
  color: var(--color-down);
}

.exercises__item-edit,
.exercises__item-del {
  background: var(--color-chip);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 15px;
  color: var(--color-text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.exercises__item-del {
  font-size: 17px;
}

.exercises__modal-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.exercises__modal-btn--cancel {
  background: var(--color-chip);
  color: var(--color-text);
}

.exercises__modal-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.exercises__modal-btn--primary:disabled {
  opacity: 0.4;
  cursor: default;
}

.exercises__empty {
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-2);
}
</style>
