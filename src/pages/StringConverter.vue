<script setup lang="ts">
import { ref } from 'vue'
import { useClipboard } from '@vueuse/core'

const input = ref('')
const output = ref('')

const { copy, copied } = useClipboard()

function jsonEscape() {
  try {
    output.value = JSON.stringify(input.value)
  } catch (e) {
    output.value = '错误: ' + (e as Error).message
  }
}

function jsonUnescape() {
  try {
    const str = input.value.trim()
    if (str.startsWith('"') && str.endsWith('"')) {
      output.value = JSON.parse(str)
    } else {
      output.value = JSON.parse(`"${str}"`)
    }
  } catch (e) {
    output.value = '错误: ' + (e as Error).message
  }
}

function urlEncode() {
  output.value = encodeURIComponent(input.value)
}

function urlDecode() {
  try {
    output.value = decodeURIComponent(input.value)
  } catch (e) {
    output.value = '错误: ' + (e as Error).message
  }
}

function clear() {
  input.value = ''
  output.value = ''
}

function copyOutput() {
  copy(output.value)
}

function swap() {
  input.value = output.value
  output.value = ''
}
</script>

<template>
  <UContainer class="max-w-2xl">
    <UPage>
      <UPageHeader title="字符串转义工具" description="支持 JSON 字符串转义和 URL 编码/解码" />

      <UPageBody>
        <div class="space-y-6">
          <UFormField label="输入">
            <UTextarea
              v-model="input"
              :rows="6"
              size="lg"
              autoresize
              placeholder="在此输入内容..."
              class="w-full font-mono"
            />
          </UFormField>

          <div class="flex flex-wrap items-center gap-4">
            <UFieldGroup orientation="horizontal">
              <UButton color="neutral" label="JSON 转义" variant="subtle" @click="jsonEscape" />
              <UButton color="neutral" label="JSON 反转义" variant="subtle" @click="jsonUnescape" />
            </UFieldGroup>

            <UFieldGroup orientation="horizontal">
              <UButton label="URL 编码" color="neutral" variant="subtle" @click="urlEncode" />
              <UButton label="URL 解码" color="neutral" variant="subtle" @click="urlDecode" />
            </UFieldGroup>

            <div class="grow" />

            <div class="flex gap-2">
              <UButton
                label="上下调换"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrows-up-down"
                @click="swap"
              />
              <UButton
                label="清空"
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="clear"
              />
            </div>
          </div>

          <UFormField>
            <template #label>
              <div class="flex w-full items-center justify-between">
                <span>输出</span>
                <UButton
                  size="xs"
                  variant="link"
                  color="primary"
                  :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  @click="copyOutput"
                />
              </div>
            </template>
            <UTextarea
              v-model="output"
              readonly
              :rows="6"
              size="lg"
              autoresize
              class="w-full font-mono"
              placeholder="转换结果将显示在这里..."
            />
          </UFormField>

          <UAlert title="功能提示" color="primary" variant="subtle" icon="i-lucide-info">
            <template #description>
              <ul class="list-inside list-disc space-y-1">
                <li>
                  JSON 转义：将字符串转为 JSON 安全格式（如双引号变 <code>\"</code>，换行变
                  <code>\n</code>），并自动添加外层双引号。
                </li>
                <li>JSON 反转义：尝试将 JSON 转义格式还原为普通字符串。</li>
                <li>URL 编码：使用 <code>encodeURIComponent</code> 处理。</li>
                <li>URL 解码：使用 <code>decodeURIComponent</code> 处理。</li>
              </ul>
            </template>
          </UAlert>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>
