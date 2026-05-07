<script setup lang="ts">
import { useClipboard } from '@vueuse/core';

const props = defineProps<{
  uuid: string;
}>();

const { copy, copied } = useClipboard();
</script>

<template>
  <div class="flex items-center gap-2">
    <UInput class="flex-1 font-mono" :model-value="props.uuid" readonly />
    <UButton
      :color="copied ? 'success' : 'neutral'"
      :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
      variant="ghost"
      @click="copy(props.uuid)"
    />
  </div>
</template>
