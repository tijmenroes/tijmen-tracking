<template>
  <div class="exercise-filter">
    <input v-model="query" class="exercise-filter__search" type="text" placeholder="Zoeken..." />
    <select v-model="filterTagId" class="exercise-filter__select" aria-label="Filter op tag">
      <option :value="null">Alle tags</option>
      <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '@/types/fitness'

defineProps<{ tags: Tag[] }>()

const query = defineModel<string>('query', { default: '' })
const filterTagId = defineModel<number | null>('filterTagId', { default: null })
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
  font-size: 15px;
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
  max-width: 40%;
  height: 44px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 8px;
  font-size: 14px;
  font-family: var(--font);
  color: var(--color-text);
}

.exercise-filter__select:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
