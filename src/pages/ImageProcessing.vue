<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppImagePreview from '@/components/AppImagePreview.vue'
import type { PreviewTarget } from '@/composables/useImagePreview'

type ImageFormat = 'image/webp' | 'image/jpeg' | 'image/png'

type ImageResult = {
  blob: Blob
  url: string
  width: number
  height: number
  format: ImageFormat
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

const files = ref<File[]>([])
const imageItems = ref<ImageItem[]>([])

const targetFormat = ref<ImageFormat>('image/webp')
const qualityPercent = ref<number>(50)
const targetWidth = ref<number>(0)
const targetHeight = ref<number>(0)

const resizeMode = ref<'custom' | 'contain' | 'scale'>('scale')
const maxLongSide = ref<number>(1920)
const maxShortSide = ref<number>(1080)
const scaleRatio = ref<number>(1.0)

const isCompressing = ref<boolean>(false)
const errorMessage = ref<string>('')
const progressText = ref<string>('')

const outputDirHandle = ref<FileSystemDirectoryHandle | null>(null)
const isSavingToFolder = ref<boolean>(false)

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
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let current = bytes
  let index = 0
  while (index < units.length - 1 && current >= 1024) {
    current /= 1024
    index += 1
  }
  const unit = units[index]
  return `${current.toFixed(unit === 'B' ? 0 : 2)} ${unit}`
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
  let outputWidth = item.sourceWidth
  let outputHeight = item.sourceHeight

  // 计算输出尺寸
  switch (resizeMode.value) {
    // 按缩放倍率调整尺寸
    case 'scale': {
      const ratio = scaleRatio.value || 1
      outputWidth = Math.max(1, Math.round(item.sourceWidth * ratio))
      outputHeight = Math.max(1, Math.round(item.sourceHeight * ratio))
      break
    }
    // 按长短边限制调整尺寸，保持宽高比
    case 'contain': {
      const currentLong = Math.max(item.sourceWidth, item.sourceHeight)
      const currentShort = Math.min(item.sourceWidth, item.sourceHeight)

      const targetLong = maxLongSide.value || currentLong
      const targetShort = maxShortSide.value || currentShort

      const ratioLong = targetLong / currentLong
      const ratioShort = targetShort / currentShort
      const ratio = Math.min(1, ratioLong, ratioShort)

      outputWidth = Math.max(1, Math.round(item.sourceWidth * ratio))
      outputHeight = Math.max(1, Math.round(item.sourceHeight * ratio))
      break
    }
    // 自定义指定宽高
    case 'custom': {
      outputWidth = Math.max(1, Math.floor(targetWidth.value || item.sourceWidth))
      outputHeight = Math.max(1, Math.floor(targetHeight.value || item.sourceHeight))
      break
    }
  }

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
          reject(new Error(`${targetFormat.value} 编码失败，请尝试调整参数后重试。`))
          return
        }
        resolve(generatedBlob)
      },
      targetFormat.value,
      targetFormat.value === 'image/png' ? undefined : quality.value,
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
    format: targetFormat.value,
  }
}

