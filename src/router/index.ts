import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { resolveRouteTransition } from '@/composables/useRouteTransition'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { navDepth: 0 },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true, navDepth: 0 },
    },
    {
      path: '/weight',
      name: 'weight',
      component: () => import('@/views/WeightView.vue'),
      meta: { requiresAuth: true, navDepth: 1 },
    },
    {
      path: '/workout',
      name: 'workout',
      component: () => import('@/views/WorkoutView.vue'),
      meta: { requiresAuth: true, navDepth: 1 },
    },
    {
      path: '/workout/session/:id',
      name: 'workout-session',
      component: () => import('@/views/WorkoutSessionView.vue'),
      meta: { requiresAuth: true, navDepth: 2 },
    },
    {
      path: '/workout/celebration/:id',
      name: 'workout-celebration',
      component: () => import('@/views/WorkoutCelebrationView.vue'),
      meta: { requiresAuth: true, navDepth: 3 },
    },
    {
      path: '/workout/export',
      name: 'workout-export',
      component: () => import('@/views/WorkoutExportView.vue'),
      meta: { requiresAuth: true, navDepth: 2 },
    },
    {
      path: '/workout/history',
      name: 'workout-history',
      component: () => import('@/views/WorkoutHistoryView.vue'),
      meta: { requiresAuth: true, navDepth: 2 },
    },
    {
      path: '/workout/history/:id',
      name: 'workout-detail',
      component: () => import('@/views/WorkoutDetailView.vue'),
      meta: { requiresAuth: true, navDepth: 3 },
    },
    {
      path: '/workout/templates',
      name: 'workout-templates',
      component: () => import('@/views/WorkoutTemplatesView.vue'),
      meta: { requiresAuth: true, navDepth: 2 },
    },
    {
      path: '/workout/templates/:id/edit',
      name: 'template-edit',
      component: () => import('@/views/TemplateEditView.vue'),
      meta: { requiresAuth: true, navDepth: 4 },
    },
    {
      path: '/workout/templates/:id',
      name: 'template-detail',
      component: () => import('@/views/TemplateDetailView.vue'),
      meta: { requiresAuth: true, navDepth: 3 },
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: () => import('@/views/ExercisesView.vue'),
      meta: { requiresAuth: true, navDepth: 1 },
    },
    {
      path: '/exercises/:id/detail',
      name: 'exercise-detail',
      component: () => import('@/views/ExerciseDetailView.vue'),
      meta: { requiresAuth: true, navDepth: 2 },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true, navDepth: 1 },
    },
  ],
})

router.beforeEach(async (to, from) => {
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

  resolveRouteTransition(to, from)
})

export default router
