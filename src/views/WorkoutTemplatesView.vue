<template>
  <div class="wtpl">
    <div class="wtpl__header">
      <button class="wtpl__back" @click="router.push('/workout')">‹</button>
      <div>
        <div class="wtpl__supra">Fitness tracker</div>
        <h1 class="wtpl__title">Alle templates</h1>
      </div>
    </div>

    <div class="wtpl__content">
      <button class="wtpl__new" @click="showNewTemplate = true">+ Nieuwe template</button>

      <div v-if="loading" class="wtpl__muted">Laden…</div>
      <div v-else-if="templates.length === 0" class="wtpl__muted">Nog geen templates.</div>

      <ul v-else class="wtpl__list">
        <li
          v-for="t in templates"
          :key="t.id"
          class="wtpl__item"
          @click="router.push(`/workout/templates/${t.id}`)"
        >
          <div class="wtpl__item-info">
            <span class="wtpl__item-name">{{ t.name }}</span>
            <span class="wtpl__item-sub">
              {{ t.exercise_count }} {{ t.exercise_count === 1 ? 'oefening' : 'oefeningen' }}
            </span>
          </div>
          <span class="wtpl__item-chevron">›</span>
        </li>
      </ul>
    </div>

    <BaseModal v-if="showNewTemplate" title="Nieuwe template" @close="showNewTemplate = false">
      <input
        v-model="newTemplateName"
        class="wtpl__modal-input"
        type="text"
        placeholder="Naam template (bijv. Push A)"
        @keydown.enter="handleCreateTemplate"
      >
      <template #footer>
        <button class="wtpl__modal-btn wtpl__modal-btn--cancel" @click="showNewTemplate = false">
          Annuleren
        </button>
        <button
          class="wtpl__modal-btn wtpl__modal-btn--primary"
          :disabled="!newTemplateName.trim()"
          @click="handleCreateTemplate"
        >
          Aanmaken
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import { useWorkoutTemplates } from '@/composables/useWorkoutTemplates'

const router = useRouter()
const { templates, loading, fetchTemplates, createTemplate } = useWorkoutTemplates()

const showNewTemplate = ref(false)
const newTemplateName = ref('')

onMounted(() => fetchTemplates())

async function handleCreateTemplate() {
  if (!newTemplateName.value.trim()) return
  const created = await createTemplate(newTemplateName.value.trim())
  if (created) {
    showNewTemplate.value = false
    newTemplateName.value = ''
    router.push(`/workout/templates/${created.id}/edit`)
  }
}
</script>

<style scoped>
.wtpl {
  min-height: 100dvh;
  background: var(--color-bg);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

.wtpl__header {
  padding: 56px 20px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.wtpl__back {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0 4px 0 0;
  line-height: 1;
  margin-top: 16px;
}

.wtpl__supra {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-2);
}

.wtpl__title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 0;
  color: var(--color-text);
}

.wtpl__content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wtpl__new {
  width: 100%;
  padding: 14px;
  background: var(--color-card);
  border: 2px dashed var(--color-hairline);
  border-radius: var(--radius-card);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font);
  box-shadow: var(--shadow-card);
}

.wtpl__muted {
  padding: 40px 20px;
  text-align: center;
  font-size: 15px;
  color: var(--color-text-2);
}

.wtpl__list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.wtpl__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-hairline);
  cursor: pointer;
}

.wtpl__item:last-child {
  border-bottom: none;
}

.wtpl__item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.wtpl__item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.wtpl__item-sub {
  font-size: 13px;
  color: var(--color-text-2);
}

.wtpl__item-chevron {
  font-size: 22px;
  color: var(--color-text-3);
  line-height: 1;
  flex-shrink: 0;
}

.wtpl__modal-input {
  width: 100%;
  height: 44px;
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  background: var(--color-card-2);
  padding: 0 12px;
  font-size: 15px;
  font-family: var(--font);
  color: var(--color-text);
  box-sizing: border-box;
}

.wtpl__modal-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font);
}

.wtpl__modal-btn--cancel {
  background: var(--color-chip);
  color: var(--color-text);
}

.wtpl__modal-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.wtpl__modal-btn--primary:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
