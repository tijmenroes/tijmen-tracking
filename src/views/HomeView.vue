<template>
  <div>
    <h1>Home</h1>
    <button @click="router.push('/weight')">Weight</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
