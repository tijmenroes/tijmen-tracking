<template>
  <div class="hdetail">
    <div class="hdetail__header">
      <button class="hdetail__back" aria-label="Terug" @click="router.push('/habits')">‹</button>
      <div class="hdetail__header-text">
        <div class="hdetail__supra">{{ habit ? KIND_LABELS[habit.kind] : 'Habit' }}</div>
        <h1 class="hdetail__title">{{ habit?.name ?? '…' }}</h1>
      </div>
      <button
        v-if="habit"
        class="hdetail__edit"
        type="button"
        title="Bewerken"
        aria-label="Bewerken"
        @click="router.push(`/habits/${habit.id}/edit`)"
      >
        ✎
      </button>
    </div>

    <div v-if="!store.loaded && store.error" class="hdetail__message hdetail__message--error">{{ store.error }}</div>
    <div v-else-if="!store.loaded" class="hdetail__message">Laden…</div>
    <div v-else-if="!habit" class="hdetail__message">Habit niet gevonden.</div>

    <div v-else class="hdetail__content">
      <p v-if="habit.why" class="hdetail__why">Zodat {{ habit.why }}</p>
      <p v-if="store.error" class="hdetail__inline-error" role="alert">{{ store.error }}</p>

      <section class="card stats">
        <div class="stats__item">
          <div class="stats__value">{{ summary.achieved }}/{{ summary.counted }}</div>
          <div class="stats__label">weken behaald</div>
        </div>
        <div class="stats__item">
          <div class="stats__value">{{ shortStart }}</div>
          <div class="stats__label">loopt sinds</div>
        </div>
        <div class="stats__target">
          Doel: {{ currentTarget === null ? '—' : targetLabel(habit.kind, currentTarget) }}
          <span v-if="habit.auto_source"> · automatisch: {{ AUTO_SOURCE_LABELS[habit.auto_source].toLowerCase() }}</span>
        </div>
        <div v-if="habit.archived_at" class="stats__archived">Gestopt op {{ archivedDate }}</div>
      </section>

      <HabitChart :kind="habit.kind" :weeks="chartWeeks" />

      <section class="card weeks">
        <div class="weeks__title">Per week</div>
        <ul class="weeks__list">
          <li v-for="week in recentWeeks" :key="week.weekStart" class="weeks__item">
            <span class="weeks__range">{{ formatWeekRange(week.weekStart) }}</span>
            <span class="weeks__value">{{ weekValueLabel(habit, week) }}</span>
            <span class="weeks__status" :class="`weeks__status--${week.status}`">
              {{ STATUS_LABELS[week.status] }}
              <template v-if="week.partial"> · halve week</template>
              <template v-if="week.incomplete"> · onvolledig</template>
              <template v-if="week.estimated"> · geschat</template>
              <template v-if="week.overridden"> · handmatig</template>
            </span>
          </li>
        </ul>
      </section>

      <div class="hdetail__actions">
        <button class="hdetail__btn" type="button" @click="toggleArchived">
          {{ habit.archived_at ? 'Hervatten' : 'Stoppen (archiveren)' }}
        </button>
        <button class="hdetail__btn hdetail__btn--danger" type="button" @click="confirmDelete = true">
          Definitief verwijderen
        </button>
      </div>
    </div>

    <ConfirmModal
      v-if="confirmDelete && habit"
      title="Habit verwijderen?"
      :message="`'${habit.name}' en alle bijbehorende logs worden definitief verwijderd. Wil je alleen stoppen, kies dan archiveren.`"
      confirm-label="Verwijderen"
      danger
      @cancel="confirmDelete = false"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useHabitsStore } from '@/stores/habits'
import { parseLocalIsoDate, todayLocalIso, toLocalIso, weekStartIso } from '@/utils/dates'
import { summarizeWeeks, targetForWeek } from '@/utils/habitWeek'
import {
  AUTO_SOURCE_LABELS,
  KIND_LABELS,
  STATUS_LABELS,
  formatLongDate,
  formatWeekRange,
  targetLabel,
  weekValueLabel,
} from '@/content/habitCopy'

// ApexCharts is large; load it only when a detail screen is opened.
const HabitChart = defineAsyncComponent(() => import('@/components/HabitChart.vue'))

const CHART_WEEKS = 12

const route = useRoute()
const router = useRouter()
const store = useHabitsStore()
const today = todayLocalIso()
const confirmDelete = ref(false)

const habit = computed(() => store.habits.find((h) => h.id === Number(route.params.id)) ?? null)
const weeks = computed(() => (habit.value ? store.weeksFor(habit.value, today) : []))
const summary = computed(() => summarizeWeeks(weeks.value))
const chartWeeks = computed(() => weeks.value.slice(-CHART_WEEKS))
const recentWeeks = computed(() => [...weeks.value].reverse())

const currentTarget = computed(() =>
  habit.value ? targetForWeek(store.historyFor(habit.value).targets, weekStartIso(today)) : null,
)

const shortStart = computed(() =>
  habit.value
    ? parseLocalIsoDate(habit.value.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    : '',
)

const archivedDate = computed(() =>
  habit.value?.archived_at ? formatLongDate(toLocalIso(new Date(habit.value.archived_at))) : '',
)

async function toggleArchived() {
  if (!habit.value) return
  await store.setArchived(habit.value.id, !habit.value.archived_at)
}

async function handleDelete() {
  if (!habit.value) return
  const ok = await store.deleteHabit(habit.value.id)
  confirmDelete.value = false
  if (ok) void router.push('/habits')
}

onMounted(() => store.load())
</script>

<style scoped>
.hdetail {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.hdetail__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.hdetail__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.hdetail__header-text {
  flex: 1;
  min-width: 0;
}

.hdetail__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.hdetail__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.hdetail__edit {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-3);
  cursor: pointer;
  margin-top: 20px;
  padding: 4px;
}

.hdetail__message {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.hdetail__message--error,
.hdetail__inline-error {
  color: var(--color-up);
}

.hdetail__content {
  padding: 0 16px;
}

.hdetail__why {
  margin: -6px 4px 14px;
  font-size: 15px;
  font-style: italic;
  color: var(--color-text-2);
}

.hdetail__inline-error {
  margin: 0 0 12px;
  font-size: 13px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
}

.stats__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
}

.stats__label {
  font-size: 12px;
  color: var(--color-text-2);
}

.stats__target,
.stats__archived {
  grid-column: 1 / -1;
  font-size: 13px;
  color: var(--color-text-2);
}

.stats__archived {
  color: var(--color-up);
}

.weeks {
  padding: 16px 16px 6px;
}

.weeks__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.weeks__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.weeks__item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 12px;
  padding: 10px 0;
  border-top: 1px solid var(--color-hairline);
  font-size: 14px;
}

.weeks__range {
  color: var(--color-text);
}

.weeks__value {
  text-align: right;
  font-weight: 600;
  color: var(--color-text);
}

.weeks__status {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--color-text-3);
}

.weeks__status--achieved {
  color: var(--color-down);
}

.weeks__status--missed {
  color: var(--color-up);
}

.hdetail__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hdetail__btn {
  height: 48px;
  border: none;
  border-radius: 14px;
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  color: var(--color-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.hdetail__btn--danger {
  color: var(--color-up);
}
</style>
