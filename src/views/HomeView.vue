<template>
  <div class="home">
    <div class="home__header">
      <div class="home__supra">Fitness tracker</div>
      <div class="home__header-row">
        <h1 class="home__title">Overzicht</h1>
        <button
          type="button"
          class="home__profile"
          aria-label="Profiel openen"
          @click="router.push('/profile')"
        >
          👤
        </button>
      </div>
    </div>

    <div class="home__cards">
      <button class="metric-card" @click="router.push('/weight')">
        <div class="metric-card__icon">⚖️</div>
        <div class="metric-card__label">Gewicht</div>
        <div class="metric-card__chevron">›</div>
      </button>
      <button class="metric-card" @click="router.push('/workout')">
        <div class="metric-card__icon">💪</div>
        <div class="metric-card__label">Workout</div>
        <div class="metric-card__chevron">›</div>
      </button>
      <button class="metric-card" @click="router.push('/workout/templates')">
        <div class="metric-card__icon">📑</div>
        <div class="metric-card__label">Templates</div>
        <div class="metric-card__chevron">›</div>
      </button>
      <button v-if="isAdmin" class="metric-card" @click="router.push('/exercises')">
        <div class="metric-card__icon">📋</div>
        <div class="metric-card__label">Oefeningen beheren</div>
        <div class="metric-card__chevron">›</div>
      </button>
    </div>

    <section class="newsboard" aria-labelledby="newsboard-title">
      <h2 id="newsboard-title" class="newsboard__title">Newsboard</h2>
      <p v-if="feedLoading" class="newsboard__status">Berichten laden…</p>
      <p v-else-if="feedError" class="newsboard__status">{{ feedError }}</p>
      <p v-else-if="events.length === 0" class="newsboard__status">
        Nog geen gebeurtenissen. Tijd om te knallen.
      </p>
      <article v-for="event in events" :key="event.id" class="newsboard__item">
        <time class="newsboard__date" :datetime="event.occurred_at">
          {{ formatEventDate(event.occurred_at) }}
        </time>
        <p class="newsboard__text">{{ renderActivityMessage(event) }}</p>
      </article>
    </section>

    <p class="home__build">{{ buildLabel }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { useActivityFeedStore } from '@/stores/activityFeed'
import { useWorkouts } from '@/composables/useWorkouts'
import { renderActivityMessage } from '@/content/activityMessages'

const router = useRouter()
const profileStore = useProfileStore()
const activityFeedStore = useActivityFeedStore()
const { isAdmin } = storeToRefs(profileStore)
const { events, loading: feedLoading, error: feedError } = storeToRefs(activityFeedStore)
const { fetchActiveWorkout } = useWorkouts()

function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

const buildLabel = computed(() => {
  const date = new Date(__BUILD_TIME__)
  return `Build ${date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })}`
})

onMounted(async () => {
  await Promise.all([
    profileStore.load(),
    activityFeedStore.fetchRecent(),
    fetchActiveWorkout(),
  ])
})
</script>

<style scoped>
.home {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.home__header {
  padding: 56px 20px 18px;
}

.home__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.home__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.home__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home__profile {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--color-hairline);
  border-radius: 50%;
  background: var(--color-card);
  box-shadow: var(--shadow-chip-active);
  cursor: pointer;
  font-size: 17px;
}

.home__cards {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-card);
  border: none;
  border-radius: var(--radius-card);
  padding: 18px 20px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
}

.metric-card__icon {
  font-size: 22px;
  line-height: 1;
}

.metric-card__label {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.metric-card__chevron {
  font-size: 22px;
  color: var(--color-text-3);
  line-height: 1;
}

.newsboard {
  margin: 24px 16px 0;
  border: 1px solid var(--color-primary);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--color-card);
}

.newsboard__title {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--color-primary);
}

.newsboard__status {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-2);
}

.newsboard__item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--color-hairline);
}

.newsboard__date {
  padding-top: 1px;
  font-size: 11px;
  color: var(--color-text-3);
}

.newsboard__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
  color: var(--color-text);
}

.home__build {
  margin: 0;
  padding: 24px 20px 0;
  text-align: center;
  font-size: 11px;
  color: var(--color-text-3);
}
</style>
