import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ActivityEvent } from '@/types/fitness'

const HOME_FEED_LIMIT = 5

export const useActivityFeedStore = defineStore('activityFeed', () => {
  const events = ref<ActivityEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRecent() {
    loading.value = true
    error.value = null

    const { data, error: fetchError } = await supabase
      .from('activity_events')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(HOME_FEED_LIMIT)

    if (fetchError) {
      error.value = fetchError.message
      events.value = []
    } else {
      events.value = (data ?? []) as ActivityEvent[]
    }
    loading.value = false
  }

  function reset() {
    events.value = []
    loading.value = false
    error.value = null
  }

  return { events, loading, error, fetchRecent, reset }
})
