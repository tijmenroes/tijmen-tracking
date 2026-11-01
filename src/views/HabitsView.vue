<template>
  <div class="habits">
    <div class="habits__header">
      <button class="habits__back" aria-label="Terug" @click="router.push('/')">‹</button>
      <div class="habits__header-text">
        <div class="habits__supra">Habits</div>
        <h1 class="habits__title">{{ weekTitle }}</h1>
      </div>
      <button class="habits__add" type="button" aria-label="Nieuwe habit" @click="router.push('/habits/new')">
        +
      </button>
    </div>

    <div class="week-nav">
      <button class="week-nav__btn" type="button" aria-label="Vorige week" @click="shiftWeek(-1)">‹</button>
      <span class="week-nav__range">{{ formatWeekRange(weekStart) }}</span>
      <button
        class="week-nav__btn"
        type="button"
        aria-label="Volgende week"
        :disabled="isCurrentWeek"
        @click="shiftWeek(1)"
      >
        ›
      </button>
    </div>

    <div v-if="!store.loaded && store.error" class="habits__message habits__message--error">{{ store.error }}</div>
    <div v-else-if="!store.loaded" class="habits__message">Laden…</div>

    <div v-else class="habits__content">
      <p v-if="store.error" class="habits__inline-error" role="alert">{{ store.error }}</p>

      <section class="card grid" aria-label="Habits deze week">
        <div class="cells grid__days">
          <button
            v-for="date in dates"
            :key="date"
            type="button"
            class="grid__day"
            :class="{
              'grid__day--today': date === today,
              'grid__day--selected': date === selectedDate,
            }"
            :disabled="date > today"
            :aria-pressed="date === selectedDate"
            :aria-label="`${formatDayLabel(date, today)}${missingCheckin(date) ? ', nog geen check-in' : ''}`"
            @click="selectDay(date)"
          >
            <span class="grid__day-name">{{ weekdayInitial(date) }}</span>
            <span class="grid__day-num">{{ dayOfMonth(date) }}</span>
            <span class="grid__day-dot" :class="{ 'grid__day-dot--visible': missingCheckin(date) }" />
          </button>
        </div>

        <div v-if="rows.length === 0" class="grid__empty">
          <p>Nog geen habits.</p>
          <button class="grid__empty-btn" type="button" @click="router.push('/habits/new')">
            Maak je eerste habit
          </button>
        </div>

        <ul v-else ref="listRef" class="grid__habits">
          <li
            v-for="(row, idx) in rows"
            :key="row.habit.id"
            class="habit-row"
            :class="{
              'habit-row--dragging': drag.isDragging(idx),
              'habit-row--over': drag.isOver(idx),
            }"
          >
            <div class="habit-row__head">
              <button
                type="button"
                class="habit-row__drag"
                aria-label="Verslepen om volgorde te wijzigen"
                @pointerdown="drag.onPointerDown($event, idx)"
                @pointermove="drag.onPointerMove"
                @pointerup="drag.onPointerUp"
                @pointercancel="drag.onPointerUp"
              >
                ⠿
              </button>
              <button type="button" class="habit-row__name" @click="router.push(`/habits/${row.habit.id}`)">
                {{ row.habit.name }}
              </button>
              <span class="habit-row__progress" :class="`habit-row__progress--${row.week.status}`">
                {{ weekValueLabel(row.habit, row.week) }}
              </span>
            </div>
            <div class="habit-row__meta">{{ row.summary.achieved }}/{{ row.summary.counted }} weken behaald</div>

            <button
              v-if="row.habit.kind === 'weight'"
              type="button"
              class="weight-cell"
              :class="`weight-cell--${row.week.status}`"
              :disabled="row.week.status === 'not_started'"
              :aria-label="`${row.habit.name}: ${STATUS_LABELS[row.week.status]}. Tik om handmatig aan te passen.`"
              @click="store.cycleWeekOverride(row.habit, weekStart)"
            >
              {{ STATUS_LABELS[row.week.status] }}
              <span v-if="row.week.estimated" class="weight-cell__note">· geschat</span>
              <span v-if="row.week.overridden" class="weight-cell__note">· handmatig</span>
            </button>

            <div v-else class="cells">
              <button
                v-for="day in row.week.days"
                :key="day.date"
                type="button"
                class="cell"
                :class="cellClasses(row.habit, day)"
                :disabled="day.done === null"
                :aria-pressed="day.done === true"
                :aria-label="cellLabel(row.habit, day)"
                @click="store.toggleDay(row.habit, day.date, today)"
              >
                {{ cellSymbol(row.habit, day) }}
              </button>
            </div>
          </li>
        </ul>

        <div class="happiness-row">
          <div class="happiness-row__label">Happiness</div>
          <div class="cells">
            <button
              v-for="date in dates"
              :key="date"
              type="button"
              class="cell cell--happiness"
              :class="{ 'cell--selected': date === selectedDate, 'cell--today': date === today }"
              :disabled="date > today"
              :aria-label="`Happiness ${formatDayLabel(date, today)}`"
              @click="selectDay(date)"
            >
              {{ store.checkinFor(date)?.happiness ?? '·' }}
            </button>
          </div>
        </div>
      </section>

      <HabitDayCard :date="selectedDate" :today="today" />

      <section v-if="store.archivedHabits.length" class="archived">
        <button class="archived__toggle" type="button" @click="showArchived = !showArchived">
          Gestopte habits ({{ store.archivedHabits.length }}) {{ showArchived ? '▾' : '▸' }}
        </button>
        <ul v-if="showArchived" class="card archived__list">
          <li v-for="habit in store.archivedHabits" :key="habit.id">
            <button type="button" class="archived__item" @click="router.push(`/habits/${habit.id}`)">
              <span>{{ habit.name }}</span>
              <span class="archived__chevron">›</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HabitDayCard from '@/components/HabitDayCard.vue'
