<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type CompressResult = {
  blob: Blob
  url: string
  width: number
  height: number
}

const sourceFile = ref<File | null>(null)
const sourceImageUrl = ref<string>('')
const sourceWidth = ref<number>(0)
const sourceHeight = ref<number>(0)

const qualityPercent = ref<number>(80)
const targetWidth = ref<number>(0)
const targetHeight = ref<number>(0)

const result = ref<CompressResult | null>(null)
const isCompressing = ref<boolean>(false)
const errorMessage = ref<string>('')

const quality = computed(() => Math.min(1, Math.max(0.1, qualityPercent.value / 100)))

const sourceSizeText = computed(() => formatBytes(sourceFile.value?.size ?? 0))
const resultSizeText = computed(() => formatBytes(result.value?.blob.size ?? 0))
const ratioText = computed(() => {
  if (!sourceFile.value || !result.value) return '-'
  const ratio = (result.value.blob.size / sourceFile.value.size) * 100
  return `${ratio.toFixed(1)}%`
})

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let current = bytes
  let index = 0
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }
  return `${current.toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

function revokeUrl(url: string): void {
  if (url) URL.revokeObjectURL(url)
}

async function getImageSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)

  try {
    const image = await loadImage(url)
    return { width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    revokeUrl(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败，请更换图片重试。'))
    image.src = src
  })
}

function cleanupResult(): void {
  if (result.value?.url) {
    revokeUrl(result.value.url)
  }
  result.value = null
}

async function handleFileChange(event: Event): Promise<void> {
  errorMessage.value = ''
  cleanupResult()

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorMessage.value = '请选择图片文件。'
    input.value = ''
    return
  }

  sourceFile.value = file

  if (sourceImageUrl.value) {
    revokeUrl(sourceImageUrl.value)
  }
  sourceImageUrl.value = URL.createObjectURL(file)

  try {
    const size = await getImageSize(file)
    sourceWidth.value = size.width
    sourceHeight.value = size.height
    targetWidth.value = size.width
    targetHeight.value = size.height
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取图片尺寸失败。'
  }
}

async function compressToWebp(): Promise<void> {
  errorMessage.value = ''
  cleanupResult()

  if (!sourceFile.value) {
    errorMessage.value = '请先上传一张图片。'
    return
  }

  const outputWidth = Math.max(1, Math.floor(targetWidth.value || sourceWidth.value))
  const outputHeight = Math.max(1, Math.floor(targetHeight.value || sourceHeight.value))

  isCompressing.value = true
  try {
    const sourceUrl = URL.createObjectURL(sourceFile.value)
    const image = await loadImage(sourceUrl)
    revokeUrl(sourceUrl)

    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('浏览器不支持 Canvas 压缩。')
    }

    context.drawImage(image, 0, 0, outputWidth, outputHeight)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (generatedBlob) => {
          if (!generatedBlob) {
            reject(new Error('WebP 编码失败，请尝试调整参数后重试。'))
            return
          }
          resolve(generatedBlob)
        },
        'image/webp',
        quality.value,
      )
    })

    const url = URL.createObjectURL(blob)
    result.value = {
      blob,
      url,
      width: outputWidth,
      height: outputHeight,
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '压缩失败，请重试。'
  } finally {
    isCompressing.value = false
  }
}

function downloadWebp(): void {
  if (!result.value || !sourceFile.value) return

  const filenameWithoutExt = sourceFile.value.name.replace(/\.[^.]+$/, '')
  const anchor = document.createElement('a')
  anchor.href = result.value.url
  anchor.download = `${filenameWithoutExt || 'compressed'}.webp`
  anchor.click()
}

onBeforeUnmount(() => {
  if (sourceImageUrl.value) {
    revokeUrl(sourceImageUrl.value)
  }
  if (result.value?.url) {
    revokeUrl(result.value.url)
  }
})
</script>

<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <UPage>
      <UPageHeader
        title="图片压缩为 WebP"
        description="上传图片后可自定义质量与分辨率，再一键压缩并下载 WebP 文件。"
      />

      <UPageBody>
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- 参数设置卡片 -->
          <UCard>
            <div class="space-y-4">
              <!-- 文件选择 -->
              <div>
                <label class="mb-2 block text-sm font-medium">选择图片</label>
                <UInput type="file" accept="image/*" @change="handleFileChange" />
              </div>

              <!-- 质量滑块 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <label class="text-sm font-medium">质量</label>
                  <span class="text-sm font-semibold text-primary">{{ qualityPercent }}%</span>
                </div>
                <USlider
                  v-model="qualityPercent"
                  :min="10"
                  :max="100"
                  :step="1"
                  :tooltip="{ disableClosingTrigger: true }"
                />
              </div>

              <!-- 输出尺寸 -->
              <div>
                <label class="mb-2 block text-sm font-medium">输出尺寸</label>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-xs text-muted">宽度 (px)</label>
                    <UInputNumber v-model="targetWidth" :min="1" placeholder="宽度" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-muted">高度 (px)</label>
                    <UInputNumber v-model="targetHeight" :min="1" placeholder="高度" />
                  </div>
                </div>
              </div>

              <!-- 原始信息 -->
              <UCard variant="soft">
                <div class="space-y-1 text-sm">
                  <p class="text-muted">
                    原始尺寸：<span class="font-semibold"
                      >{{ sourceWidth || '-' }} × {{ sourceHeight || '-' }}</span
                    >
                  </p>
                  <p class="text-muted">
                    原始大小：<span class="font-semibold">{{ sourceSizeText }}</span>
                  </p>
                </div>
              </UCard>

              <!-- 操作按钮 -->
              <div class="flex flex-wrap gap-3">
                <UButton
                  :disabled="!sourceFile || isCompressing"
                  :loading="isCompressing"
                  @click="compressToWebp"
                >
                  {{ isCompressing ? '压缩中...' : '开始压缩' }}
                </UButton>
                <UButton
                  color="neutral"
                  variant="outline"
                  :disabled="!result"
                  @click="downloadWebp"
                >
                  下载 WebP
                </UButton>
              </div>

              <!-- 错误提示 -->
              <UAlert
                v-if="errorMessage"
                color="error"
                variant="soft"
                :description="errorMessage"
              />
            </div>
          </UCard>

          <!-- 预览与结果卡片 -->
          <UCard>
            <div class="space-y-4">
              <!-- 图片预览 -->
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <p class="mb-2 text-sm font-medium">原图</p>
                  <div
                    class="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-default bg-muted/20"
                  >
                    <img
                      v-if="sourceImageUrl"
                      :src="sourceImageUrl"
                      alt="原图预览"
                      class="h-full w-full object-contain"
                    />
                    <span v-else class="text-sm text-muted">未上传</span>
                  </div>
                </div>

                <div>
                  <p class="mb-2 text-sm font-medium">WebP</p>
                  <div
                    class="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-default bg-muted/20"
                  >
                    <img
                      v-if="result?.url"
                      :src="result.url"
                      alt="压缩结果预览"
                      class="h-full w-full object-contain"
                    />
                    <span v-else class="text-sm text-muted">未生成</span>
                  </div>
                </div>
              </div>

              <!-- 输出信息 -->
              <UCard variant="soft">
                <div class="space-y-1 text-sm">
                  <p class="text-muted">
                    输出尺寸：<span class="font-semibold"
                      >{{ result?.width || '-' }} × {{ result?.height || '-' }}</span
                    >
                  </p>
                  <p class="text-muted">
                    输出大小：<span class="font-semibold">{{ resultSizeText }}</span>
                  </p>
                  <p class="text-muted">
                    体积占比：<span class="font-semibold">{{ ratioText }}</span>
                  </p>
                </div>
              </UCard>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>
  </section>
</template>
