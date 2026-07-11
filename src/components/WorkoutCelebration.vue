<template>
  <div class="cel" :class="`cel--${stats?.tier ?? 'normal'}`">
    <CelebrationBackground v-if="stats" :tier="stats.tier" />

    <button class="cel__close" type="button" title="Sluiten" aria-label="Sluiten" @click="goHome">
      ×
    </button>

    <div v-if="loading" class="cel__loading">Laden…</div>
    <div v-else-if="error" class="cel__error">{{ error }}</div>

    <div v-else-if="stats" class="cel__content">
      <!-- Stars — only when there's something extra to celebrate -->
      <div v-if="starCount > 0" class="cel__stars" aria-hidden="true">
        <span
          v-for="i in starCount"
          :key="i"
          class="cel__star"
          :style="{ animationDelay: `${0.1 + i * 0.12}s` }"
          >★</span
        >
      </div>

      <h1 class="cel__headline">{{ stats.headline }}</h1>
      <p class="cel__subtext">{{ stats.subtext }}</p>
      <p v-if="stats.prCount > 0" class="cel__pr-line">
        {{ stats.prCount }} {{ stats.prCount === 1 ? 'nieuwe PR' : "nieuwe PR's" }} 🏆
      </p>

      <!-- Recap card -->
      <div class="cel__card">
        <div class="cel__card-title">{{ title }}</div>
        <div class="cel__card-date">{{ formattedDate }}</div>
        <div class="cel__stats-grid">
          <div v-if="stats.durationMinutes != null" class="cel__stat">
            <div class="cel__stat-value">{{ stats.durationMinutes }}<span class="cel__stat-unit"> min</span></div>
            <div class="cel__stat-label">Duur</div>
          </div>
          <div class="cel__stat">
            <div class="cel__stat-value">{{ stats.exerciseCount }}</div>
            <div class="cel__stat-label">Oefeningen</div>
          </div>
          <div class="cel__stat">
            <div class="cel__stat-value">{{ stats.totalSets }}</div>
            <div class="cel__stat-label">Sets</div>
          </div>
          <div v-if="stats.totalVolume > 0" class="cel__stat">
            <div class="cel__stat-value">
              {{ formatVolume(stats.totalVolume) }}<span class="cel__stat-unit"> kg</span>
            </div>
            <div class="cel__stat-label">Volume</div>
          </div>
        </div>
      </div>

      <!-- Per-exercise best sets -->
      <div class="cel__exercises">
        <div
          v-for="(ex, idx) in stats.exercises"
          :key="ex.workoutExerciseId"
          class="cel__exercise"
          :style="{ animationDelay: `${0.25 + idx * 0.07}s` }"
        >
          <div class="cel__exercise-main">
            <div class="cel__exercise-name">
              {{ ex.name }}
              <span v-if="ex.isPr" class="cel__badge">PR</span>
            </div>
            <div class="cel__exercise-best">{{ bestSetLabel(ex) }}</div>
          </div>
          <div
            v-if="ex.deltaPct != null"
            class="cel__delta"
            :class="ex.deltaPct >= 0 ? 'cel__delta--up' : 'cel__delta--down'"
          >
            {{ ex.deltaPct >= 0 ? '▲' : '▼' }} {{ Math.abs(ex.deltaPct).toFixed(0) }}%
          </div>
        </div>
      </div>

      <div class="cel__actions">
        <button class="cel__btn cel__btn--primary" type="button" @click="goToDetail">
          Bekijk workout
        </button>
        <button class="cel__btn cel__btn--ghost" type="button" @click="goHome">
          Terug naar home
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CelebrationBackground from '@/components/CelebrationBackground.vue'
import { useWorkoutStats, type ExerciseStat } from '@/composables/useWorkoutStats'

const props = defineProps<{ workoutId: number }>()

const router = useRouter()
const { stats, loading, error, loadStats } = useWorkoutStats()

const title = computed(() => stats.value?.workout.name?.trim() || formattedDate.value)

