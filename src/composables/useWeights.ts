import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface Weight {
  id: number
  created_at: string
  weight: number | null
  is_kg: boolean | null
}

export function useWeights() {
  const weights = ref<Weight[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWeights() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('Weight')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) error.value = err.message
    else weights.value = data ?? []
    loading.value = false
  }

  async function addWeight(weight: number, isKg = true) {
    error.value = null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'Not authenticated'
      return
    }
    const { data, error: err } = await supabase
      .from('Weight')
      .insert({ weight, is_kg: isKg, user_id: user.id })
      .select()
      .single()
    if (err) {
      error.value = err.message
      return
    }
    if (data) weights.value.unshift(data)
  }

  async function updateWeight(id: number, weight: number) {
    error.value = null
    const { data, error: err } = await supabase
      .from('Weight')
      .update({ weight })
      .eq('id', id)
      .select()
      .single()
    if (err) {
      error.value = err.message
      return
    }
    if (data) {
      const index = weights.value.findIndex((w) => w.id === id)
      if (index !== -1) weights.value[index] = data
    }
  }

  async function deleteWeight(id: number) {
    error.value = null
    const { error: err } = await supabase.from('Weight').delete().eq('id', id)
    if (err) {
      error.value = err.message
      return
    }
    weights.value = weights.value.filter((w) => w.id !== id)
  }

  return { weights, loading, error, fetchWeights, addWeight, updateWeight, deleteWeight }
}
