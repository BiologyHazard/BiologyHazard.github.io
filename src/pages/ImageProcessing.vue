<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type ImageResult = {
  blob: Blob
  url: string
  width: number
  height: number
}

type ImageItem = {
  id: string
  file: File
  sourceUrl: string
  sourceWidth: number
  sourceHeight: number
  result: ImageResult | null
  error: string
}

const imageItems = ref<ImageItem[]>([])

const qualityPercent = ref<number>(80)
const targetWidth = ref<number>(0)
const targetHeight = ref<number>(0)

const isCompressing = ref<boolean>(false)
const errorMessage = ref<string>('')
const progressText = ref<string>('')

const quality = computed(() => Math.min(1, Math.max(0.1, qualityPercent.value / 100)))

const totalSourceSizeText = computed(() => {
  const total = imageItems.value.reduce((sum, item) => sum + item.file.size, 0)
  return formatBytes(total)
})
const totalResultSizeText = computed(() => {
  const total = imageItems.value.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0)
  return formatBytes(total)
})
const totalRatioText = computed(() => {
  const sourceTotal = imageItems.value.reduce((sum, item) => sum + item.file.size, 0)
  const resultTotal = imageItems.value.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0)
  if (!sourceTotal || !resultTotal) return '-'
  return `${((resultTotal / sourceTotal) * 100).toFixed(1)}%`
})
const processedCount = computed(() => imageItems.value.filter((item) => item.result).length)
const validImageCount = computed(() => imageItems.value.length)

function getItemRatio(item: ImageItem): string {
  if (!item.result) return '-'
  return `${((item.result.blob.size / item.file.size) * 100).toFixed(1)}%`
}

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

function clearAllItems(): void {
  for (const item of imageItems.value) {
    revokeUrl(item.sourceUrl)
    if (item.result?.url) {
      revokeUrl(item.result.url)
    }
  }
  imageItems.value = []
}

async function handleFileUpdate(files: File[] | null | undefined): Promise<void> {
  errorMessage.value = ''
  progressText.value = ''
  clearAllItems()

  const fileList = files ?? []
  if (!fileList.length) return

  const invalidCount = fileList.filter((file) => !file.type.startsWith('image/')).length
  if (invalidCount === fileList.length) {
    errorMessage.value = '请选择图片文件。'
    return
  }

  if (invalidCount > 0) {
    errorMessage.value = `已忽略 ${invalidCount} 个非图片文件。`
  }

  const validFiles = fileList.filter((file) => file.type.startsWith('image/'))
  const items: ImageItem[] = []

  for (const file of validFiles) {
    const sourceUrl = URL.createObjectURL(file)
    try {
      const size = await getImageSize(file)
      items.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        sourceUrl,
        sourceWidth: size.width,
        sourceHeight: size.height,
        result: null,
        error: '',
      })
    } catch (error) {
      revokeUrl(sourceUrl)
      const message = error instanceof Error ? error.message : '读取图片尺寸失败。'
      errorMessage.value = message
    }
  }

  imageItems.value = items
}

async function compressItem(item: ImageItem): Promise<void> {
  const outputWidth = Math.max(1, Math.floor(targetWidth.value || item.sourceWidth))
  const outputHeight = Math.max(1, Math.floor(targetHeight.value || item.sourceHeight))

  const image = await loadImage(item.sourceUrl)
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

  if (item.result?.url) {
    revokeUrl(item.result.url)
  }
  item.result = {
    blob,
    url: URL.createObjectURL(blob),
    width: outputWidth,
    height: outputHeight,
  }
}

