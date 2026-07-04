<template>
  <div class="wexport">
    <div class="wexport__header">
      <button class="wexport__back" @click="router.push('/workout')">‹</button>
      <div>
        <div class="wexport__supra">Fitness</div>
        <h1 class="wexport__title">Exporteer voor AI</h1>
      </div>
    </div>

    <div class="wexport__content">
      <div class="wexport__placeholder">
        Deze pagina werken we later verder uit.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.wexport {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.wexport__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.wexport__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.wexport__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.wexport__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.wexport__content {
  padding: 0 16px;
}

.wexport__placeholder {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
</style>