async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<void> {
  const queue = [...tasks]
  async function worker() {
    while (queue.length) {
      await queue.shift()!()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
}

async function compressToImages(): Promise<void> {
  errorMessage.value = ''
  progressText.value = ''

  if (!imageItems.value.length) {
    errorMessage.value = '请先上传至少一张图片。'
    return
  }

  isCompressing.value = true
  let doneCount = 0
  const total = imageItems.value.length
  progressText.value = `正在处理 0/${total}…`
  try {
    await runWithConcurrencyLimit(
      imageItems.value.map((item) => async () => {
        item.error = ''
        try {
          await compressItem(item)
        } catch (error) {
          item.error = error instanceof Error ? error.message : '压缩失败，请重试。'
        }
        doneCount += 1
        progressText.value = `正在处理 ${doneCount}/${total}…`
      }),
      8,
    )
    progressText.value = `处理完成：${processedCount.value}/${total}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '压缩失败，请重试。'
  } finally {
    isCompressing.value = false
  }
}

function getExtension(mimeType: ImageFormat): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return ''
  }
}

function downloadImage(item: ImageItem): void {
  if (!item.result) return
  const filenameWithoutExt = item.file.name.replace(/\.[^.]+$/, '')
  const extension = getExtension(item.result.format)
  const anchor = document.createElement('a')
  anchor.href = item.result.url
  anchor.download = `${filenameWithoutExt || 'compressed'}.${extension}`
  anchor.click()
}

async function downloadAll(): Promise<void> {
  const readyItems = imageItems.value.filter((item) => item.result)
  for (const item of readyItems) {
    downloadImage(item)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function selectOutputDirectory(): Promise<void> {
  try {
    // File System Access API - 新API，TypeScript可能不认识
    const showDirectoryPicker = (
      window as Window &
        typeof globalThis & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
    ).showDirectoryPicker
    if (!showDirectoryPicker) {
      errorMessage.value = '您的浏览器不支持文件系统访问 API。'
      return
    }
    const dirHandle = await showDirectoryPicker()
    outputDirHandle.value = dirHandle
    errorMessage.value = ''
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // 用户取消了选择，不显示错误
      return
    }
    errorMessage.value = error instanceof Error ? error.message : '选择文件夹失败。'
  }
}

async function getAvailableFilename(
  dirHandle: FileSystemDirectoryHandle,
  baseName: string,
  extension: string,
): Promise<string> {
  const safeBase = baseName || 'image'
  let candidate = `${safeBase}.${extension}`
  let index = 1

  // Try increasing indices until we find a filename that does not exist.
  while (true) {
    try {
      // If this succeeds, the file exists and we need a new candidate name.
      await dirHandle.getFileHandle(candidate)
      candidate = `${safeBase} (${index}).${extension}`
      index += 1
    } catch (error) {
      const err = error as DOMException
      // NotFoundError means the file does not exist yet, so we can safely use this name.
      if (err && err.name === 'NotFoundError') {
        return candidate
      }
      // For other errors, rethrow so the caller can handle them.
      throw error
    }
  }
}

async function exportToFolder(): Promise<void> {
  errorMessage.value = ''
  progressText.value = ''

  await selectOutputDirectory()
  if (!outputDirHandle.value) {
    // 用户取消了选择
    return
  }

  const readyItems = imageItems.value.filter((item) => item.result)
  if (!readyItems.length) {
    errorMessage.value = '没有可导出的压缩图片。'
    return
  }

  isSavingToFolder.value = true
  let successCount = 0
  const total = readyItems.length

  try {
    const dirHandle = outputDirHandle.value
    if (!dirHandle) return

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i]
      if (!item?.result) continue
      const filenameWithoutExt = item.file.name.replace(/\.[^.]+$/, '')
      const baseName = filenameWithoutExt || 'image'
      const extension = getExtension(item.result.format)
      const filename = await getAvailableFilename(dirHandle, baseName, extension)

      progressText.value = `正在导出 ${i + 1}/${total}…`

      try {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(item.result.blob)
        await writable.close()
        successCount += 1
      } catch (error) {
        console.error(`导出 ${filename} 失败:`, error)
      }
    }
    progressText.value = `导出完成：${successCount}/${total}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '导出失败，请重试。'
  } finally {
    isSavingToFolder.value = false
  }
}

onBeforeUnmount(() => {
  clearAllItems()
})

const imagePreviewRef = ref<InstanceType<typeof AppImagePreview>>()

function openPreview(target: PreviewTarget) {
  imagePreviewRef.value?.open(target)
}
</script>

<template>
  <UContainer>
    <UPage>
      <UPageHeader
        description="上传图片后可自定义质量与分辨率，再一键压缩并下载 WebP 文件。"
        title="图片压缩为 WebP"
      />

      <UPageBody>
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- 参数设置卡片 -->
          <div>
            <div class="space-y-4">
              <UFormField label="选择图片">
                <UFileUpload
                  v-model="files"
                  accept="image/*"
                  class="min-h-36 w-full"
                  description="支持 SVG、PNG、JPG、GIF、WebP 等图片格式"
                  highlight
                  icon="i-lucide-image"
                  label="拖拽图片到此处，或点击选择"
                  layout="list"
                  multiple
                  @update:model-value="handleFileUpdate"
                />
              </UFormField>

              <UFormField label="目标格式">
                <UTabs
                  v-model="targetFormat"
                  :items="[
                    { label: 'WebP', value: 'image/webp' },
                    { label: 'JPEG', value: 'image/jpeg' },
                    { label: 'PNG', value: 'image/png' },
                  ]"
                />
              </UFormField>

              <UFormField v-show="targetFormat !== 'image/png'" label="质量">
                <template #hint>
                  <span class="text-sm font-semibold text-primary">{{ qualityPercent }}</span>
                </template>
                <USlider v-model="qualityPercent" :max="100" :min="0" :step="1" />
              </UFormField>

              <UFormField label="分辨率限制方式">
                <UTabs
                  v-model="resizeMode"
                  :items="[
                    { label: '指定宽高', value: 'custom', slot: 'custom' },
                    { label: '指定长短边', value: 'contain', slot: 'contain' },
                    { label: '指定缩放倍率', value: 'scale', slot: 'scale' },
                  ]"
                >
                  <template #custom>
                    <div class="grid grid-cols-2 gap-4">
                      <UFormField label="宽度（px）">
                        <UInputNumber v-model="targetWidth" :min="0" />
                      </UFormField>
                      <UFormField label="高度（px）">
                        <UInputNumber v-model="targetHeight" :min="0" />
                      </UFormField>
                    </div>
                  </template>

                  <template #contain>
                    <div class="grid grid-cols-2 gap-4">
                      <UFormField label="长边最大（px）">
                        <UInputNumber v-model="maxLongSide" :min="0" />
                      </UFormField>
                      <UFormField label="短边最大（px）">
                        <UInputNumber v-model="maxShortSide" :min="0" />
                      </UFormField>
                    </div>
                  </template>

                  <template #scale>
                    <div>
                      <UFormField label="缩放倍率">
                        <UInputNumber
                          v-model="scaleRatio"
                          :min="0"
                          :step="0.25"
                          :step-snapping="false"
                        />
                      </UFormField>
                    </div>
                  </template>
                </UTabs>
              </UFormField>

              <UCard variant="subtle">
                <div class="space-y-1 text-sm">
                  <p class="text-toned">
                    已选图片：<span class="font-semibold">{{ validImageCount }}</span>
                  </p>
                  <p class="text-toned">
                    原始总大小：<span class="font-semibold">{{ totalSourceSizeText }}</span>
                  </p>
                  <p v-if="progressText" class="text-toned">
                    处理进度：<span class="font-semibold">{{ progressText }}</span>
                  </p>
                </div>
              </UCard>

              <div class="flex flex-wrap gap-3">
                <UButton
                  :disabled="!imageItems.length || isCompressing"
                  :loading="isCompressing"
                  @click="compressToImages"
                >
                  {{ isCompressing ? '批量压缩中...' : '开始批量压缩' }}
                </UButton>
                <UButton
                  color="primary"
                  :disabled="!processedCount"
                  icon="i-lucide-download"
                  variant="outline"
                  @click="downloadAll"
                >
                  下载全部 ({{ processedCount }})
                </UButton>
                <UButton
                  color="success"
                  :disabled="!processedCount || isSavingToFolder"
                  icon="i-lucide-save"
                  :loading="isSavingToFolder"
                  variant="outline"
                  @click="exportToFolder"
                >
                  {{ isSavingToFolder ? '导出中...' : `导出到文件夹 (${processedCount})` }}
                </UButton>
                <UButton
                  color="error"
                  :disabled="!imageItems.length || isCompressing"
                  icon="i-lucide-trash-2"
                  variant="outline"
                  @click="
                    () => {
                      files = []
                      handleFileUpdate(files)
                    }
                  "
                >
                  清除全部
                </UButton>
              </div>

              <UAlert
                v-if="errorMessage"
                color="error"
                :description="errorMessage"
                variant="soft"
              />
            </div>
          </div>

          <!-- 预览与结果卡片 -->
          <div>
            <div class="space-y-4">
              <div v-if="imageItems.length" class="grid gap-4 md:grid-cols-2">
                <UCard
                  v-for="item in imageItems"
                  :key="item.id"
                  :ui="{ body: 'p-3 sm:p-4' }"
                  variant="subtle"
                >
                  <div class="space-y-3">
                    <p class="truncate text-sm font-medium">{{ item.file.name }}</p>

                    <div class="grid gap-3 sm:grid-cols-2">
                      <!-- 原图缩略图 -->
                      <div
                        class="group relative flex aspect-square cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-accented"
                        @click="
                          openPreview({
                            url: item.sourceUrl,
                            name: item.file.name,
                            downloadName: item.file.name,
                          })
                        "
                      >
                        <img
                          alt="原图预览"
                          class="h-full w-full object-contain transition-opacity group-hover:opacity-30"
                          :src="item.sourceUrl"
                        />
                        <div
                          class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <UIcon class="size-8 drop-shadow-md" name="i-lucide-zoom-in" />
                        </div>
                      </div>

                      <!-- 压缩结果缩略图 -->
                      <div
                        class="group relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-accented"
                        :class="item.result?.url ? 'cursor-zoom-in' : ''"
                        @click="
                          item.result?.url &&
                          openPreview({
                            url: item.result.url,
                            name: item.file.name,
                            downloadName: `${item.file.name.replace(/\.[^.]+$/, '')}.${getExtension(
                              item.result.format,
                            )}`,
                          })
                        "
                      >
                        <img
                          v-if="item.result?.url"
                          alt="压缩结果预览"
                          class="h-full w-full object-contain transition-opacity group-hover:opacity-30"
                          :src="item.result.url"
                        />
                        <span v-else class="text-sm text-toned">未生成</span>
                        <div
                          v-if="item.result?.url"
                          class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <UIcon class="size-8 drop-shadow-md" name="i-lucide-zoom-in" />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-1 text-sm text-toned">
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
                      :description="item.error"
                      variant="soft"
                    />
                  </div>
                </UCard>
              </div>

              <UAlert
                v-else
                color="neutral"
                description="请先选择一张或多张图片进行预览和压缩。"
                variant="outline"
              />

              <UCard variant="subtle">
                <div class="space-y-1 text-sm">
                  <p class="text-toned">
                    已压缩数量：<span class="font-semibold"
                      >{{ processedCount }} / {{ validImageCount }}</span
                    >
                  </p>
                  <p class="text-toned">
                    输出总大小：<span class="font-semibold">{{ totalResultSizeText }}</span>
                  </p>
                  <p class="text-toned">
                    总体积占比：<span class="font-semibold">{{ totalRatioText }}</span>
                  </p>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </UPageBody>
    </UPage>

    <AppImagePreview ref="imagePreviewRef" />
  </UContainer>
</template>
