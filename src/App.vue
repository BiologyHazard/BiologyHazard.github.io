<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <UApp>
    <AppHeader />

    <UMain>
      <RouterView />
    </UMain>

    <AppFooter />
  </UApp>
</template>

<style scoped></style>
