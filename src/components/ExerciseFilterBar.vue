<template>
  <div class="exercise-filter">
    <input v-model="query" class="exercise-filter__search" type="text" placeholder="Zoeken..." />
    <select v-model="filterTagId" class="exercise-filter__select exercise-filter__select--tag" aria-label="Filter op tag">
      <option :value="null">Tags</option>
      <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
    </select>
    <select
      v-if="showSort"
      v-model="sortBy"
      class="exercise-filter__select exercise-filter__select--sort"
      aria-label="Sorteren"
    >
      <option value="name">Naam</option>
      <option value="frequency">Frequentie</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '@/types/fitness'
import type { ExerciseSortMode } from '@/utils/exerciseSearch'

defineProps<{ tags: Tag[]; showSort?: boolean }>()

const query = defineModel<string>('query', { default: '' })
const filterTagId = defineModel<number | null>('filterTagId', { default: null })
const sortBy = defineModel<ExerciseSortMode>('sortBy', { default: 'name' })
</script>

<style scoped>
.exercise-filter {
  display: flex;
  gap: 8px;
}

.exercise-filter__search {
  flex: 1;
  height: 44px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 14px;
  font-size: 16px;
  font-family: var(--font);
  color: var(--color-text);
  box-sizing: border-box;
  min-width: 0;
}

.exercise-filter__search:focus {
  outline: none;
  border-color: var(--color-primary);
}

.exercise-filter__select {
  flex-shrink: 0;
  height: 44px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 8px;
  font-size: 16px;
  font-family: var(--font);
  color: var(--color-text);
}

.exercise-filter__select--tag {
  max-width: 22%;
  padding: 0 6px;
  font-size: 15px;
}

.exercise-filter__select--sort {
  max-width: 28%;
}

.exercise-filter__select:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
