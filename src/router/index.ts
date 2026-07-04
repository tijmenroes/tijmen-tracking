import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/weight',
      name: 'weight',
      component: () => import('@/views/WeightView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workout',
      name: 'workout',
      component: () => import('@/views/WorkoutView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workout/session/:id',
      name: 'workout-session',
      component: () => import('@/views/WorkoutSessionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workout/export',
      name: 'workout-export',
      component: () => import('@/views/WorkoutExportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workout/history',
      name: 'workout-history',
      component: () => import('@/views/WorkoutHistoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: () => import('@/views/ExercisesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/exercises/:id/detail',
      name: 'exercise-detail',
      component: () => import('@/views/ExerciseDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Initialize session once on first navigation
  if (authStore.session === null) {
    await authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
