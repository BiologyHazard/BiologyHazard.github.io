<script setup lang="ts">
import { useClipboard, useNow } from '@vueuse/core';
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const now = useNow();
const inputValue = ref('');

function isTimestamp(raw: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(raw);
}

function detectTimestampFormat(raw: string): 'sec' | 'secf' | 'ms' {
  if (raw.includes('.')) return 'secf';
  if (raw.length >= 13) return 'ms';
  return 'sec';
}

type ParseResult = { d: dayjs.Dayjs; error: null } | { d: null; error: string };

const parseResult = computed<ParseResult>(() => {
  const raw = inputValue.value.trim();
  if (!raw) {
    return { d: dayjs(now.value), error: null };
  } else if (isTimestamp(raw)) {
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return { d: null, error: '无效的时间戳' };
    const fmt = detectTimestampFormat(raw);
    const ms = fmt === 'secf' ? Math.round(ts * 1000) : fmt === 'ms' ? ts : ts * 1000;
    const result = dayjs(ms);
    if (!result.isValid()) return { d: null, error: '无效的时间戳' };
    return { d: result, error: null };
  } else {
    const result = dayjs(raw);
    if (!result.isValid()) {
      return {
        d: null,
        error:
          '无法解析日期时间，请使用标准格式，如 2024-01-01 12:00:00 或 2024-01-01 12:00:00.123',
      };
    }
    return { d: result, error: null };
  }
});

const d = computed(() => parseResult.value.d);

const resultSecInteger = computed(() =>
  d.value !== null ? String(Math.floor(d.value.valueOf() / 1000)) : '',
);
const resultSecFloat = computed(() =>
  d.value !== null ? (d.value.valueOf() / 1000).toFixed(3) : '',
);
const resultMs = computed(() => (d.value !== null ? String(d.value.valueOf()) : ''));

const resultDateSec = computed(() =>
  d.value !== null ? d.value.format('YYYY-MM-DD HH:mm:ss') : '',
);
const resultDateMs = computed(() =>
  d.value !== null ? d.value.format('YYYY-MM-DD HH:mm:ss.SSS') : '',
);
const resultDateLocalTZ = computed(() =>
  d.value !== null ? d.value.format('YYYY-MM-DD HH:mm:ssZ') : '',
);
const resultDateLocalTZMs = computed(() =>
  d.value !== null ? d.value.format('YYYY-MM-DD HH:mm:ss.SSSZ') : '',
);
const resultDateUTC = computed(() =>
  d.value !== null ? d.value.utc().format('YYYY-MM-DD HH:mm:ss[Z]') : '',
);
const resultDateUTCMs = computed(() =>
  d.value !== null ? d.value.utc().format('YYYY-MM-DD HH:mm:ss.SSS[Z]') : '',
);

// 复制 —— 每个按钮独立状态
const COPIED_DURING = 1500;
const { copy: copySec, copied: copiedSec } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copySecf, copied: copiedSecf } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copyMs, copied: copiedMs } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copyDate, copied: copiedDate } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copyDateMs, copied: copiedDateMs } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copyLocalTZ, copied: copiedLocalTZ } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copyLocalTZMs, copied: copiedLocalTZMs } = useClipboard({
  copiedDuring: COPIED_DURING,
});
const { copy: copyUTC, copied: copiedUTC } = useClipboard({ copiedDuring: COPIED_DURING });
const { copy: copyUTCMs, copied: copiedUTCMs } = useClipboard({ copiedDuring: COPIED_DURING });
</script>

<template>
  <UContainer class="max-w-2xl">
    <UPage>
      <UPageHeader title="Unix 时间戳转换" />

      <UPageBody>
        <UCard>
          <div class="flex flex-col gap-3">
            <UFormField label="输入时间戳或日期时间">
              <UInput
                v-model="inputValue"
                class="w-full font-mono"
                placeholder="留空显示当前时间；输入时间戳（秒/毫秒）或日期时间"
              />
            </UFormField>

            <div v-if="!parseResult.error" class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">秒（整数）</span>
                <span class="font-mono tabular-nums">{{ resultSecInteger }}</span>
                <UButton
                  :color="copiedSec ? 'success' : 'neutral'"
                  :icon="copiedSec ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copySec(resultSecInteger)"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">秒（浮点）</span>
                <span class="font-mono tabular-nums">{{ resultSecFloat }}</span>
                <UButton
                  :color="copiedSecf ? 'success' : 'neutral'"
                  :icon="copiedSecf ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copySecf(resultSecFloat)"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">毫秒（整数）</span>
                <span class="font-mono tabular-nums">{{ resultMs }}</span>
                <UButton
                  :color="copiedMs ? 'success' : 'neutral'"
                  :icon="copiedMs ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyMs(resultMs)"
                />
              </div>
              <USeparator class="my-1" />
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">日期时间</span>
                <span class="font-mono tabular-nums">{{ resultDateSec }}</span>
                <UButton
                  :color="copiedDate ? 'success' : 'neutral'"
                  :icon="copiedDate ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyDate(resultDateSec)"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">日期时间（ms）</span>
                <span class="font-mono tabular-nums">{{ resultDateMs }}</span>
                <UButton
                  :color="copiedDateMs ? 'success' : 'neutral'"
                  :icon="copiedDateMs ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyDateMs(resultDateMs)"
                />
              </div>
              <USeparator class="my-1" />
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">本地（带时区）</span>
                <span class="font-mono tabular-nums">{{ resultDateLocalTZ }}</span>
                <UButton
                  :color="copiedLocalTZ ? 'success' : 'neutral'"
                  :icon="copiedLocalTZ ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyLocalTZ(resultDateLocalTZ)"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">本地（带时区 ms）</span>
                <span class="font-mono tabular-nums">{{ resultDateLocalTZMs }}</span>
                <UButton
                  :color="copiedLocalTZMs ? 'success' : 'neutral'"
                  :icon="copiedLocalTZMs ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyLocalTZMs(resultDateLocalTZMs)"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">UTC</span>
                <span class="font-mono tabular-nums">{{ resultDateUTC }}</span>
                <UButton
                  :color="copiedUTC ? 'success' : 'neutral'"
                  :icon="copiedUTC ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyUTC(resultDateUTC)"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-32 shrink-0 text-sm text-muted">UTC（ms）</span>
                <span class="font-mono tabular-nums">{{ resultDateUTCMs }}</span>
                <UButton
                  :color="copiedUTCMs ? 'success' : 'neutral'"
                  :icon="copiedUTCMs ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs"
                  variant="ghost"
                  @click="copyUTCMs(resultDateUTCMs)"
                />
              </div>
            </div>

            <UAlert v-else color="error" :description="parseResult.error" variant="subtle" />
          </div>
        </UCard>
      </UPageBody>
    </UPage>
  </UContainer>
</template>