import { useDragSort } from '@/composables/useDragSort'
import { useHabitsStore } from '@/stores/habits'
import { addDaysIso, parseLocalIsoDate, todayLocalIso, weekStartIso } from '@/utils/dates'
import { summarizeWeeks, weekDates, type HabitDay } from '@/utils/habitWeek'
import {
  STATUS_LABELS,
  formatDayLabel,
  formatWeekRange,
  weekValueLabel,
  weekdayInitial,
} from '@/content/habitCopy'
import type { Habit } from '@/types/habits'

const router = useRouter()
const store = useHabitsStore()

const today = todayLocalIso()
const currentWeek = weekStartIso(today)
const weekStart = ref(currentWeek)
const selectedDate = ref(today)
const showArchived = ref(false)
const listRef = ref<HTMLElement | null>(null)

const drag = useDragSort({
  container: listRef,
  itemSelector: '.habit-row',
  onDrop: store.reorderHabits,
})

const dates = computed(() => weekDates(weekStart.value))
const isCurrentWeek = computed(() => weekStart.value === currentWeek)

const weekTitle = computed(() => {
  if (isCurrentWeek.value) return 'Deze week'
  if (weekStart.value === addDaysIso(currentWeek, -7)) return 'Vorige week'
  return 'Eerder'
})

const rows = computed(() =>
  store.activeHabits.map((habit) => ({
    habit,
    week: store.weekFor(habit, weekStart.value, today),
    summary: summarizeWeeks(store.weeksFor(habit, today)),
  })),
)

/** The first day any habit (active or stopped) was running; check-in dots start there. */
const earliestStart = computed(() =>
  store.habits.reduce<string | null>((min, h) => (min === null || h.start_date < min ? h.start_date : min), null),
)

function missingCheckin(date: string): boolean {
  if (date >= today || earliestStart.value === null || date < earliestStart.value) return false
  return !store.checkinFor(date)
}

function dayOfMonth(date: string): number {
  return parseLocalIsoDate(date).getDate()
}

function selectDay(date: string) {
  if (date <= today) selectedDate.value = date
}

function shiftWeek(delta: number) {
  const next = addDaysIso(weekStart.value, delta * 7)
  if (next > currentWeek) return
  weekStart.value = next
  // Show the most recent day of that week: today, or Sunday for past weeks.
  const sunday = addDaysIso(next, 6)
  selectedDate.value = sunday < today ? sunday : today
}

function cellClasses(habit: Habit, day: HabitDay) {
  return {
    'cell--on': day.done === true,
    'cell--off': day.done === false && habit.kind === 'avoid',
    'cell--auto': day.source === 'auto',
    'cell--today': day.date === today,
    'cell--selected': day.date === selectedDate.value,
  }
}

