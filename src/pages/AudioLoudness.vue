<script setup lang="ts">
import * as ebur128 from 'ebur128-wasm';
import { computed, ref } from 'vue';

const tabItems = [
  { label: '人声', icon: 'i-lucide-mic', value: 'vocal', default: -16 },
  { label: '背景音乐', icon: 'i-lucide-music', value: 'bgm', default: -28 },
  { label: '自定义', icon: 'i-lucide-settings-2', value: 'custom', default: undefined },
];

const hasResult = ref<boolean>(false);
const isAnalyzing = ref<boolean>(false);
const statusText = ref<string | null>(null);
const integratedLoudness = ref<number>(0);
const truePeak = ref<number>(0);
const error = ref<string | null>(null);
const file = ref<File | null>(null);

const targetLoudness = ref(-16);

const selectedPreset = ref('vocal');

function onPresetChange(newValue: string | number) {
  const preset = tabItems.find((item) => item.value === newValue);
  if (preset && preset.default !== undefined) {
    targetLoudness.value = preset.default;
  }
}

const suggestedGain = computed(() => targetLoudness.value - integratedLoudness.value);

async function analyzeAudio(file: File) {
  hasResult.value = false;
  isAnalyzing.value = true;
  statusText.value = '准备分析...';
  integratedLoudness.value = 0;
  truePeak.value = 0;
  error.value = null;

  // 1. 获取 AudioContext
  const audioContext = new window.AudioContext();

  try {
    // 2. 解码音频
    statusText.value = '正在解析音频数据...';
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    // 4. 调用 WASM 函数
    statusText.value = '正在计算整体响度 (LUFS)...';
    if (channels === 1) {
      const data = audioBuffer.getChannelData(0);
      integratedLoudness.value = ebur128.ebur128_integrated_mono(sampleRate, data);
      statusText.value = '正在计算真峰值 (dBTP)...';
      truePeak.value = ebur128.ebur128_true_peak_mono(sampleRate, data);
    } else if (channels === 2) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      integratedLoudness.value = ebur128.ebur128_integrated_stereo(sampleRate, left, right);
      statusText.value = '正在计算真峰值 (dBTP)...';
      truePeak.value = ebur128.ebur128_true_peak_stereo(sampleRate, left, right);
    } else {
      throw new Error(`暂不支持 ${channels} 通道音频，仅支持单声道或立体声。`);
    }

    statusText.value = '分析完成';
    hasResult.value = true;
  } catch (err) {
    console.error('Audio analysis failed: ', err);
    error.value = err instanceof Error ? err.message : '音频分析失败，请检查文件格式。';
  } finally {
    await audioContext.close();
    isAnalyzing.value = false;
  }
}

function watchFile(newFile: File | null | undefined) {
  if (newFile) {
    analyzeAudio(newFile);
  } else {
    hasResult.value = false;
    statusText.value = null;
    integratedLoudness.value = 0;
    truePeak.value = 0;
    error.value = null;
  }
}
</script>

<template>
  <UContainer class="py-10">
    <UPageHeader description="基于 EBU R128 标准计算音频的整体响度和真峰值" title="音频响度测量" />

    <UPageBody>
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <!-- 左侧配置与上传 -->
        <div class="space-y-6 lg:col-span-1">
          <UCard>
            <div class="space-y-4">
              <UTabs
                v-model="selectedPreset"
                :content="false"
                :items="tabItems"
                @update:model-value="onPresetChange"
              />
              <UFormField label="目标响度 (LUFS)">
                <UInputNumber
                  v-model="targetLoudness"
                  :disabled="selectedPreset !== 'custom'"
                  :step="0.1"
                />
              </UFormField>
            </div>
          </UCard>

          <UFileUpload
            v-model="file"
            accept="audio/*"
            class="w-full"
            description="音频处理在浏览器本地进行，文件不会被上传到服务器。"
            icon="i-lucide-music"
            label="选择音频文件"
            layout="list"
            @update:model-value="watchFile"
          />

          <div v-if="isAnalyzing" class="space-y-2">
            <div class="flex items-center gap-1 text-xs">
              <UIcon class="animate-spin" name="i-lucide-loader-2" />
              <span>{{ statusText }}</span>
            </div>
            <UProgress color="primary" />
          </div>

          <UAlert
            v-if="error"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
            title="分析失败"
            variant="soft"
          />
        </div>

        <!-- 右侧结果展示 -->
        <div>
          <UCard v-if="hasResult" class="h-full">
            <div class="space-y-10">
              <div class="border-l-2 border-muted pl-3">
                <p class="mb-1 text-xs font-semibold text-muted">整体响度 (Integrated)</p>
                <p
                  class="space-x-2 font-mono"
                  :class="integratedLoudness > targetLoudness ? 'text-warning' : 'text-success'"
                >
                  <span class="text-3xl font-bold">{{ integratedLoudness.toFixed(2) }}</span
                  ><span class="text-lg font-normal">LUFS</span>
                </p>
              </div>

              <div class="border-l-2 border-muted pl-3">
                <p class="mb-1 text-xs font-semibold text-muted">建议增益 (Gain)</p>
                <p class="space-x-2 font-mono text-primary">
                  <span class="text-3xl font-bold"
                    >{{ suggestedGain > 0 ? '+' : '' }}{{ suggestedGain.toFixed(2) }}</span
                  ><span class="text-lg font-normal">dB</span>
                </p>
                <p class="mt-1 text-xs text-muted">目标值: {{ targetLoudness.toFixed(2) }} LUFS</p>
              </div>

              <div class="border-l-2 border-muted pl-3">
                <p class="mb-1 text-xs font-semibold text-muted">真峰值 (True Peak)</p>
                <p
                  class="space-x-2 font-mono"
                  :class="truePeak > -1.0 ? 'text-error' : 'text-success'"
                >
                  <span class="text-3xl font-bold">{{ truePeak.toFixed(2) }}</span
                  ><span class="text-lg font-normal">dBTP</span>
                </p>
              </div>
            </div>
          </UCard>

          <UCard v-else class="flex h-full items-center justify-center border-dashed text-center">
            <div class="py-12">
              <UIcon class="mx-auto mb-4 h-16 w-16 text-gray-300" name="i-lucide-bar-chart-3" />
              <p>暂无分析数据，请先上传音频文件</p>
            </div>
          </UCard>
        </div>
      </div>
    </UPageBody>
  </UContainer>
</template>
