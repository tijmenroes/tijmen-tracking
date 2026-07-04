<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <div>
        <div class="chart-card__title">Verloop</div>
        <div class="chart-card__avg">Gem. {{ average }} kg</div>
      </div>
      <div class="range-tabs">
        <button
          v-for="p in PERIODS"
          :key="p"
          class="range-tabs__btn"
          :class="{ 'range-tabs__btn--active': activePeriod === p }"
          @click="activePeriod = p"
        >{{ p }}</button>
      </div>
    </div>

    <svg
      v-if="pts.length >= 2"
      class="chart-svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :style="{ stopColor: 'var(--color-primary)', stopOpacity: 0.32 }" />
          <stop offset="100%" :style="{ stopColor: 'var(--color-primary)', stopOpacity: 0 }" />
        </linearGradient>
      </defs>

      <!-- goal dashed line -->
      <g v-if="goalY !== null">
        <line :x1="PAD_L" :y1="goalY" :x2="W - PAD_R" :y2="goalY"
              style="stroke: var(--color-text-3);" stroke-width="1" stroke-dasharray="3 4" />
        <text :x="W - PAD_R" :y="goalY - 4" text-anchor="end"
              font-size="9" style="fill: var(--color-text-3);" font-family="inherit">
          doel {{ goalKg.toFixed(1) }}
        </text>
      </g>

      <!-- area fill -->
      <path v-if="variant === 'area'" :d="areaPath" :fill="`url(#${gradientId})`" />

      <!-- curve -->
      <path :d="linePath" fill="none" style="stroke: var(--color-primary);"
            :stroke-width="variant === 'minimal' ? 1.5 : 2.2"
            stroke-linecap="round" stroke-linejoin="round" />

      <!-- dots (all but last) -->
      <template v-if="variant !== 'minimal'">
        <g v-for="([x, y], i) in pts.slice(0, -1)" :key="i">
          <circle :cx="x" :cy="y" r="3.5" fill="var(--color-card)" />
          <circle :cx="x" :cy="y" r="3.5" fill="none"
                  style="stroke: var(--color-primary);" stroke-width="1.8" />
        </g>
      </template>

      <!-- last point highlighted -->
      <g v-if="pts.length">
        <circle :cx="pts[pts.length - 1]![0]" :cy="pts[pts.length - 1]![1]"
                r="6" style="fill: var(--color-primary);" opacity="0.18" />
        <circle :cx="pts[pts.length - 1]![0]" :cy="pts[pts.length - 1]![1]"
                r="4" style="fill: var(--color-primary);" />
      </g>

      <!-- x-axis labels -->
      <text
        v-for="label in xLabels"
        :key="label.text"
        :x="label.x"
        :y="H - 8"
        text-anchor="middle"
        font-size="10"
        font-family="inherit"
        style="fill: var(--color-text-3);"
      >{{ label.text }}</text>
    </svg>

    <p v-else class="chart-empty">Niet genoeg data.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import type { Weight } from '@/composables/useWeights'

const props = withDefaults(
  defineProps<{
    weights: Weight[]
    goalKg?: number
    variant?: 'area' | 'dots' | 'minimal'
  }>(),
  { goalKg: 75, variant: 'area' },
)

const W = 354
const H = 180
const PAD_L = 8
const PAD_R = 8
const PAD_T = 18
const PAD_B = 28

const PERIODS = ['W', 'M', '6M', 'J'] as const
type Period = (typeof PERIODS)[number]
const PERIOD_DAYS: Record<Period, number> = { W: 7, M: 30, '6M': 180, J: 365 }

const activePeriod = ref<Period>('M')
const gradientId = `wc-grad-${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`

const filtered = computed(() => {
  const cutoff = Date.now() - PERIOD_DAYS[activePeriod.value] * 86_400_000
  return props.weights
    .filter((w) => w.weight !== null && w.date !== null && new Date(w.date).getTime() >= cutoff)
    .sort((a, b) => a.date!.localeCompare(b.date!))
})

const average = computed(() => {
  const vals = filtered.value.map((w) => w.weight!)
  if (!vals.length) return '—'
  return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
})

const pts = computed((): [number, number][] => {
  const data = filtered.value
  if (data.length < 2) return []

  const times = data.map((w) => new Date(w.date!).getTime())
  const vals = data.map((w) => w.weight!)
  const tMin = Math.min(...times), tMax = Math.max(...times)
  const vMin = Math.min(...vals) - 1.0
  const vMax = Math.max(...vals) + 1.0

  const sx = (t: number) => PAD_L + ((t - tMin) / Math.max(1, tMax - tMin)) * (W - PAD_L - PAD_R)
  const sy = (v: number) => PAD_T + (1 - (v - vMin) / Math.max(0.001, vMax - vMin)) * (H - PAD_T - PAD_B)

  return data.map((w) => [sx(new Date(w.date!).getTime()), sy(w.weight!)])
})

// catmull-rom → cubic bezier (tension 0.18, faithful to design)
function buildCurve(points: [number, number][]): string {
  if (!points.length) return ''
  let path = `M ${points[0]![0]} ${points[0]![1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const t = 0.18
    const c1x = p1[0] + (p2[0] - p0[0]) * t
    const c1y = p1[1] + (p2[1] - p0[1]) * t
    const c2x = p2[0] - (p3[0] - p1[0]) * t
    const c2y = p2[1] - (p3[1] - p1[1]) * t
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return path
}

const linePath = computed(() => buildCurve(pts.value))

const areaPath = computed(() => {
  if (!pts.value.length) return ''
  const bottomY = H - PAD_B
  const first = pts.value[0]!
  const last = pts.value[pts.value.length - 1]!
  return `${linePath.value} L ${last[0]} ${bottomY} L ${first[0]} ${bottomY} Z`
})

const goalY = computed(() => {
  const data = filtered.value
  if (!data.length) return null
  const vals = data.map((w) => w.weight!)
  const vMin = Math.min(...vals) - 1.0
  const vMax = Math.max(...vals) + 1.0
  if (props.goalKg < vMin || props.goalKg > vMax) return null
  return PAD_T + (1 - (props.goalKg - vMin) / Math.max(0.001, vMax - vMin)) * (H - PAD_T - PAD_B)
})

const xLabels = computed(() => {
  const data = filtered.value
  const points = pts.value
  if (points.length < 2) return []
  const n = Math.min(4, data.length)
  return Array.from({ length: n }, (_, i) => {
    const idx = i === n - 1 ? data.length - 1 : Math.round((i * (data.length - 1)) / (n - 1))
    return {
      x: points[idx]![0],
      text: new Date(data[idx]!.date!).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
    }
  })
})
</script>

<style scoped>
.chart-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  padding: 18px;
  box-shadow: var(--shadow-card);
}

.chart-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.chart-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.chart-card__avg {
  font-size: 12px;
  color: var(--color-text-2);
  margin-top: 2px;
  white-space: nowrap;
}

.range-tabs {
  display: flex;
  background: var(--color-chip);
  border-radius: 9px;
  padding: 2px;
  gap: 0;
}

.range-tabs__btn {
  flex: 1;
  height: 28px;
  min-width: 36px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  background: transparent;
  box-shadow: none;
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
  transition: background 120ms;
}

.range-tabs__btn--active {
  background: var(--color-card);
  box-shadow: var(--shadow-chip-active);
  color: var(--color-text);
  font-weight: 600;
}

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.chart-empty {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 0;
}
</style>
