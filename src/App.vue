<template>
  <div>
    <nav v-if="authStore.isAuthenticated">
      <RouterLink to="/">Home</RouterLink>
      <button @click="handleSignOut">Sign out</button>
    </nav>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

async function handleSignOut() {
  await authStore.signOut()
  router.push('/login')
}
</script>
