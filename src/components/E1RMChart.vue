<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <div>
        <div class="chart-card__title">Geschatte 1RM</div>
        <div class="chart-card__avg">Beste set per sessie · {{ points.length }} sessies</div>
      </div>
    </div>

    <VueApexCharts type="area" height="200" :options="options" :series="series" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { linearTrend } from '@/utils/trend'

export interface E1RMPoint {
  /** ISO date string (YYYY-MM-DD). */
  date: string
  /** Estimated 1RM in kg. */
  e1rm: number
}

const props = defineProps<{
  points: E1RMPoint[]
}>()

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

const sorted = computed(() =>
  [...props.points].sort((a, b) => a.date.localeCompare(b.date)),
)

const e1rmPoints = computed(() =>
  sorted.value.map((p) => ({ x: new Date(p.date).getTime(), y: p.e1rm })),
)

const trendPoints = computed(() => {
  const pts = e1rmPoints.value.map((p) => [p.x, p.y] as [number, number])
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
  { name: '1RM', type: 'area', data: e1rmPoints.value },
  { name: 'Trend', type: 'line', data: trendPoints.value },
])

// Build a "nice" integer y-scale so tick labels stay clean & rounded.
const yScale = computed(() => {
  const vals = e1rmPoints.value.map((p) => p.y)
  if (!vals.length) return { min: undefined, max: undefined, tickAmount: undefined }

  const rawMin = Math.min(...vals) - 2
  const rawMax = Math.max(...vals) + 2
  const targetTicks = 4
  const range = Math.max(1, rawMax - rawMin)
  const mag = Math.pow(10, Math.floor(Math.log10(range / targetTicks)))
  const norm = range / targetTicks / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag

  const min = Math.max(0, Math.floor(rawMin / step) * step)
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
      format: 'd MMM',
    },
  },
  yaxis: {
    show: true,
    min: yScale.value.min,
    max: yScale.value.max,
    tickAmount: yScale.value.tickAmount,
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
</style>
