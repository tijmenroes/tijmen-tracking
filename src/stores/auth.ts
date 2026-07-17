import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value)

  async function initialize() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
    // Drop cached API responses so a next account on this device can't read them.
    if (typeof caches !== 'undefined') {
      await caches.delete('supabase-rest')
    }
  }

  return { session, user, isAuthenticated, initialize, signOut }
})
