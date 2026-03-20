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
  {
    label: '字符串转换',
    to: '/string-converter',
  },
])
</script>

<template>
  <UHeader>
    <template #left>
      <UButton to="/" class="p-1.5" color="neutral" variant="ghost">
        <img alt="Logo" src="/biohazard.svg" class="h-6 w-auto shrink-0" />
      </UButton>
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
