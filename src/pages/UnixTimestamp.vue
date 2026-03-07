<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNowMs } from '@/composables/useNowMs'

const { nowMs } = useNowMs(64)
const nowSecInteger = computed(() => Math.floor(nowMs.value / 1000))
const nowSecFloat = computed(() => (nowMs.value / 1000).toFixed(3))
const nowDateStr = computed(() => formatDate(new Date(nowMs.value), false))
const nowDateMsStr = computed(() => formatDate(new Date(nowMs.value), true))

// 时间戳 → 时间
const timestampInput = ref('')
const timestampResult = ref('')
const timestampError = ref('')

/**
 * 检测输入属于哪种格式：
 *   'sec'    秒（整数）  → 显示不带毫秒
 *   'secf'   秒（浮点）  → 显示带毫秒
 *   'ms'     毫秒（整数）→ 显示带毫秒
 */
function detectFormat(raw: string): 'sec' | 'secf' | 'ms' | null {
  if (raw.includes('.')) return 'secf'
  if (raw.length >= 13) return 'ms'
  if (raw.length > 0) return 'sec'
  return null
}

function convertTimestampToDate() {
  timestampError.value = ''
  timestampResult.value = ''
  const raw = timestampInput.value.trim()
  if (!raw) return
  const ts = Number(raw)
  if (!Number.isFinite(ts)) {
    timestampError.value = '无效的时间戳'
    return
  }
  const fmt = detectFormat(raw)
  let ms: number
  let includeMs: boolean
  if (fmt === 'secf') {
    ms = Math.round(ts * 1000)
    includeMs = true
  } else if (fmt === 'ms') {
    ms = ts
    includeMs = true
  } else {
    ms = ts * 1000
    includeMs = false
  }
  const date = new Date(ms)
  if (isNaN(date.getTime())) {
    timestampError.value = '无效的时间戳'
    return
  }
  timestampResult.value = formatDate(date, includeMs)
}

watch(timestampInput, convertTimestampToDate)

function useCurrentTimestamp() {
  timestampInput.value = String(nowSecInteger.value)
}

// 时间 → 时间戳
const dateInput = ref('')
const dateResultSec = ref('')
const dateResultSecFloat = ref('')
const dateResultMs = ref('')
const dateError = ref('')

function convertDateToTimestamp() {
  dateError.value = ''
  dateResultSec.value = ''
  dateResultSecFloat.value = ''
  dateResultMs.value = ''
  const raw = dateInput.value.trim()
  if (!raw) return
  // 将空格替换为 T 以兼容 'YYYY-MM-DD HH:mm:ss[.SSS]' 格式
  const date = new Date(raw.replace(' ', 'T'))
  if (isNaN(date.getTime())) {
    dateError.value =
      '无法解析日期时间，请使用标准格式，如 2024-01-01 12:00:00 或 2024-01-01 12:00:00.123'
    return
  }
  const totalMs = date.getTime()
  dateResultSec.value = String(Math.floor(totalMs / 1000))
  dateResultSecFloat.value = (totalMs / 1000).toFixed(3)
  dateResultMs.value = String(totalMs)
}

watch(dateInput, convertDateToTimestamp)

function useCurrentDatetime() {
  dateInput.value = formatDate(new Date(), true)
}

function formatDate(date: Date, includeMs = false): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const base =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return includeMs ? `${base}.${String(date.getMilliseconds()).padStart(3, '0')}` : base
}

// 复制
const copiedKey = ref('')
async function copy(text: string, key: string) {
  await navigator.clipboard.writeText(text)
  copiedKey.value = key
  setTimeout(() => {
    copiedKey.value = ''
  }, 1500)
}
</script>

