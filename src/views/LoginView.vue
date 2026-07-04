<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__brand">
        <div class="auth-card__logo">💪</div>
        <h1 class="auth-card__title">{{ isSignUp ? 'Account aanmaken' : 'Welkom terug' }}</h1>
        <p class="auth-card__sub">{{ isSignUp ? 'Maak een account aan om te beginnen.' : 'Log in om verder te gaan.' }}</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form__field">
          <label class="auth-form__label" for="email">E-mailadres</label>
          <input
            id="email"
            v-model="email"
            class="auth-form__input"
            type="email"
            required
            autocomplete="email"
            placeholder="naam@voorbeeld.nl"
          />
        </div>

        <div class="auth-form__field">
          <label class="auth-form__label" for="password">Wachtwoord</label>
          <PasswordInput
            id="password"
            v-model="password"
            :autocomplete="isSignUp ? 'new-password' : 'current-password'"
            required
          />
        </div>

        <p v-if="error" class="auth-form__error">{{ error }}</p>
        <p v-if="successMessage" class="auth-form__success">{{ successMessage }}</p>

        <button class="auth-form__submit" type="submit" :disabled="loading">
          {{ loading ? 'Laden...' : isSignUp ? 'Account aanmaken' : 'Inloggen' }}
        </button>
      </form>

      <button class="auth-card__toggle" @click="toggleMode">
        {{ isSignUp ? 'Al een account? Inloggen' : 'Nog geen account? Aanmaken' }}
      </button>
    </div>
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
      successMessage.value = 'Check je e-mail om je account te bevestigen.'
    }
  } else {
    await signIn(email.value, password.value)
    if (!error.value && authStore.isAuthenticated) {
      router.push('/')
    }
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100dvh;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 36px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.auth-card__brand {
  text-align: center;
}

.auth-card__logo {
  font-size: 36px;
  line-height: 1;
  margin-bottom: 12px;
}

.auth-card__title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin: 0 0 6px;
}

.auth-card__sub {
  font-size: 14px;
  color: var(--color-text-2);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.auth-form__input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  background: var(--color-card-2);
  border: 1.5px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  color: var(--color-text);
  outline: none;
  transition: border-color 150ms;
}

.auth-form__input:focus {
  border-color: var(--color-primary);
}

.auth-form__error {
  margin: 0;
  font-size: 13px;
  color: var(--color-up);
}

.auth-form__success {
  margin: 0;
  font-size: 13px;
  color: var(--color-down);
}

.auth-form__submit {
  margin-top: 4px;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms;
}

.auth-form__submit:disabled {
  opacity: 0.5;
  cursor: default;
}

.auth-card__toggle {
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  text-align: center;
}
</style>
