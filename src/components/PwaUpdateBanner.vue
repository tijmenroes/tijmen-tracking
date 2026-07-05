<template>
  <div v-if="pwaNeedRefresh" class="pwa-update" role="status">
    <p class="pwa-update__text">Nieuwe versie beschikbaar</p>
    <div class="pwa-update__actions">
      <button type="button" class="pwa-update__btn pwa-update__btn--ghost" @click="dismissPwaUpdate">
        Later
      </button>
      <button type="button" class="pwa-update__btn pwa-update__btn--primary" @click="refreshPwa">
        Vernieuwen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pwaNeedRefresh, refreshPwa, dismissPwaUpdate } from '@/composables/usePwaUpdate'
</script>

<style scoped>
.pwa-update {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.pwa-update__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.pwa-update__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.pwa-update__btn {
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.pwa-update__btn--ghost {
  background: var(--color-chip);
  color: var(--color-text);
}

.pwa-update__btn--primary {
  background: var(--color-primary);
  color: #fff;
}
</style>