<template>
  <UContainer class="max-w-2xl py-8">
    <h1 class="mb-2 text-2xl font-bold">Unix 时间戳转换</h1>

    <!-- 当前时间 -->
    <UCard class="mb-6">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="w-32 shrink-0 text-sm text-gray-500 dark:text-gray-400">秒（整数）</span>
          <span class="font-mono font-semibold tabular-nums">{{ nowSecInteger }}</span>
          <UButton
            size="xs"
            variant="ghost"
            :icon="copiedKey === 'now-sec' ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copy(String(nowSecInteger), 'now-sec')"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="w-32 shrink-0 text-sm text-gray-500 dark:text-gray-400">秒（浮点）</span>
          <span class="font-mono font-semibold tabular-nums">{{ nowSecFloat }}</span>
          <UButton
            size="xs"
            variant="ghost"
            :icon="copiedKey === 'now-secf' ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copy(nowSecFloat, 'now-secf')"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="w-32 shrink-0 text-sm text-gray-500 dark:text-gray-400">毫秒（整数）</span>
          <span class="font-mono font-semibold tabular-nums">{{ nowMs }}</span>
          <UButton
            size="xs"
            variant="ghost"
            :icon="copiedKey === 'now-ms' ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copy(String(nowMs), 'now-ms')"
          />
        </div>
        <USeparator class="my-1" />
        <div class="flex items-center gap-2">
          <span class="w-32 shrink-0 text-sm text-gray-500 dark:text-gray-400">日期时间</span>
          <span class="font-mono font-semibold tabular-nums">{{ nowDateStr }}</span>
          <UButton
            size="xs"
            variant="ghost"
            :icon="copiedKey === 'now-date' ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copy(nowDateStr, 'now-date')"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="w-32 shrink-0 text-sm text-gray-500 dark:text-gray-400">日期时间（ms）</span>
          <span class="font-mono font-semibold tabular-nums">{{ nowDateMsStr }}</span>
          <UButton
            size="xs"
            variant="ghost"
            :icon="copiedKey === 'now-date-ms' ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copy(nowDateMsStr, 'now-date-ms')"
          />
        </div>
      </div>
    </UCard>

    <!-- 时间戳 → 时间 -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="font-semibold">时间戳 → 日期时间</h2>
      </template>

      <div class="flex flex-col gap-3">
        <div class="flex gap-2">
          <UInput
            v-model="timestampInput"
            class="flex-1 font-mono"
            placeholder="输入 Unix 时间戳（秒或毫秒）"
          />
          <UButton variant="subtle" @click="useCurrentTimestamp">使用当前</UButton>
        </div>

        <UAlert v-if="timestampError" color="error" :description="timestampError" />

        <div v-if="timestampResult" class="flex items-center gap-2">
          <span class="font-mono text-base">{{ timestampResult }}</span>
          <UButton
            size="xs"
            variant="ghost"
            :icon="copiedKey === 'tsResult' ? 'i-lucide-check' : 'i-lucide-copy'"
            @click="copy(timestampResult, 'tsResult')"
          />
        </div>
      </div>
    </UCard>

    <!-- 时间 → 时间戳 -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">日期时间 → 时间戳</h2>
      </template>

      <div class="flex flex-col gap-3">
        <div class="flex gap-2">
          <UInput
            v-model="dateInput"
            class="flex-1 font-mono"
            placeholder="如：2024-01-01 12:00:00 或 2024-01-01 12:00:00.123"
          />
          <UButton variant="subtle" @click="useCurrentDatetime">使用当前</UButton>
        </div>

        <UAlert v-if="dateError" color="error" :description="dateError" />

        <div v-if="dateResultSec" class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="w-24 shrink-0 text-sm text-gray-500 dark:text-gray-400">秒（整数）</span>
            <span class="font-mono">{{ dateResultSec }}</span>
            <UButton
              size="xs"
              variant="ghost"
              :icon="copiedKey === 'sec' ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copy(dateResultSec, 'sec')"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="w-24 shrink-0 text-sm text-gray-500 dark:text-gray-400">秒（浮点）</span>
            <span class="font-mono">{{ dateResultSecFloat }}</span>
            <UButton
              size="xs"
              variant="ghost"
              :icon="copiedKey === 'secf' ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copy(dateResultSecFloat, 'secf')"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="w-24 shrink-0 text-sm text-gray-500 dark:text-gray-400">毫秒（整数）</span>
            <span class="font-mono">{{ dateResultMs }}</span>
            <UButton
              size="xs"
              variant="ghost"
              :icon="copiedKey === 'ms' ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copy(dateResultMs, 'ms')"
            />
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
