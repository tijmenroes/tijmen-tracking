<template>
  <div class="chart-card">
    <div class="chart-card__title">{{ title }}</div>
    <VueApexCharts v-if="weeks.length >= 2" type="bar" height="200" :options="options" :series="series" />
    <p v-else class="chart-empty">Na twee weken verschijnt hier je verloop.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { parseLocalIsoDate } from '@/utils/dates'
import { formatKgChange } from '@/content/habitCopy'
import type { WeekResult } from '@/utils/habitWeek'
import type { HabitKind } from '@/types/habits'

const props = defineProps<{
  kind: HabitKind
  /** Week results, oldest first. */
  weeks: WeekResult[]
}>()

const TITLES: Record<HabitKind, string> = {
  do: 'Dagen gedaan per week',
  avoid: 'Dagen niet gelukt per week',
  weight: 'Verandering per week (kg)',
}

const title = computed(() => TITLES[props.kind])

// Resolve theme colours once so ApexCharts follows the design tokens.
const colors = ref({
  achieved: '#0EA371',
  missed: '#E25555',
  neutral: 'rgba(14,11,26,0.36)',
  target: 'rgba(14,11,26,0.58)',
  label: 'rgba(14,11,26,0.36)',
})
/**
 * The tokens use space-separated rgb() syntax, which ApexCharts can't parse
 * for bar fills (they fall back to grey). A canvas normalises any CSS colour
 * to '#rrggbb' or 'rgba(r, g, b, a)'.
 */
function toChartColor(value: string, fallback: string): string {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || !value) return fallback
  ctx.fillStyle = fallback
  ctx.fillStyle = value
  return String(ctx.fillStyle)
}

onMounted(() => {
  const cs = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => toChartColor(cs.getPropertyValue(name).trim(), fallback)
  colors.value = {
    achieved: read('--color-down', colors.value.achieved),
    missed: read('--color-up', colors.value.missed),
    neutral: read('--color-text-3', colors.value.neutral),
    target: read('--color-text-2', colors.value.target),
    label: read('--color-text-3', colors.value.label),
  }
})

function weekLabel(weekStart: string): string {
  return parseLocalIsoDate(weekStart).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function barColor(week: WeekResult): string {
  if (week.status === 'achieved') return colors.value.achieved
  if (week.status === 'missed') return colors.value.missed
  return colors.value.neutral
}

// One bar per week coloured by status, with the target of that week as a goal
// marker on the bar, so a target change shows up exactly where it happened.
const series = computed(() => [
  {
    name: 'Resultaat',
    data: props.weeks.map((w) => ({
      x: weekLabel(w.weekStart),
      y: w.value ?? 0,
      goals:
        w.target === null
          ? []
          : [{ name: 'Doel', value: w.target, strokeHeight: 2, strokeDashArray: 3, strokeColor: colors.value.target }],
    })),
  },
])

const isWeight = computed(() => props.kind === 'weight')

function formatValue(val: number): string {
  return isWeight.value ? formatKgChange(val) : `${Math.round(val)}`
}

const options = computed<ApexOptions>(() => ({
  chart: {
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false },
    parentHeightOffset: 0,
  },
  colors: props.weeks.map(barColor),
  dataLabels: { enabled: false },
  legend: { show: false },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
  grid: { show: false, padding: { top: 0, right: 6, bottom: 0, left: 6 } },
  xaxis: {
    type: 'category',
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
    labels: { style: { colors: colors.value.label, fontSize: '10px' }, rotate: 0, hideOverlappingLabels: true },
  },
  yaxis: isWeight.value
    ? { labels: { style: { colors: colors.value.label, fontSize: '10px' }, formatter: (v: number) => v.toFixed(1) } }
    : { min: 0, max: 7, tickAmount: 7, labels: { style: { colors: colors.value.label, fontSize: '10px' } } },
  tooltip: {
    theme: 'light',
    y: { formatter: (val: number) => formatValue(val) },
  },
}))
</script>

<style scoped>
.chart-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  padding: 18px;
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.chart-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.chart-empty {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 0;
}
</style>
