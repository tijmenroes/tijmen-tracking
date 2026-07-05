<template>
  <div class="app-shell">
    <RouterView v-slot="{ Component, route }">
      <Transition :name="routeTransitionName">
        <component :is="Component" :key="route.fullPath" class="route-view" />
      </Transition>
    </RouterView>
  </div>
  <PwaUpdateBanner />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import PwaUpdateBanner from '@/components/PwaUpdateBanner.vue'
import { routeTransitionName } from '@/composables/useRouteTransition'
import '@/composables/usePwaUpdate'
</script>
