<template>
  <BaseModal :title="title" @close="$emit('cancel')">
    <p class="confirm__message">{{ message }}</p>
    <template #footer>
      <button class="confirm__btn confirm__btn--cancel" @click="$emit('cancel')">
        {{ cancelLabel }}
      </button>
      <button
        class="confirm__btn"
        :class="danger ? 'confirm__btn--danger' : 'confirm__btn--primary'"
        @click="$emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'

withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }>(),
  { confirmLabel: 'Bevestigen', cancelLabel: 'Annuleren', danger: false },
)

defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
</script>

<style scoped>
.confirm__message {
  font-size: 15px;
  line-height: 1.4;
  color: var(--color-text-2);
  margin: 4px 0 8px;
}

.confirm__btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.confirm__btn--cancel {
  background: var(--color-chip);
  color: var(--color-text);
}

.confirm__btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.confirm__btn--danger {
  background: var(--color-up);
  color: #fff;
}
</style>
