import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Exercise, Tag } from '@/types/fitness'

/**
 * Central store for the exercise catalogue. Exercises are shared across the
 * exercises screen, the template editor and the workout session, so the list is
 * cached after the first fetch. Mutations keep the cache in sync in place, so no
 * refetch is needed.
 */
export const useExercisesStore = defineStore('exercises', () => {
  const exercises = ref<Exercise[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  async function fetchExercises(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('exercises')
      .select('*, tags(*)')
      .order('name')
    loading.value = false
    if (err) { error.value = err.message; return }
    exercises.value = data ?? []
    loaded.value = true
  }

  async function createExercise(name: string, type: Exercise['type'], tagIds: number[] = []) {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return null

    const { data, error: err } = await supabase
      .from('exercises')
      .insert({ name: name.trim(), type, created_by: user.id })
      .select()
      .single()
    if (err) { error.value = err.message; return null }

    let tags: Tag[] = []
    if (tagIds.length > 0) {
      const { error: linkErr } = await supabase
        .from('exercise_tags')
        .insert(tagIds.map((tag_id) => ({ exercise_id: data.id, tag_id })))
      if (linkErr) { error.value = linkErr.message; return null }
      const { data: tagRows } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds)
      tags = tagRows ?? []
    }

    const exercise: Exercise = { ...data, tags }
    exercises.value.push(exercise)
    exercises.value.sort((a, b) => a.name.localeCompare(b.name))
    return exercise
  }

  async function updateExercise(id: number, updates: { name?: string; type?: Exercise['type'] }) {
    const patch: { name?: string; type?: Exercise['type'] } = {}
    if (updates.name !== undefined) patch.name = updates.name.trim()
    if (updates.type !== undefined) patch.type = updates.type

    const { data, error: err } = await supabase
      .from('exercises')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (err) { error.value = err.message; return null }

    const target = exercises.value.find((e) => e.id === id)
    if (target) {
      target.name = data.name
      target.type = data.type
    }
    exercises.value.sort((a, b) => a.name.localeCompare(b.name))
    return data as Exercise
  }

  async function updateExerciseTags(exerciseId: number, tagIds: number[]) {
    const { error: delErr } = await supabase
      .from('exercise_tags')
      .delete()
      .eq('exercise_id', exerciseId)
    if (delErr) { error.value = delErr.message; return }

    let tags: Tag[] = []
    if (tagIds.length > 0) {
      const { error: insErr } = await supabase
        .from('exercise_tags')
        .insert(tagIds.map((tag_id) => ({ exercise_id: exerciseId, tag_id })))
      if (insErr) { error.value = insErr.message; return }
      const { data: tagRows } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds)
      tags = tagRows ?? []
    }

    const target = exercises.value.find((e) => e.id === exerciseId)
    if (target) target.tags = tags
  }

  async function deleteExercise(id: number) {
    const { error: err } = await supabase.from('exercises').delete().eq('id', id)
    if (err) { error.value = err.message; return }
    exercises.value = exercises.value.filter(e => e.id !== id)
  }

  function getById(id: number): Exercise | undefined {
    return exercises.value.find((e) => e.id === id)
  }

  return { exercises, loading, error, loaded, fetchExercises, createExercise, updateExercise, updateExerciseTags, deleteExercise, getById }
})
