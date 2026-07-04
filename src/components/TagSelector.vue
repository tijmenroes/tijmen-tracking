<template>
  <div>
    <div class="tagsel__chips">
      <button
        v-for="tag in tags"
        :key="tag.id"
        type="button"
        class="tagsel__chip"
        :class="{ 'tagsel__chip--on': modelValue.includes(tag.id) }"
        @click="toggle(tag.id)"
      >
        {{ tag.name }}
      </button>
    </div>
    <div class="tagsel__add">
      <input
        v-model="newTagName"
        class="tagsel__input"
        type="text"
        placeholder="Nieuwe tag"
        @keydown.enter.prevent="emitCreate"
      >
      <button class="tagsel__add-btn" :disabled="!newTagName.trim()" @click="emitCreate">
        + Tag
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Tag } from '@/types/fitness'

const props = defineProps<{ tags: Tag[]; modelValue: number[] }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: number[]): void
  (e: 'create', name: string): void
}>()

const newTagName = ref('')

function toggle(id: number) {
  const next = props.modelValue.includes(id)
    ? props.modelValue.filter((v) => v !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}

function emitCreate() {
  const name = newTagName.value.trim()
  if (!name) return
  emit('create', name)
  newTagName.value = ''
}
</script>

<style scoped>
.tagsel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tagsel__chip {
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

.tagsel__chip--on {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tagsel__add {
  display: flex;
  gap: 8px;
}

.tagsel__input {
  flex: 1;
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

.tagsel__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tagsel__add-btn {
  flex-shrink: 0;
  height: 42px;
  padding: 0 14px;
  background: var(--color-card-2);
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  font-family: var(--font);
}

.tagsel__add-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
