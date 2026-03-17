<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
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
