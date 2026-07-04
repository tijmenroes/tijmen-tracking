<template>
  <svg :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" style="overflow: visible;">
    <path v-if="chart.d" :d="chart.d" fill="none" stroke="var(--color-primary)"
          stroke-width="2" stroke-linecap="round" />
    <circle v-if="chart.lastX !== null"
            :cx="chart.lastX" :cy="chart.lastY" r="3" fill="var(--color-primary)" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Weight } from '@/composables/useWeights'

const props = defineProps<{ weights: Weight[] }>()

const W = 88
const H = 54

const chart = computed(() => {
  const data = props.weights
    .filter((w) => w.weight !== null && w.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(-8)

  if (data.length < 2) return { d: '', lastX: null, lastY: 0 }

  const ys = data.map((w) => w.weight!)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const sx = (i: number) => 2 + (i / (data.length - 1)) * (W - 4)
  const sy = (y: number) => 4 + (1 - (y - yMin) / Math.max(0.001, yMax - yMin)) * (H - 8)

  let d = `M ${sx(0)} ${sy(ys[0]!)}`
  for (let i = 1; i < ys.length; i++) {
    const px = sx(i - 1)
    const py = sy(ys[i - 1]!)
    const cx = sx(i)
    const cy = sy(ys[i]!)
    const mx = (px + cx) / 2
    d += ` C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`
  }

  return { d, lastX: sx(ys.length - 1), lastY: sy(ys[ys.length - 1]!) }
})
</script>
