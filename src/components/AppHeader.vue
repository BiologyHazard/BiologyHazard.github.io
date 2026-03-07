<script setup lang="ts">
import { computed } from 'vue'

const items = computed(() => [
  {
    label: '首页',
    to: '/',
  },
  {
    label: '图片压缩',
    to: '/image-processing',
  },
])
</script>

<template>
  <UHeader>
    <template #left>
      <RouterLink to="/">
        <img alt="Logo" class="h-6 w-auto shrink-0" src="@/assets/images/白鸥.webp" />
      </RouterLink>
    </template>

    <UNavigationMenu :items="items" variant="link" class="hidden lg:block" />

    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>
