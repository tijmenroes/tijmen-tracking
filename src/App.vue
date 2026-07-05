<template>
  <RouterView />
  <PwaUpdateBanner />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import PwaUpdateBanner from '@/components/PwaUpdateBanner.vue'
import '@/composables/usePwaUpdate'
</script>
