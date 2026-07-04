<template>
  <div class="page">
    <!-- Header -->
    <div class="page__header">
      <div class="page__header-top">
        <div class="page__header-left">
          <button class="page__back" aria-label="Terug" @click="router.push('/')">‹</button>
          <div class="page__supra">Gezondheid</div>
        </div>
        <button class="page__signout" @click="handleSignOut">Uitloggen</button>
      </div>
      <div class="page__title-row">
        <h1 class="page__title">Gewicht</h1>
        <span class="page__date">{{ todayLabel }}</span>
      </div>
    </div>

    <!-- Cards -->
    <div class="page__content">
      <WeightQuickAdd
        :last-weight="currentWeight"
        :error="error"
        @save="handleAdd"
      />
      <WeightChart :weights="weights" />
      <WeightGoalCard :current-weight="currentWeight" />
      <WeightTableCard
        :weights="weights"
        @save="handleUpdate"
        @cancel-edit="() => {}"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWeights } from '@/composables/useWeights'
import { useAuthStore } from '@/stores/auth'
import WeightQuickAdd from '@/components/WeightQuickAdd.vue'
import WeightChart from '@/components/WeightChart.vue'
import WeightGoalCard from '@/components/WeightGoalCard.vue'
import WeightTableCard from '@/components/WeightTableCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const { weights, error, fetchWeights, addWeight, updateWeight, deleteWeight } = useWeights()

const currentWeight = computed(
  () =>
    [...weights.value]
      .filter((w) => w.weight !== null && w.date !== null)
      .sort((a, b) => b.date!.localeCompare(a.date!))
      .at(0)?.weight ?? null,
)

const todayLabel = computed(() =>
  new Date().toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }),
)

onMounted(fetchWeights)

async function handleAdd(weight: number, date: string) {
  await addWeight(weight, date)
}

async function handleUpdate(id: number, weight: number) {
  await updateWeight(id, weight)
}

async function handleDelete(id: number) {
  await deleteWeight(id)
}

async function handleSignOut() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: 40px;
}

.page__header {
  padding: 56px 20px 18px;
}

.page__header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page__header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page__back {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  margin-left: -4px;
}

.page__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.page__signout {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
}

.page__title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 4px;
}

.page__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--color-text);
}

.page__date {
  font-size: 13px;
  color: var(--color-text-2);
}

.page__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px;
}
</style>
