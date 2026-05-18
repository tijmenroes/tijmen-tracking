import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function signIn(email: string, password: string) {
    loading.value = true
    error.value = null
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) error.value = err.message
    loading.value = false
  }

  async function signUp(email: string, password: string) {
    loading.value = true
    error.value = null
    const { error: err } = await supabase.auth.signUp({ email, password })
    if (err) error.value = err.message
    loading.value = false
  }

  return { loading, error, signIn, signUp }
}
