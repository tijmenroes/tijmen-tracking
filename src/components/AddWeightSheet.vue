<template>
  <!-- scrim -->
  <Transition name="scrim">
    <div v-if="open" class="sheet-scrim" @click="$emit('close')" />
  </Transition>

  <!-- sheet -->
  <div class="sheet" :class="{ 'sheet--open': open }">
    <!-- grabber -->
    <div class="sheet__grabber-row">
      <div class="sheet__grabber" />
    </div>

    <!-- header row -->
    <div class="sheet__header">
      <button class="sheet__action sheet__action--cancel" @click="$emit('close')">Annuleer</button>
      <span class="sheet__title">Nieuwe meting</span>
      <button class="sheet__action sheet__action--save" @click="handleSave">Bewaar</button>
    </div>

    <!-- weight stepper -->
    <div class="sheet__weight-area">
      <button class="sheet__step-btn" @click="adjust(-0.1)">−</button>
      <input
        ref="inputRef"
        v-model="weightStr"
        type="text"
        inputmode="decimal"
        placeholder="0.0"
        class="sheet__weight-input"
      />
      <button class="sheet__step-btn" @click="adjust(0.1)">+</button>
    </div>
    <div class="sheet__unit-label">kilogram</div>

    <!-- date -->
    <div class="sheet__field-row">
      <span class="sheet__field-label">Datum</span>
      <input v-model="selectedDate" type="date" class="sheet__date-input" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  lastWeight: number | null
}>()

const emit = defineEmits<{
  close: []
  save: [weight: number, date: string]
}>()

const weightStr = ref('')
const selectedDate = ref(todayString())
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (val) => {
    if (val) {
      weightStr.value = props.lastWeight !== null ? props.lastWeight.toFixed(1) : ''
      selectedDate.value = todayString()
      setTimeout(() => inputRef.value?.focus(), 250)
    }
  },
)

function adjust(delta: number) {
  const n = parseFloat(weightStr.value.replace(',', '.'))
  if (!isNaN(n)) weightStr.value = (n + delta).toFixed(1)
}

function handleSave() {
  const n = parseFloat(weightStr.value.replace(',', '.'))
  if (isNaN(n) || n <= 20 || n >= 300) return
  emit('save', n, selectedDate.value)
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}
</script>

<style scoped>
.sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.35);
}

.scrim-enter-active,
.scrim-leave-active {
  transition: opacity 200ms ease;
}
.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 91;
  background: var(--color-card);
  border-top-left-radius: var(--radius-sheet);
  border-top-right-radius: var(--radius-sheet);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.18);
  padding-bottom: max(30px, env(safe-area-inset-bottom));
  transform: translateY(110%);
  transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet--open {
  transform: translateY(0);
}

.sheet__grabber-row {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.sheet__grabber {
  width: 36px;
  height: 5px;
  border-radius: 99px;
  background: var(--color-text-3);
}

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px 4px;
}

.sheet__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.sheet__action {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.sheet__action--cancel { color: var(--color-text-2); }
.sheet__action--save   { color: var(--color-primary); font-weight: 600; }

.sheet__weight-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 24px 24px 0;
}

.sheet__step-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: none;
  background: var(--color-chip);
  color: var(--color-text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet__weight-input {
  width: 160px;
  text-align: center;
  font-size: 64px;
  font-weight: 300;
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
  font-variant-numeric: tabular-nums;
  padding: 0;
  letter-spacing: -0.02em;
}

.sheet__unit-label {
  text-align: center;
  color: var(--color-text-2);
  font-size: 14px;
  margin-top: -4px;
}

.sheet__field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 20px 0;
  background: var(--color-card-2);
  border-radius: 14px;
  padding: 14px 16px;
}

.sheet__field-label {
  font-size: 15px;
  color: var(--color-text);
}

.sheet__date-input {
  font-size: 16px;
  color: var(--color-text-2);
  background: transparent;
  border: none;
  outline: none;
  text-align: right;
}
</style>
