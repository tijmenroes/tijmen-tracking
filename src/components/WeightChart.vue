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
          :key="p.key"
          class="range-tabs__btn"
          :class="{ 'range-tabs__btn--active': activePeriod === p.key }"
          @click="activePeriod = p.key"
        >{{ p.label }}</button>
      </div>
    </div>

    <VueApexCharts
      v-if="hasData"
      type="area"
      height="200"
      :options="options"
      :series="series"
    />

    <p v-else class="chart-empty">Niet genoeg data.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import type { Weight } from '@/composables/useWeights'
import { linearTrend } from '@/utils/trend'

const props = defineProps<{
  weights: Weight[]
}>()

const PERIODS = [
  { key: '3M', label: '3M', days: 90 },
  { key: 'J', label: 'J', days: 365 },
  { key: 'All', label: 'All', days: Infinity },
] as const
type PeriodKey = (typeof PERIODS)[number]['key']

const activePeriod = ref<PeriodKey>('3M')

// Resolve theme colors once so ApexCharts follows our design tokens.
const colors = ref({ primary: '#7C3AED', trend: 'rgba(14,11,26,0.36)', label: 'rgba(14,11,26,0.36)' })
onMounted(() => {
  const cs = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  colors.value = {
    primary: read('--color-primary', '#7C3AED'),
    trend: read('--color-text-3', 'rgba(14,11,26,0.36)'),
    label: read('--color-text-3', 'rgba(14,11,26,0.36)'),
  }
})

const filtered = computed(() => {
  const days = PERIODS.find((p) => p.key === activePeriod.value)!.days
  const cutoff = days === Infinity ? -Infinity : Date.now() - days * 86_400_000
  return props.weights
    .filter((w) => w.weight !== null && w.date !== null && new Date(w.date).getTime() >= cutoff)
    .sort((a, b) => a.date!.localeCompare(b.date!))
})

const hasData = computed(() => filtered.value.length >= 2)

const average = computed(() => {
  const vals = filtered.value.map((w) => w.weight!)
  if (!vals.length) return '—'
  return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
})

const weightPoints = computed(() =>
  filtered.value.map((w) => ({ x: new Date(w.date!).getTime(), y: w.weight! })),
)

const trendPoints = computed(() => {
  const pts = weightPoints.value.map((p) => [p.x, p.y] as [number, number])
  const fit = linearTrend(pts)
  if (!fit) return []
  const xMin = pts[0]![0]
  const xMax = pts[pts.length - 1]![0]
  return [
    { x: xMin, y: fit.predict(xMin) },
    { x: xMax, y: fit.predict(xMax) },
  ]
})

const series = computed(() => [
  { name: 'Gewicht', type: 'area', data: weightPoints.value },
  { name: 'Trend', type: 'line', data: trendPoints.value },
])

// Build a "nice" integer y-scale so tick labels stay clean & rounded,
// even after a dynamic (reactive) update rather than a full refresh.
const yScale = computed(() => {
  const vals = filtered.value.map((w) => w.weight!)
  if (!vals.length) return { min: undefined, max: undefined, tickAmount: undefined }

  const rawMin = Math.min(...vals) - 1
  const rawMax = Math.max(...vals) + 1
  const targetTicks = 4
  const range = Math.max(1, rawMax - rawMin)
  const mag = Math.pow(10, Math.floor(Math.log10(range / targetTicks)))
  const norm = range / targetTicks / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag

  const min = Math.floor(rawMin / step) * step
  const max = Math.ceil(rawMax / step) * step
  return { min, max, tickAmount: Math.round((max - min) / step) }
})

const options = computed<ApexOptions>(() => ({
  chart: {
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, dynamicAnimation: { speed: 350 } },
    parentHeightOffset: 0,
    sparkline: { enabled: false },
  },
  colors: [colors.value.primary, colors.value.trend],
  dataLabels: { enabled: false },
  legend: { show: false },
  stroke: {
    curve: 'smooth',
    width: [2.4, 1.5],
    dashArray: [0, 5],
    lineCap: 'round',
  },
  fill: {
    type: ['gradient', 'solid'],
    gradient: { shadeIntensity: 1, opacityFrom: 0.32, opacityTo: 0, stops: [0, 100] },
    opacity: [1, 0],
  },
  markers: { size: 0, hover: { size: 4 } },
  grid: {
    show: false,
    padding: { top: 0, right: 6, bottom: 0, left: 6 },
  },
  xaxis: {
    type: 'datetime',
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
    labels: {
      datetimeUTC: false,
      style: { colors: colors.value.label, fontSize: '10px' },
      format: activePeriod.value === '3M' ? 'd MMM' : 'MMM yy',
    },
  },
  yaxis: {
    show: true,
    min: yScale.value.min,
    max: yScale.value.max,
    tickAmount: yScale.value.tickAmount,
    decimalsInFloat: 0,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: { colors: colors.value.label, fontSize: '10px' },
      formatter: (val: number) => `${Math.round(val)}`,
    },
  },
  tooltip: {
    theme: 'light',
    x: { format: 'd MMM yyyy' },
    y: {
      formatter: (val: number, opts?: { seriesIndex: number }) =>
        `${val.toFixed(1)} kg${opts?.seriesIndex === 1 ? ' (trend)' : ''}`,
    },
    marker: { show: true },
  },
}))
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
  min-width: 40px;
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

.chart-empty {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 0;
}
</style>
