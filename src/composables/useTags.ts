import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types/fitness'

export function useTags() {
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTags() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('tags')
      .select('*')
      .order('name')
    loading.value = false
    if (err) { error.value = err.message; return }
    tags.value = data ?? []
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

  return { tags, loading, error, fetchTags, createTag }
}
