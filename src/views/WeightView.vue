<template>
  <div>
    <h1>Weight</h1>

    <form @submit.prevent="handleAdd">
      <input
        v-model="newWeight"
        type="number"
        step="0.1"
        min="0"
        placeholder="Enter weight"
        required
      />
      <label>
        <input v-model="newIsKg" type="checkbox" /> kg
      </label>
      <button type="submit" :disabled="loading">Add</button>
    </form>

    <p v-if="error">{{ error }}</p>

    <p v-if="loading && weights.length === 0">Loading...</p>

    <table v-else-if="weights.length > 0">
      <thead>
        <tr>
          <th>Date</th>
          <th>Weight</th>
          <th>Unit</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in weights" :key="entry.id">
          <td>{{ formatDate(entry.created_at) }}</td>
          <td>
            <template v-if="editingId === entry.id">
              <input v-model="editValue" type="number" step="0.1" min="0" />
            </template>
            <template v-else>
              {{ entry.weight }}
            </template>
          </td>
          <td>{{ entry.is_kg ? 'kg' : 'lbs' }}</td>
          <td>
            <template v-if="editingId === entry.id">
              <button @click="saveEdit(entry.id)">Save</button>
              <button @click="cancelEdit">Cancel</button>
            </template>
            <template v-else>
              <button @click="startEdit(entry)">Edit</button>
              <button @click="handleDelete(entry.id)">Delete</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>No entries yet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWeights, type Weight } from '@/composables/useWeights'

const { weights, loading, error, fetchWeights, addWeight, updateWeight, deleteWeight } =
  useWeights()

const newWeight = ref<number | null>(null)
const newIsKg = ref(true)

const editingId = ref<number | null>(null)
const editValue = ref<number | null>(null)

onMounted(fetchWeights)

async function handleAdd() {
  if (newWeight.value === null) return
  await addWeight(newWeight.value, newIsKg.value)
  if (!error.value) {
    newWeight.value = null
  }
}

function startEdit(entry: Weight) {
  editingId.value = entry.id
  editValue.value = entry.weight
}

function cancelEdit() {
  editingId.value = null
  editValue.value = null
}

async function saveEdit(id: number) {
  if (editValue.value === null) return
  await updateWeight(id, editValue.value)
  if (!error.value) {
    editingId.value = null
    editValue.value = null
  }
}

async function handleDelete(id: number) {
  await deleteWeight(id)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}
</script>
