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
  {
    label: '时间戳转换',
    to: '/unix-timestamp',
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

    <UNavigationMenu :items="items" variant="link" />

    <template #body>
      <UNavigationMenu :items="items" variant="pill" orientation="vertical" />
    </template>

    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>
