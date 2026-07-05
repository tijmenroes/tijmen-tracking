<template>
  <div class="table-section">
    <div class="table-section__header">
      <span class="table-section__title">Recente metingen</span>
      <span class="table-section__count">{{ weights.length }} totaal</span>
    </div>

    <div class="table-card">
      <div
        v-for="(entry, i) in sorted.slice(0, 8)"
        :key="entry.id"
        class="table-row"
        :class="{ 'table-row--last': i === Math.min(sorted.length, 8) - 1 }"
      >
        <!-- date icon -->
        <div class="table-row__date-icon">
          {{ entry.date ? parseDate(entry.date).getDate() : '?' }}
        </div>

        <!-- date labels -->
        <div class="table-row__labels">
          <div class="table-row__rel">{{ entry.date ? relativeLabel(entry.date) : '—' }}</div>
          <div class="table-row__weekday">
            {{ entry.date ? parseDate(entry.date).toLocaleDateString('nl-NL', { weekday: 'long' }) : '' }}
          </div>
        </div>

        <!-- weight + delta -->
        <div class="table-row__right">
          <template v-if="editingId === entry.id">
            <input
              v-model.number="editValue"
              type="number"
              step="0.1"
              min="0"
              class="table-row__edit-input"
              @keyup.enter="handleSave(entry.id)"
              @keyup.escape="handleCancel"
            />
            <button class="table-row__action table-row__action--save"
                    @click="handleSave(entry.id)">✓</button>
            <button class="table-row__action table-row__action--cancel"
                    @click="handleCancel">✕</button>
          </template>
          <template v-else>
            <span v-if="sorted[i + 1]" class="table-row__delta"
                  :class="deltaClass(entry, sorted[i + 1]!)">
              {{ deltaLabel(entry, sorted[i + 1]!) }}
            </span>
            <span class="table-row__weight">
              {{ entry.weight?.toFixed(1) }}<span class="table-row__unit"> kg</span>
            </span>
            <button class="table-row__action" @click="startEdit(entry)">✎</button>
            <button class="table-row__action table-row__action--delete"
                    @click="$emit('delete', entry.id)">✕</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Weight } from '@/composables/useWeights'

const props = defineProps<{ weights: Weight[] }>()
const emit = defineEmits<{
  save: [id: number, weight: number]
  cancelEdit: []
  delete: [id: number]
}>()

const editingId = ref<number | null>(null)
const editValue = ref<number | null>(null)

const sorted = computed(() =>
  [...props.weights]
    .filter((w) => w.weight !== null)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
)

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function relativeLabel(dateStr: string): string {
  const date = parseDate(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000)
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Gisteren'
  if (diff < 7) return `${diff} dagen geleden`
  return parseDate(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function deltaLabel(current: Weight, previous: Weight): string {
  const d = (current.weight ?? 0) - (previous.weight ?? 0)
  if (d === 0) return ''
  return `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(1)}`
}

function deltaClass(current: Weight, previous: Weight): string {
  const d = (current.weight ?? 0) - (previous.weight ?? 0)
  if (d < 0) return 'table-row__delta--down'
  if (d > 0) return 'table-row__delta--up'
  return ''
}

function startEdit(entry: Weight) {
  editingId.value = entry.id
  editValue.value = entry.weight
}

function handleSave(id: number) {
  editingId.value = null
  emit('save', id, editValue.value!)
}

function handleCancel() {
  editingId.value = null
  emit('cancelEdit')
}

defineExpose({ editingId, editValue, startEdit })
</script>

<style scoped>
.table-section__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 6px 8px;
}

.table-section__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table-section__count {
  font-size: 12px;
  color: var(--color-text-3);
}

.table-card {
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.table-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 0.5px solid var(--color-hairline);
}

.table-row--last {
  border-bottom: none;
}

.table-row__date-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-row-icon);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-row__labels {
  flex: 1;
  min-width: 0;
}

.table-row__rel {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.table-row__weekday {
  font-size: 12px;
  color: var(--color-text-3);
  text-transform: capitalize;
}

.table-row__right {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-shrink: 0;
}

.table-row__delta {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.table-row__delta--down { color: var(--color-down); }
.table-row__delta--up   { color: var(--color-up); }

.table-row__weight {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.table-row__unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-2);
}

.table-row__edit-input {
  width: 72px;
  font-size: 16px;
  padding: 4px 8px;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-card);
  color: var(--color-text);
  outline: none;
  font-variant-numeric: tabular-nums;
}

.table-row__action {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-3);
  padding: 4px;
  line-height: 1;
}

.table-row__action--save  { color: var(--color-down); }
.table-row__action--delete { color: var(--color-up); }
.table-row__action--cancel { color: var(--color-text-3); }
</style>