async function compressToWebp(): Promise<void> {
  errorMessage.value = ''
  progressText.value = ''

  if (!imageItems.value.length) {
    errorMessage.value = '请先上传至少一张图片。'
    return
  }

  isCompressing.value = true
  try {
    let index = 0
    for (const item of imageItems.value) {
      item.error = ''
      progressText.value = `正在处理 ${index + 1}/${imageItems.value.length}：${item.file.name}`
      try {
        await compressItem(item)
      } catch (error) {
        item.error = error instanceof Error ? error.message : '压缩失败，请重试。'
      }
      index += 1
    }
    progressText.value = `处理完成：${processedCount.value}/${imageItems.value.length}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '压缩失败，请重试。'
  } finally {
    isCompressing.value = false
  }
}

function downloadWebp(item: ImageItem): void {
  if (!item.result) return

  const filenameWithoutExt = item.file.name.replace(/\.[^.]+$/, '')
  const anchor = document.createElement('a')
  anchor.href = item.result.url
  anchor.download = `${filenameWithoutExt || 'compressed'}.webp`
  anchor.click()
}

onBeforeUnmount(() => {
  clearAllItems()
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
              <UFormField label="选择图片">
                <UFileUpload
                  multiple
                  highlight
                  layout="list"
                  accept="image/*"
                  icon="i-lucide-image"
                  label="拖拽图片到此处，或点击选择"
                  class="min-h-36 w-full"
                  description="支持 SVG、PNG、JPG、GIF、WebP 等图片格式"
                  @update:model-value="handleFileUpdate"
                />
              </UFormField>

              <!-- 质量滑块 -->
              <UFormField label="质量">
                <template #hint>
                  <span class="text-sm font-semibold text-primary">{{ qualityPercent }}</span>
                </template>
                <USlider v-model="qualityPercent" :min="0" :step="1" :max="100" />
              </UFormField>

              <!-- 输出尺寸 -->
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="宽度（px）">
                  <UInputNumber v-model="targetWidth" :min="1" />
                </UFormField>
                <UFormField label="高度（px）">
                  <UInputNumber v-model="targetHeight" :min="1" />
                </UFormField>
              </div>

              <!-- 原始信息 -->
              <UCard variant="soft">
                <div class="space-y-1 text-sm">
                  <p class="text-muted">
                    已选图片：<span class="font-semibold">{{ validImageCount }}</span>
                  </p>
                  <p class="text-muted">
                    原始总大小：<span class="font-semibold">{{ totalSourceSizeText }}</span>
                  </p>
                  <p v-if="progressText" class="text-muted">
                    处理进度：<span class="font-semibold">{{ progressText }}</span>
                  </p>
                </div>
              </UCard>

              <!-- 操作按钮 -->
              <div class="flex flex-wrap gap-3">
                <UButton
                  :loading="isCompressing"
                  :disabled="!imageItems.length || isCompressing"
                  @click="compressToWebp"
                >
                  {{ isCompressing ? '批量压缩中...' : '开始批量压缩' }}
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
              <div v-if="imageItems.length" class="grid gap-4 md:grid-cols-2">
                <UCard v-for="item in imageItems" :key="item.id" variant="subtle">
                  <div class="space-y-3">
                    <p class="truncate text-sm font-medium">{{ item.file.name }}</p>

                    <div class="grid gap-3 sm:grid-cols-2">
                      <div
                        class="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-default bg-muted/20"
                      >
                        <img
                          alt="原图预览"
                          :src="item.sourceUrl"
                          class="h-full w-full object-contain"
                        />
                      </div>
                      <div
                        class="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-default bg-muted/20"
                      >
                        <img
                          v-if="item.result?.url"
                          alt="压缩结果预览"
                          :src="item.result.url"
                          class="h-full w-full object-contain"
                        />
                        <span v-else class="text-sm text-muted">未生成</span>
                      </div>
                    </div>

                    <div class="space-y-1 text-sm text-muted">
                      <p>
                        原始尺寸：<span class="font-semibold"
                          >{{ item.sourceWidth }} × {{ item.sourceHeight }}</span
                        >
                      </p>
                      <p>
                        原始大小：<span class="font-semibold">{{
                          formatBytes(item.file.size)
                        }}</span>
                      </p>
                      <p>
                        输出尺寸：<span class="font-semibold"
                          >{{ item.result?.width || '-' }} × {{ item.result?.height || '-' }}</span
                        >
                      </p>
                      <p>
                        输出大小：<span class="font-semibold">{{
                          item.result ? formatBytes(item.result.blob.size) : '-'
                        }}</span>
                      </p>
                      <p>
                        体积占比：<span class="font-semibold">{{ getItemRatio(item) }}</span>
                      </p>
                    </div>

                    <UAlert
                      v-if="item.error"
                      color="error"
                      variant="soft"
                      :description="item.error"
                    />

                    <UButton
                      size="sm"
                      color="neutral"
                      variant="outline"
                      :disabled="!item.result"
                      @click="downloadWebp(item)"
                    >
                      下载该图 WebP
                    </UButton>
                  </div>
                </UCard>
              </div>

              <UAlert
                v-else
                variant="soft"
                color="neutral"
                description="请先选择一张或多张图片进行预览和压缩。"
              />

              <!-- 输出信息 -->
              <UCard variant="soft">
                <div class="space-y-1 text-sm">
                  <p class="text-muted">
                    已压缩数量：<span class="font-semibold"
                      >{{ processedCount }} / {{ validImageCount }}</span
                    >
                  </p>
                  <p class="text-muted">
                    输出总大小：<span class="font-semibold">{{ totalResultSizeText }}</span>
                  </p>
                  <p class="text-muted">
                    总体积占比：<span class="font-semibold">{{ totalRatioText }}</span>
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
