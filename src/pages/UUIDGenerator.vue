<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import UUIDRow from '@/components/UUIDRow.vue';

const count = ref(1);
const rawUUIDs = ref<string[]>([]);
const uppercase = ref(false);
const hyphenated = ref(true);

const formattedUUIDs = computed(() => {
  return rawUUIDs.value.map((uuid) => {
    let result = uuid;
    if (!hyphenated.value) {
      result = result.replace(/-/g, '');
    }
    if (uppercase.value) {
      result = result.toUpperCase();
    }
    return result;
  });
});

function generateUUID() {
  const newUUIDs: string[] = [];
  for (let i = 0; i < count.value; i++) {
    newUUIDs.push(crypto.randomUUID());
  }
  rawUUIDs.value = newUUIDs;
}

const { copy, copied } = useClipboard();

function copyAll() {
  copy(formattedUUIDs.value.join('\n'));
}

onMounted(() => {
  generateUUID();
});
</script>

<template>
  <UContainer class="max-w-2xl">
    <UPage>
      <UPageHeader
        description="生成通用唯一识别码 (Universally Unique Identifier)"
        title="UUID 生成器"
      />

      <UPageBody>
        <UCard>
          <div class="flex flex-col gap-4">
            <div class="flex items-end gap-2">
              <UFormField class="flex-1" label="生成数量">
                <UInputNumber v-model="count" :max="1024" :min="1" :step="1" />
              </UFormField>
              <UButton icon="i-lucide-refresh-cw" label="重新生成" @click="generateUUID" />
            </div>

            <div class="flex gap-4">
              <UCheckbox v-model="uppercase" label="大写" />
              <UCheckbox v-model="hyphenated" label="包含连字符" />
            </div>

            <UDivider />

            <div class="flex flex-col gap-2">
              <UUIDRow v-for="(item, index) in formattedUUIDs" :key="index" :uuid="item" />
            </div>

            <UButton
              block
              :color="copied ? 'success' : 'primary'"
              :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
              :label="copied ? '已复制' : '复制全部'"
              variant="soft"
              @click="copyAll"
            />
          </div>
        </UCard>
      </UPageBody>
    </UPage>
  </UContainer>
</template>
