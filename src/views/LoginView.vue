<template>
  <div>
    <h1>{{ isSignUp ? 'Sign up' : 'Sign in' }}</h1>

    <form @submit.prevent="handleSubmit">
      <div>
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" required autocomplete="email" />
      </div>

      <div>
        <label for="password">Password</label>
        <PasswordInput
          id="password"
          v-model="password"
          :autocomplete="isSignUp ? 'new-password' : 'current-password'"
          required
        />
      </div>

      <p v-if="error">{{ error }}</p>
      <p v-if="successMessage">{{ successMessage }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in' }}
      </button>
    </form>

    <button @click="toggleMode">
      {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import PasswordInput from '@/components/PasswordInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const { loading, error, signIn, signUp } = useAuth()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const successMessage = ref<string | null>(null)

function toggleMode() {
  isSignUp.value = !isSignUp.value
  error.value = null
  successMessage.value = null
}

async function handleSubmit() {
  successMessage.value = null
  if (isSignUp.value) {
    await signUp(email.value, password.value)
    if (!error.value) {
      successMessage.value = 'Check your email to confirm your account.'
    }
  } else {
    await signIn(email.value, password.value)
    if (!error.value && authStore.isAuthenticated) {
      router.push('/')
    }
  }
}
</script>
