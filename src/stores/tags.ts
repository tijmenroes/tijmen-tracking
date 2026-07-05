import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types/fitness'

/**
 * Central store for exercise tags. Tags are shared across the exercises screen,
 * template editor and workout session, so the list is cached after the first
 * fetch. Mutations keep the cache in sync in place.
 */
export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function fetchTags(force = false) {
    if (loaded.value && !force) return
    if (inflight) return inflight

    loading.value = true
    error.value = null

    inflight = (async () => {
      try {
        const { data, error: err } = await supabase
          .from('tags')
          .select('*')
          .order('name')
        if (err) { error.value = err.message; return }
        tags.value = data ?? []
        loaded.value = true
      } finally {
        loading.value = false
        inflight = null
      }
    })()

    return inflight
  }

  async function createTag(name: string) {
    const { data, error: err } = await supabase
      .from('tags')
      .insert({ name: name.trim() })
      .select()
      .single()
    if (err) { error.value = err.message; return null }
    tags.value.push(data)
    tags.value.sort((a, b) => a.name.localeCompare(b.name))
    return data as Tag
  }

  return { tags, loading, error, loaded, fetchTags, createTag }
})
