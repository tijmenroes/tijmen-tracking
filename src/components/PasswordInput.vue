<template>
  <div style="position: relative; display: inline-flex; align-items: center;">
    <input
      :id="id"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      :autocomplete="autocomplete"
      :required="required"
      style="padding-right: 2rem;"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      style="position: absolute; right: 0.25rem; background: none; border: none; cursor: pointer; padding: 0 0.25rem; font-size: 0.75rem;"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      @click="visible = !visible"
    >
      {{ visible ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    autocomplete?: string
    required?: boolean
  }>(),
  { autocomplete: 'current-password', required: false },
)

defineEmits<{ 'update:modelValue': [value: string] }>()

const visible = ref(false)
</script>
