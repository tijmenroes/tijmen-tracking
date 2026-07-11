<template>
  <canvas ref="canvasEl" class="celebration-bg" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CelebrationTier } from '@/utils/celebrationTier'

const props = defineProps<{ tier: CelebrationTier }>()
const canvasEl = ref<HTMLCanvasElement | null>(null)

const PURPLE = '#7C3AED'
const PURPLE_LIGHT = '#A78BFA'
const WHITE = '#FFFFFF'
const GOLD = '#F5C542'

// Intensity scales with achievement (see docs/workout-celebration.md).
const TIERS: Record<CelebrationTier, { count: number; spread: number; colors: string[]; double: boolean }> = {
  normal: { count: 20, spread: 50, colors: [PURPLE, PURPLE_LIGHT, WHITE], double: false },
  pr: { count: 50, spread: 75, colors: [PURPLE, PURPLE_LIGHT, WHITE, GOLD], double: false },
  milestone: { count: 90, spread: 110, colors: [PURPLE, GOLD, WHITE], double: false },
  epic: { count: 120, spread: 130, colors: [PURPLE, PURPLE_LIGHT, GOLD, WHITE], double: true },
}

onMounted(async () => {
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced || !canvasEl.value) return

  const cfg = TIERS[props.tier]
  // Lazy-loaded so canvas-confetti lands in its own chunk, not the main bundle.
  const { default: confetti } = await import('canvas-confetti')
  const fire = confetti.create(canvasEl.value, { resize: true, useWorker: true })

  const burst = (particleRatio: number, opts: Record<string, unknown>) =>
    fire({
      origin: { y: 0.55 },
      colors: cfg.colors,
      particleCount: Math.floor(cfg.count * particleRatio),
      spread: cfg.spread,
      startVelocity: 48,
      ticks: 200,
      ...opts,
    })

  burst(0.7, {})
  burst(0.3, { spread: cfg.spread * 1.3, decay: 0.92, scalar: 1.2, startVelocity: 55 })

  if (cfg.double) {
    setTimeout(() => {
      burst(0.5, { angle: 60, origin: { x: 0, y: 0.65 } })
      burst(0.5, { angle: 120, origin: { x: 1, y: 0.65 } })
    }, 1500)
  }
})
</script>

<style scoped>
.celebration-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}
</style>
