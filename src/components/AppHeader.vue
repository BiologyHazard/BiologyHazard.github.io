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
      <UButton class="p-1.5" color="neutral" to="/" variant="ghost">
        <img alt="Logo" class="h-6 w-auto shrink-0" src="/biohazard.svg" />
      </UButton>
    </template>

    <UNavigationMenu :items="items" variant="link" />

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" variant="pill" />
    </template>

    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>
