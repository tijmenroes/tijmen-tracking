<template>
  <div class="picker-backdrop" @click.self="confirm">
    <div class="picker-sheet">
      <div class="picker-sheet__handle" />
      <div class="picker-sheet__header">
        <h2 class="picker-sheet__title">Oefening toevoegen</h2>
        <button class="picker-sheet__close" type="button" @click="confirm">×</button>
      </div>

      <div class="picker-sheet__filter">
        <ExerciseFilterBar
          v-model:query="query"
          v-model:filter-tag-id="filterTagId"
          v-model:sort-by="sortBy"
          :tags="tags"
          show-sort
        />
      </div>

      <div class="picker-sheet__body">
        <div v-if="loading" class="picker-sheet__empty">Laden…</div>
        <div v-else-if="exercises.length === 0" class="picker-sheet__empty">
          Nog geen oefeningen aangemaakt.
        </div>
        <div v-else-if="filtered.length === 0" class="picker-sheet__empty">
          Geen oefeningen voor deze filters.
        </div>

        <ul v-else class="picker-list">
          <li
            v-for="ex in filtered"
            :key="ex.id"
            class="picker-list__item"
            :class="{ 'picker-list__item--selected': isSelected(ex.id) }"
            @click="toggle(ex.id)"
          >
            <span class="picker-list__check" :class="{ 'picker-list__check--on': isSelected(ex.id) }"
              >✓</span
            >
            <div class="picker-list__info">
              <span class="picker-list__name">{{ ex.name }}</span>
              <div v-if="ex.tags && ex.tags.length" class="picker-list__tags">
                <span v-for="tag in ex.tags" :key="tag.id" class="picker-list__tag">{{
                  tag.name
                }}</span>
              </div>
            </div>
            <span v-if="sortBy === 'frequency'" class="picker-list__count">{{ usageCount(ex.id) }}</span>
          </li>
        </ul>
      </div>

      <div class="picker-sheet__footer">
        <button class="picker-sheet__confirm" type="button" @click="confirm">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import type { Exercise, Tag } from '@/types/fitness'
import { filterExercises, sortExercises, type ExerciseSortMode } from '@/utils/exerciseSearch'
import { useExercisesStore } from '@/stores/exercises'
import ExerciseFilterBar from '@/components/ExerciseFilterBar.vue'

const props = defineProps<{ exercises: Exercise[]; tags: Tag[]; loading: boolean }>()
const emit = defineEmits<{ (e: 'confirm', exercises: Exercise[]): void }>()

const exercisesStore = useExercisesStore()
const { usageCounts } = storeToRefs(exercisesStore)
const { fetchUsageCounts, getUsageCount } = exercisesStore

const query = ref('')
const filterTagId = ref<number | null>(null)
const sortBy = ref<ExerciseSortMode>('name')
const selectedIds = ref<number[]>([])

const filtered = computed(() => {
  const matches = filterExercises(props.exercises, query.value, filterTagId.value)
  return sortExercises(matches, sortBy.value, usageCounts.value)
})

function usageCount(exerciseId: number) {
  return getUsageCount(exerciseId)
}

onMounted(() => {
  void fetchUsageCounts()
})

const confirmLabel = computed(() =>
  selectedIds.value.length > 0 ? `Toevoegen (${selectedIds.value.length})` : 'Toevoegen',
)

function isSelected(id: number) {
  return selectedIds.value.includes(id)
}

function toggle(id: number) {
  const i = selectedIds.value.indexOf(id)
  if (i === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(i, 1)
}

function confirm() {
  const byId = new Map(props.exercises.map((ex) => [ex.id, ex]))
  const selected = selectedIds.value
    .map((id) => byId.get(id))
    .filter((ex): ex is Exercise => ex != null)
  emit('confirm', selected)
}
</script>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(14, 11, 26, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.picker-sheet {
  width: 100%;
  height: 80dvh;
  background: var(--color-card);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  padding: 0 0 env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-sheet__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-hairline);
  margin: 10px auto 0;
  flex-shrink: 0;
}

.picker-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 8px;
  flex-shrink: 0;
}

.picker-sheet__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.picker-sheet__close {
  background: var(--color-chip);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-sheet__filter {
  padding: 4px 20px 12px;
  flex-shrink: 0;
}

.picker-sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.picker-sheet__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-2);
  font-size: 15px;
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 0 16px;
  flex: 1;
}

.picker-list__item {
  display: flex;
  align-items: center;
  padding: 14px 4px;
  border-bottom: 1px solid var(--color-hairline);
  cursor: pointer;
  gap: 10px;
}

.picker-list__item:last-child {
  border-bottom: none;
}

.picker-list__item--selected {
  background: var(--color-primary-soft);
  margin: 0 -4px;
  padding-left: 8px;
  padding-right: 8px;
  border-radius: 10px;
  border-bottom-color: transparent;
}

.picker-list__check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--color-hairline);
  background: var(--color-card-2);
  color: transparent;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.picker-list__check--on {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.picker-list__info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.picker-list__name {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
}

.picker-list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.picker-list__tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
  background: var(--color-chip);
  color: var(--color-text-2);
}

.picker-list__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}

.picker-list__badge--strength {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.picker-list__badge--endurance {
  background: var(--color-down-soft);
  color: var(--color-down);
}

.picker-list__count {
  font-size: 13px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
  background: var(--color-chip);
  color: var(--color-text-2);
  min-width: 28px;
  text-align: center;
}

.picker-sheet__footer {
  padding: 12px 20px 20px;
  flex-shrink: 0;
  border-top: 1px solid var(--color-hairline);
}

.picker-sheet__confirm {
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
</style>
