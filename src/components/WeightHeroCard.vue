<template>
  <div class="hero-card">
    <div class="hero-card__left">
      <div class="hero-card__label">Huidig gewicht</div>
      <div class="hero-card__weight">
        <span class="hero-card__number">{{ current !== null ? current.toFixed(1) : '—' }}</span>
        <span class="hero-card__unit">kg</span>
      </div>
      <div class="hero-card__delta-row">
        <span v-if="delta !== null" class="hero-card__delta-badge" :class="deltaClass">
          {{ delta < 0 ? '▼' : delta > 0 ? '▲' : '—' }}
          {{ delta !== 0 ? ` ${Math.abs(delta).toFixed(1)} kg` : '' }}
        </span>
        <span class="hero-card__delta-label">sinds vorige meting</span>
      </div>
    </div>
    <div class="hero-card__spark">
      <MiniSparkline :weights="weights" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Weight } from '@/composables/useWeights'
import MiniSparkline from './MiniSparkline.vue'

const props = defineProps<{
  weights: Weight[]
}>()

const sorted = computed(() =>
  [...props.weights]
    .filter((w) => w.weight !== null && w.date !== null)
    .sort((a, b) => b.date!.localeCompare(a.date!)),
)

const current = computed(() => sorted.value[0]?.weight ?? null)
const previous = computed(() => sorted.value[1]?.weight ?? null)

const delta = computed(() => {
  if (current.value === null || previous.value === null) return null
  return current.value - previous.value
})

const deltaClass = computed(() => {
  if (!delta.value) return 'hero-card__delta-badge--neutral'
  return delta.value < 0 ? 'hero-card__delta-badge--down' : 'hero-card__delta-badge--up'
})
</script>

<style scoped>
.hero-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  padding: 22px 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hero-card__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-2);
}

.hero-card__weight {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 6px;
}

.hero-card__number {
  font-size: 56px;
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.hero-card__unit {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text-2);
}

.hero-card__delta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.hero-card__delta-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.hero-card__delta-badge--down {
  background: var(--color-down-soft);
  color: var(--color-down);
}

.hero-card__delta-badge--up {
  background: var(--color-up-soft);
  color: var(--color-up);
}

.hero-card__delta-badge--neutral {
  background: var(--color-chip);
  color: var(--color-text-2);
}

.hero-card__delta-label {
  font-size: 12px;
  color: var(--color-text-3);
}

.hero-card__spark {
  opacity: 0.95;
  flex-shrink: 0;
}
</style>
