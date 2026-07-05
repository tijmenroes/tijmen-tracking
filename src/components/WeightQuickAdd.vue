<template>
  <div class="quick-add">
    <div class="quick-add__weight-wrap">
      <input
        ref="inputRef"
        v-model="weightStr"
        type="text"
        inputmode="decimal"
        placeholder="0.0"
        class="quick-add__weight-input"
      />
      <span class="quick-add__unit">kg</span>
    </div>

    <input v-model="selectedDate" type="date" class="quick-add__date-input" />

    <button class="quick-add__btn" :disabled="!isValid" @click="handleSubmit">
      Voeg toe
    </button>

    <p v-if="error" class="quick-add__error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  lastWeight: number | null
  error: string | null
}>()

const emit = defineEmits<{
  save: [weight: number, date: string]
}>()

const weightStr = ref('')
const selectedDate = ref(todayString())

watch(
  () => props.lastWeight,
  (val) => {
    if (weightStr.value === '' && val !== null) weightStr.value = val.toFixed(1)
  },
  { immediate: true },
)

const parsed = computed(() => {
  const n = parseFloat(weightStr.value.replace(',', '.'))
  return isNaN(n) ? null : n
})

const isValid = computed(() => parsed.value !== null && parsed.value > 20 && parsed.value < 300)

function handleSubmit() {
  if (!isValid.value || parsed.value === null) return
  emit('save', parsed.value, selectedDate.value)
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}
</script>

<style scoped>
.quick-add {
  background: var(--color-card);
  border-radius: var(--radius-card);
  padding: 18px 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-add__weight-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
  background: var(--color-card-2);
  border-radius: 14px;
  padding: 12px 16px;
}

.quick-add__weight-input {
  flex: 1;
  min-width: 0;
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
}

.quick-add__unit {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-2);
  flex-shrink: 0;
}

.quick-add__date-input {
  background: var(--color-card-2);
  border: none;
  outline: none;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 16px;
  color: var(--color-text-2);
  width: 50%;
  align-self: flex-end;
  min-width: 0;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

.quick-add__btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms;
}

.quick-add__btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.quick-add__error {
  margin: 0;
  font-size: 13px;
  color: var(--color-up);
}
</style>
