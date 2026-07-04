<template>
  <div class="home">
    <div class="home__header">
      <div class="home__supra">Fitness</div>
      <h1 class="home__title">Overzicht</h1>
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
      <button v-if="isAdmin" class="metric-card" @click="router.push('/exercises')">
        <div class="metric-card__icon">📋</div>
        <div class="metric-card__label">Oefeningen beheren</div>
        <div class="metric-card__chevron">›</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'

const router = useRouter()
const profileStore = useProfileStore()
const { isAdmin } = storeToRefs(profileStore)

onMounted(() => profileStore.load())
</script>

<style scoped>
.home {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: 40px;
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
</style>
