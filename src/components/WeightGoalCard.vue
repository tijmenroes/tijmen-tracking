<template>
  <div class="goal-card">
    <div class="goal-card__top">
      <div>
        <div class="goal-card__title">Doel</div>
        <div class="goal-card__sub">
          <template v-if="currentWeight !== null && remaining > 0">
            Nog {{ remaining.toFixed(1) }} kg te gaan
          </template>
          <template v-else-if="currentWeight !== null">
            Doel behaald 🎉
          </template>
          <template v-else>—</template>
        </div>
      </div>
      <div class="goal-card__target">
        <div class="goal-card__target-value">
          {{ goalKg.toFixed(1) }}<span class="goal-card__target-unit"> kg</span>
        </div>
        <div class="goal-card__pct">{{ Math.round(progress * 100) }}% behaald</div>
      </div>
    </div>

    <div class="goal-card__bar-track">
      <div class="goal-card__bar-fill" :style="{ width: `${progress * 100}%` }" />
    </div>

    <div class="goal-card__bar-labels">
      <span>start {{ baselineKg.toFixed(1) }}</span>
      <span>doel {{ goalKg.toFixed(1) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    currentWeight: number | null
    goalKg?: number
    baselineKg?: number
  }>(),
  { goalKg: 75, baselineKg: 84 },
)

const remaining = computed(() =>
  props.currentWeight !== null ? props.currentWeight - props.goalKg : 0,
)

const progress = computed(() => {
  if (props.currentWeight === null) return 0
  const totalLost = props.baselineKg - props.currentWeight
  const totalNeeded = props.baselineKg - props.goalKg
  return Math.max(0, Math.min(1, totalLost / totalNeeded))
})
</script>

<style scoped>
.goal-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  padding: 18px;
  box-shadow: var(--shadow-card);
}

.goal-card__top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.goal-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.goal-card__sub {
  font-size: 12px;
  color: var(--color-text-2);
  margin-top: 2px;
}

.goal-card__target {
  text-align: right;
}

.goal-card__target-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.goal-card__target-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-2);
}

.goal-card__pct {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}

.goal-card__bar-track {
  margin-top: 14px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-chip);
  position: relative;
  overflow: hidden;
}

.goal-card__bar-fill {
  position: absolute;
  inset: 0;
  background: var(--color-primary);
  border-radius: 999px;
  transition: width 400ms ease;
}

.goal-card__bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}
</style>
