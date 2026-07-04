import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/fitness'

export const useProfileStore = defineStore('profile', () => {
  const isAdmin = ref(false)
  const goals = ref<string | null>(null)
  const notes = ref<string | null>(null)
  const llmPrompt = ref<string | null>(null)
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    const { data } = await supabase
      .from('profiles')
      .select('is_admin, goals, notes, llm_prompt')
      .single()
    if (data) {
      isAdmin.value = data.is_admin ?? false
      goals.value = data.goals ?? null
      notes.value = data.notes ?? null
      llmPrompt.value = data.llm_prompt ?? null
    }
    loaded.value = true
  }

  async function save(updates: Pick<Profile, 'goals' | 'notes' | 'llm_prompt'>) {
    const { error } = await supabase
      .from('profiles')
      .update({
        goals: updates.goals,
        notes: updates.notes,
        llm_prompt: updates.llm_prompt,
      })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    if (!error) {
      goals.value = updates.goals
      notes.value = updates.notes
      llmPrompt.value = updates.llm_prompt
    }
    return error
  }

  function reset() {
    isAdmin.value = false
    goals.value = null
    notes.value = null
    llmPrompt.value = null
    loaded.value = false
  }

  return { isAdmin, goals, notes, llmPrompt, loaded, load, save, reset }
})