function cellSymbol(habit: Habit, day: HabitDay): string {
  if (day.done === true) return '✓'
  if (day.done === false && habit.kind === 'avoid') return '✕'
  return ''
}

function cellLabel(habit: Habit, day: HabitDay): string {
  const when = formatDayLabel(day.date, today)
  if (day.done === null) return `${habit.name}, ${when}: niet in te vullen`
  const state =
    habit.kind === 'avoid' ? (day.done ? 'gelukt' : 'niet gelukt') : day.done ? 'gedaan' : 'niet gedaan'
  return `${habit.name}, ${when}: ${state}${day.source === 'auto' ? ' (automatisch)' : ''}`
}

onMounted(() => store.load())
</script>

<style scoped>
.habits {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.habits__header {
  padding: 56px 20px 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.habits__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.habits__header-text {
  flex: 1;
  min-width: 0;
}

.habits__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.habits__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.habits__add {
  margin-top: 14px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--shadow-fab);
}

.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
}

.week-nav__btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--color-card);
  box-shadow: var(--shadow-chip-active);
  color: var(--color-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.week-nav__btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.week-nav__range {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.habits__message {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.habits__message--error,
.habits__inline-error {
  color: var(--color-up);
}

.habits__inline-error {
  margin: 0 0 12px;
  font-size: 13px;
}

.habits__content {
  padding: 0 16px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.grid {
  padding: 12px 14px 14px;
}

/* Seven equal columns, shared by the day header, habit rows and happiness row. */
.cells {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.grid__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 0 4px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
}

.grid__day:disabled {
  opacity: 0.4;
  cursor: default;
}

.grid__day--today {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.grid__day--selected .grid__day-num {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.grid__day-name {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.grid__day-num {
  font-size: 15px;
  font-weight: 700;
  color: inherit;
}

.grid__day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
}

.grid__day-dot--visible {
  background: var(--color-up);
}

.grid__empty {
  padding: 20px 0 12px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.grid__empty p {
  margin: 0 0 10px;
}

.grid__empty-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.grid__habits {
  list-style: none;
  margin: 0;
  padding: 0;
}

.habit-row {
  padding: 12px 0 10px;
  border-top: 1px solid var(--color-hairline);
}

.habit-row--dragging {
  opacity: 0.55;
}

.habit-row--over {
  box-shadow: inset 0 2px 0 var(--color-primary);
}

.habit-row__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.habit-row__drag {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-3);
  font-size: 16px;
  line-height: 1;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.habit-row__name {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.habit-row__progress {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.habit-row__progress--achieved {
  color: var(--color-down);
}

.habit-row__progress--missed {
  color: var(--color-up);
}

.habit-row__meta {
  margin: 2px 0 8px 30px;
  font-size: 12px;
  color: var(--color-text-3);
}

.cell {
  height: 38px;
  border: 1.5px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  color: var(--color-text-3);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.cell:disabled {
  opacity: 0.35;
  cursor: default;
}

.cell--today {
  border-color: var(--color-primary);
}

.cell--on {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.cell--auto {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.cell--off {
  background: var(--color-up-soft);
  border-color: var(--color-up-soft);
  color: var(--color-up);
}

.cell--happiness {
  font-size: 14px;
  color: var(--color-text);
}

.cell--happiness.cell--selected {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.weight-cell {
  width: 100%;
  height: 38px;
  border: 1.5px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  color: var(--color-text-2);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.weight-cell:disabled {
  opacity: 0.35;
  cursor: default;
}

.weight-cell--achieved {
  background: var(--color-down-soft);
  color: var(--color-down);
}

.weight-cell--missed {
  background: var(--color-up-soft);
  color: var(--color-up);
}

.weight-cell__note {
  font-weight: 500;
}

.happiness-row {
  padding-top: 12px;
  border-top: 1px solid var(--color-hairline);
}

.happiness-row__label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.archived__toggle {
  padding: 4px 4px 10px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-2);
  cursor: pointer;
}

.archived__list {
  list-style: none;
  padding: 0;
  overflow: hidden;
}

.archived__item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 14px 18px;
  border: none;
  border-bottom: 1px solid var(--color-hairline);
  background: none;
  font-size: 15px;
  color: var(--color-text);
  cursor: pointer;
}

.archived__list li:last-child .archived__item {
  border-bottom: none;
}

.archived__chevron {
  color: var(--color-text-3);
}
</style>
