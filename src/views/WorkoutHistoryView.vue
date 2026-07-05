<template>
  <div class="whist">
    <div class="whist__header">
      <button class="whist__back" @click="router.push('/workout')">‹</button>
      <div>
        <div class="whist__supra">Fitness</div>
        <h1 class="whist__title">Alle workouts</h1>
      </div>
    </div>

    <div class="whist__content">
      <div v-if="loading" class="whist__muted">Laden…</div>
      <div v-else-if="totalWorkouts === 0" class="whist__muted">Nog geen workouts.</div>

      <template v-else>
        <ul class="whist__list">
          <li
            v-for="w in workoutsPage"
            :key="w.id"
            class="whist__item"
            @click="router.push(`/workout/history/${w.id}`)"
          >
            <div class="whist__item-info">
              <span class="whist__item-name">{{ w.name || formatDate(w.date) }}</span>
              <span class="whist__item-sub">
                <template v-if="w.name">{{ formatDate(w.date) }} · </template>{{ w.exercise_count }} {{ w.exercise_count === 1 ? 'oefening' : 'oefeningen' }}
              </span>
            </div>
            <span class="whist__item-chevron">›</span>
          </li>
        </ul>

        <div class="whist__pager">
          <button class="whist__pager-btn" :disabled="page === 0" @click="go(page - 1)">‹ Vorige</button>
          <span class="whist__pager-info">Pagina {{ page + 1 }} van {{ totalPages }}</span>
          <button class="whist__pager-btn" :disabled="page >= totalPages - 1" @click="go(page + 1)">Volgende ›</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkouts } from '@/composables/useWorkouts'

const PAGE_SIZE = 10

const router = useRouter()
const { workoutsPage, totalWorkouts, loading, fetchWorkoutsPage } = useWorkouts()

const page = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalWorkouts.value / PAGE_SIZE)))

async function go(next: number) {
  page.value = next
  await fetchWorkoutsPage(next * PAGE_SIZE, PAGE_SIZE)
}

onMounted(() => go(0))

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}
</script>

<style scoped>
.whist {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.whist__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.whist__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.whist__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.whist__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.whist__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.whist__muted {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.whist__list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.whist__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
  cursor: pointer;
}

.whist__item:last-child {
  border-bottom: none;
}

.whist__item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.whist__item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  text-transform: capitalize;
}

.whist__item-sub {
  font-size: 13px;
  color: var(--color-text-2);
  text-transform: capitalize;
}

.whist__item-chevron {
  font-size: 22px;
  color: var(--color-text-3);
  line-height: 1;
  flex-shrink: 0;
}

.whist__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.whist__pager-btn {
  background: var(--color-card);
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
}

.whist__pager-btn:disabled {
  opacity: 0.4;
  cursor: default;
  color: var(--color-text-3);
}

.whist__pager-info {
  font-size: 13px;
  color: var(--color-text-2);
}
</style>