const formattedDate = computed(() => {
  if (!stats.value) return ''
  const [y, m, d] = stats.value.workout.date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

// Stars: none on a plain workout, up to 3 for PRs, always 3 on a milestone.
const starCount = computed(() => {
  if (!stats.value) return 0
  const { tier, prCount } = stats.value
  if (tier === 'milestone' || tier === 'epic') return 3
  if (tier === 'pr') return Math.min(3, Math.max(1, prCount))
  return 0
})

onMounted(() => loadStats(props.workoutId))

function goToDetail() {
  router.push(`/workout/history/${props.workoutId}`)
}

function goHome() {
  router.push('/')
}

function formatVolume(kg: number): string {
  return Math.round(kg).toLocaleString('nl-NL')
}

function bestSetLabel(ex: ExerciseStat): string {
  if (ex.type === 'endurance') {
    const parts: string[] = []
    if (ex.bestDistanceKm != null) parts.push(`${ex.bestDistanceKm} km`)
    if (ex.totalDurationSeconds != null) parts.push(formatDuration(ex.totalDurationSeconds))
    return parts.join(' · ') || 'Gelogd'
  }
  if (ex.bestWeight != null && ex.bestReps != null) {
    return `${ex.bestWeight} kg × ${ex.bestReps}`
  }
  return 'Gelogd'
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
</script>

<style scoped>
.cel {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(124, 58, 237, 0.55) 0%, rgba(124, 58, 237, 0) 60%),
    linear-gradient(180deg, #2a1458 0%, #1a0d38 100%);
  color: #fff;
  padding: calc(72px + env(safe-area-inset-top)) 20px calc(32px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cel--epic,
.cel--milestone {
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(245, 197, 66, 0.35) 0%, rgba(124, 58, 237, 0) 55%),
    radial-gradient(120% 80% at 50% 0%, rgba(124, 58, 237, 0.6) 0%, rgba(124, 58, 237, 0) 65%),
    linear-gradient(180deg, #2a1458 0%, #1a0d38 100%);
}

.cel__close {
  position: absolute;
  top: calc(16px + env(safe-area-inset-top));
  right: 16px;
  z-index: 2;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font);
}

.cel__loading,
.cel__error {
  margin-top: 40vh;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
}

.cel__content {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.cel__stars {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.cel__star {
  font-size: 34px;
  color: #f5c542;
  text-shadow: 0 2px 12px rgba(245, 197, 66, 0.6);
  animation: star-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.cel__headline {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  margin: 0;
  animation: rise 0.5s ease both;
}

.cel__subtext {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.75);
  margin: 8px 0 0;
  animation: rise 0.5s ease 0.08s both;
}

.cel__pr-line {
  font-size: 15px;
  font-weight: 700;
  color: #f5c542;
  margin: 10px 0 0;
  animation: rise 0.5s ease 0.14s both;
}

.cel__card {
  width: 100%;
  margin-top: 28px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  padding: 20px;
  backdrop-filter: blur(12px);
  animation: rise-overshoot 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) 0.18s both;
}

.cel--epic .cel__card,
.cel--pr .cel__card {
  box-shadow: 0 0 0 1px rgba(245, 197, 66, 0.3), 0 12px 40px rgba(245, 197, 66, 0.15);
}

.cel__card-title {
  font-size: 20px;
  font-weight: 700;
  text-transform: capitalize;
}

.cel__card-date {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
  margin-top: 2px;
}

.cel__stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 18px;
}

.cel__stat-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.cel__stat-unit {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.cel__stat-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.cel__exercises {
  width: 100%;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cel__exercise {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 12px 16px;
  animation: rise 0.45s ease both;
}

.cel__exercise-name {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cel__exercise-best {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.cel__badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 20px;
  background: #f5c542;
  color: #1a0d38;
  animation: star-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}

.cel__delta {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.cel__delta--up {
  color: #34d399;
}

.cel__delta--down {
  color: #f87171;
}

.cel__actions {
  width: 100%;
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cel__btn {
  width: 100%;
  height: 52px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font);
  cursor: pointer;
  border: none;
}

.cel__btn--primary {
  background: #fff;
  color: #1a0d38;
}

.cel__btn--ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rise-overshoot {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes star-pop {
  from {
    opacity: 0;
    transform: scale(0.2) rotate(-20deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cel__star,
  .cel__headline,
  .cel__subtext,
  .cel__pr-line,
  .cel__card,
  .cel__exercise,
  .cel__badge {
    animation: none;
  }
}
</style>
