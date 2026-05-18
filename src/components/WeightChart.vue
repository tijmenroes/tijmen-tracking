<template>
  <div class="weight-chart">
    <div class="weight-chart__header">
      <div class="weight-chart__meta">
        <span class="weight-chart__title">Verloop</span>
        <span class="weight-chart__avg">Gem. {{ average }} kg</span>
      </div>
      <div class="weight-chart__periods">
        <button
          v-for="p in PERIODS"
          :key="p.key"
          class="weight-chart__period-btn"
          :class="{ 'weight-chart__period-btn--active': activePeriod === p.key }"
          @click="activePeriod = p.key"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <svg
      v-if="points.length >= 2"
      class="weight-chart__svg"
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          :id="gradientId"
          x1="0"
          :y1="PAD_T"
          x2="0"
          :y2="SVG_H - PAD_B"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" :style="{ stopColor: 'var(--chart-gradient-start)' }" />
          <stop offset="100%" :style="{ stopColor: 'var(--chart-gradient-end)' }" />
        </linearGradient>
      </defs>

      <path :d="fillPath" :fill="`url(#${gradientId})`" />

      <path
        :d="linePath"
        fill="none"
        :style="{ stroke: 'var(--chart-color)' }"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <circle
        v-for="(pt, i) in points"
        :key="i"
        :cx="pt.x"
        :cy="pt.y"
        r="4"
        stroke-width="2"
        :style="{
          fill: i === points.length - 1 ? 'var(--chart-color)' : 'white',
          stroke: 'var(--chart-color)',
        }"
      />

      <text
        v-for="label in xLabels"
        :key="label.text"
        :x="label.x"
        :y="SVG_H - 4"
        text-anchor="middle"
        font-size="10"
        :style="{ fill: 'var(--chart-label-color)' }"
      >
        {{ label.text }}
      </text>
    </svg>

    <p v-else class="weight-chart__empty">Niet genoeg data om grafiek te tonen.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import type { Weight } from '@/composables/useWeights'

const props = defineProps<{ weights: Weight[] }>()

const SVG_W = 500
const SVG_H = 160
const PAD_L = 8
const PAD_R = 8
const PAD_T = 15
const PAD_B = 22
const CHART_W = SVG_W - PAD_L - PAD_R
const CHART_H = SVG_H - PAD_T - PAD_B

const PERIODS = [
  { key: 'W', label: 'W' },
  { key: 'M', label: 'M' },
  { key: '6M', label: '6M' },
  { key: 'J', label: 'J' },
] as const

type PeriodKey = 'W' | 'M' | '6M' | 'J'
const PERIOD_DAYS: Record<PeriodKey, number> = { W: 7, M: 30, '6M': 180, J: 365 }

const activePeriod = ref<PeriodKey>('M')

// Unique gradient id in case multiple charts are on the same page
const gradientId = `wc-gradient-${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`

const filteredWeights = computed(() => {
  const cutoff = Date.now() - PERIOD_DAYS[activePeriod.value] * 86_400_000
  return props.weights
    .filter((w) => w.weight !== null && w.date !== null && new Date(w.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
})

const average = computed(() => {
  const vals = filteredWeights.value.map((w) => w.weight ?? 0)
  if (vals.length === 0) return '—'
  return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
})

const points = computed(() => {
  const data = filteredWeights.value
  if (data.length < 2) return []

  const times = data.map((w) => new Date(w.date!).getTime())
  const vals = data.map((w) => w.weight ?? 0)

  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)

  const tRange = maxT - minT || 1
  // Add a small margin so points don't sit on the very edge vertically
  const vPad = (maxV - minV) * 0.1 || 1
  const vRange = maxV - minV + vPad * 2

  return data.map((_, i) => ({
    x: PAD_L + (((times[i] ?? 0) - minT) / tRange) * CHART_W,
    y: PAD_T + (1 - ((vals[i] ?? 0) - (minV - vPad)) / vRange) * CHART_H,
  }))
})

const linePath = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '),
)

const fillPath = computed(() => {
  if (points.value.length === 0) return ''
  const bottomY = SVG_H - PAD_B
  const first = points.value[0]!
  const last = points.value[points.value.length - 1]!
  return `${linePath.value} L${last.x},${bottomY} L${first.x},${bottomY} Z`
})

const xLabels = computed(() => {
  const data = filteredWeights.value
  const pts = points.value
  if (pts.length < 2) return []
  const n = Math.min(4, data.length)
  return Array.from({ length: n }, (_, i) => {
    const idx = i === n - 1 ? data.length - 1 : Math.round((i * (data.length - 1)) / (n - 1))
    return { x: pts[idx]!.x, text: formatDate(data[idx]!.date!) }
  })
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.weight-chart {
  /* ── Color tokens ── override these from a design system or parent ── */
  --chart-color: #6b63ff;
  --chart-gradient-start: rgba(107, 99, 255, 0.25);
  --chart-gradient-end: rgba(107, 99, 255, 0);
  --chart-label-color: #9ca3af;
  --chart-period-bg: #eeecfc;
  --chart-period-active-bg: #ffffff;
  --chart-period-text: #6b7280;
  --chart-period-active-text: #111827;

  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
}

.weight-chart__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.weight-chart__title {
  display: block;
  font-weight: 700;
  font-size: 1rem;
}

.weight-chart__avg {
  display: block;
  font-size: 0.8rem;
  color: var(--chart-label-color);
}

.weight-chart__periods {
  display: flex;
  gap: 2px;
  background: var(--chart-period-bg);
  border-radius: 8px;
  padding: 3px;
}

.weight-chart__period-btn {
  background: none;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--chart-period-text);
  font-weight: 500;
}

.weight-chart__period-btn--active {
  background: var(--chart-period-active-bg);
  color: var(--chart-period-active-text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.weight-chart__svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.weight-chart__empty {
  font-size: 0.875rem;
  color: var(--chart-label-color);
}
</style>
