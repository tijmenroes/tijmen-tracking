<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h2 class="modal__title">{{ title }}</h2>
        <button class="modal__close" aria-label="Sluiten" @click="$emit('close')">×</button>
      </div>
      <div class="modal__body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="modal__footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{ title: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(14, 11, 26, 0.45);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 420px;
  max-height: 85dvh;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
  flex-shrink: 0;
}

.modal__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.modal__close {
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
  flex-shrink: 0;
}

.modal__body {
  padding: 0 18px 4px;
  overflow-y: auto;
}

.modal__footer {
  display: flex;
  gap: 10px;
  padding: 14px 18px calc(16px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
</style>
