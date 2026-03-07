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

// nuxtApp.hooks.hookOnce('page:finish', () => {
//   updateHeadings(
//     [
//       document.querySelector('#features'),
//       document.querySelector('#pricing'),
//       document.querySelector('#testimonials'),
//     ].filter(Boolean) as Element[],
//   )
// })
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>

      <TemplateMenu />
    </template>

    <UNavigationMenu :items="items" variant="link" class="hidden lg:block" />

    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>
