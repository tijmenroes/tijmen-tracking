<template>
  <div class="picker-backdrop" @click.self="$emit('close')">
    <div class="picker-sheet">
      <div class="picker-sheet__handle" />
      <div class="picker-sheet__header">
        <h2 class="picker-sheet__title">Oefening toevoegen</h2>
        <button class="picker-sheet__close" @click="$emit('close')">×</button>
      </div>

      <div class="picker-search">
        <input
          v-model="query"
          class="picker-search__input"
          type="text"
          placeholder="Zoek op naam of alias (bijv. RDL)"
        >
      </div>

      <div v-if="availableTags.length" class="picker-filters">
        <button
          v-for="tag in availableTags"
          :key="tag.id"
          type="button"
          class="picker-filter"
          :class="{ 'picker-filter--on': selectedTagIds.includes(tag.id) }"
          @click="toggleTag(tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>

      <div v-if="loading" class="picker-sheet__empty">Laden…</div>
      <div v-else-if="exercises.length === 0" class="picker-sheet__empty">Nog geen oefeningen aangemaakt.</div>
      <div v-else-if="filtered.length === 0" class="picker-sheet__empty">Geen oefeningen voor deze filters.</div>

      <ul v-else class="picker-list">
        <li
          v-for="ex in filtered"
          :key="ex.id"
          class="picker-list__item"
          @click="$emit('pick', ex)"
        >
          <div class="picker-list__info">
            <span class="picker-list__name">{{ ex.name }}</span>
            <div v-if="ex.tags && ex.tags.length" class="picker-list__tags">
              <span v-for="tag in ex.tags" :key="tag.id" class="picker-list__tag">{{ tag.name }}</span>
            </div>
          </div>
          <span class="picker-list__badge" :class="`picker-list__badge--${ex.type}`">
            {{ ex.type === 'strength' ? 'Kracht' : 'Uithoudingsvermogen' }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Exercise, Tag } from '@/types/fitness'
import { matchesExerciseQuery } from '@/utils/exerciseSearch'

const props = defineProps<{ exercises: Exercise[]; loading: boolean }>()
defineEmits<{ (e: 'close'): void; (e: 'pick', exercise: Exercise): void }>()

const selectedTagIds = ref<number[]>([])
const query = ref('')

// Distinct tags across the available exercises, sorted by name.
const availableTags = computed<Tag[]>(() => {
  const seen = new Map<number, Tag>()
  for (const ex of props.exercises) {
    for (const tag of ex.tags ?? []) {
      if (!seen.has(tag.id)) seen.set(tag.id, tag)
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
})

// Text search (name or alias) AND tag filter (ANY selected tag).
const filtered = computed(() =>
  props.exercises.filter((ex) => {
    if (!matchesExerciseQuery(ex, query.value)) return false
    if (selectedTagIds.value.length && !(ex.tags ?? []).some((tag) => selectedTagIds.value.includes(tag.id))) return false
    return true
  }),
)

function toggleTag(id: number) {
  const i = selectedTagIds.value.indexOf(id)
  if (i === -1) selectedTagIds.value.push(id)
  else selectedTagIds.value.splice(i, 1)
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
  max-height: 80dvh;
  background: var(--color-card);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  padding: 0 0 calc(24px + env(safe-area-inset-bottom));
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

.picker-sheet__empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-2);
  font-size: 15px;
}

.picker-search {
  padding: 4px 20px 8px;
  flex-shrink: 0;
}

.picker-search__input {
  width: 100%;
  height: 42px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 12px;
  font-size: 15px;
  font-family: var(--font);
  color: var(--color-text);
  box-sizing: border-box;
}

.picker-search__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.picker-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 20px 12px;
  flex-shrink: 0;
}

.picker-filter {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--color-hairline);
  background: var(--color-chip);
  color: var(--color-text-2);
  cursor: pointer;
  font-family: var(--font);
}

.picker-filter--on {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 0 16px;
  overflow-y: auto;
  flex: 1;
}

.picker-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 4px;
  border-bottom: 1px solid var(--color-hairline);
  cursor: pointer;
  gap: 12px;
}

.picker-list__item:last-child {
  border-bottom: none;
}

.picker-list__info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
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
}

.picker-list__badge--strength {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.picker-list__badge--endurance {
  background: var(--color-down-soft);
  color: var(--color-down);
}
</style>
