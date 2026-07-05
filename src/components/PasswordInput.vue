<template>
  <div class="pw-wrap">
    <input
      :id="id"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      :autocomplete="autocomplete"
      :required="required"
      class="pw-wrap__input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      class="pw-wrap__toggle"
      :aria-label="visible ? 'Verberg wachtwoord' : 'Toon wachtwoord'"
      @click="visible = !visible"
    >
      {{ visible ? 'Verberg' : 'Toon' }}
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

<style scoped>
.pw-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pw-wrap__input {
  width: 100%;
  height: 46px;
  padding: 0 60px 0 14px;
  background: var(--color-card-2);
  border: 1.5px solid transparent;
  border-radius: 12px;
  font-size: 16px;
  color: var(--color-text);
  outline: none;
  transition: border-color 150ms;
  font-family: inherit;
}

.pw-wrap__input:focus {
  border-color: var(--color-primary);
}

.pw-wrap__toggle {
  position: absolute;
  right: 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
  padding: 0;
  line-height: 1;
}
</style>
