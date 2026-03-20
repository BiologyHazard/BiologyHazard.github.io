<script setup lang="ts">
import { watch, nextTick, useTemplateRef } from 'vue'
import { useImagePreview } from '@/composables/useImagePreview'

const {
  preview,
  scale,
  imgStyle,
  open,
  close,
  download,
  zoomIn,
  zoomOut,
  rotateClockwise,
  resetView,
  onWheel,
  onMousedown,
  onMousemove,
  onMouseup,
  onImageLoad,
  onKeydown,
} = useImagePreview()

const overlayRef = useTemplateRef('overlayRef')

watch(preview, async (value) => {
  if (value) {
    await nextTick()
    overlayRef.value?.focus()
  }
})

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="preview"
        ref="overlayRef"
        class="dark fixed inset-0 flex flex-col bg-black/92 outline-none"
        tabindex="0"
        @keydown="onKeydown"
        @mouseleave="onMouseup"
        @mousemove="onMousemove"
        @mouseup="onMouseup"
      >
        <!-- 顶部工具栏 -->
        <div class="flex shrink-0 items-center justify-between gap-4 bg-black/40 px-4 py-2">
          <p class="truncate text-sm text-toned">{{ preview.name }}</p>
          <div class="flex shrink-0 items-center gap-1">
            <UTooltip :kbds="['-']" text="缩小">
              <UButton color="neutral" icon="i-lucide-minus" variant="ghost" @click="zoomOut" />
            </UTooltip>
            <UButton
              class="min-w-16 justify-center text-sm"
              color="neutral"
              variant="ghost"
              @click="resetView"
            >
              {{ Math.round(scale * 100) }}%
            </UButton>
            <UTooltip :kbds="['=']" text="放大">
              <UButton color="neutral" icon="i-lucide-plus" variant="ghost" @click="zoomIn" />
            </UTooltip>
            <UTooltip :kbds="['R']" text="顺时针旋转 90°">
              <UButton
                color="neutral"
                icon="i-lucide-rotate-cw"
                variant="ghost"
                @click="rotateClockwise"
              />
            </UTooltip>
            <div class="mx-1 h-5 w-px bg-accented" />
            <UTooltip :kbds="['O']" text="在新标签页中打开图像">
              <UButton
                color="neutral"
                icon="i-lucide-external-link"
                rel="noopener noreferrer"
                target="_blank"
                :to="preview.url"
                variant="ghost"
              />
            </UTooltip>
            <UTooltip :kbds="['meta', 'S']" text="下载">
              <UButton color="neutral" icon="i-lucide-download" variant="ghost" @click="download" />
            </UTooltip>
            <UTooltip :kbds="['escape']" text="关闭">
              <UButton color="neutral" icon="i-lucide-x" variant="ghost" @click="close" />
            </UTooltip>
          </div>
        </div>

        <!-- 图片展示区 -->
        <div
          class="relative flex flex-1 items-center justify-center overflow-hidden select-none"
          @click.self="close"
          @wheel.prevent="onWheel"
        >
          <img
            :alt="preview.name"
            draggable="false"
            :src="preview.url"
            :style="imgStyle"
            @load="onImageLoad"
            @mousedown="onMousedown"
          />
        </div>

        <!-- 底部悬浮提示 -->
        <div
          class="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-default/70 px-3 py-1.5 text-xs text-muted backdrop-blur"
        >
          <div
            class="inline-flex h-5 items-center justify-center rounded-sm bg-default px-1 text-xs text-toned ring ring-accented ring-inset"
          >
            <UIcon name="i-lucide-mouse" />
          </div>
          缩放 / 拖动 · <UKbd class="text-toned" value="-" /> 缩小 ·
          <UKbd class="text-toned" value="=" /> 放大 ·
          <UKbd class="text-toned" value="R" /> 顺时针旋转 90° ·
          <UKbd class="text-toned" value="O" /> 新标签页打开 ·
          <UKbd class="text-toned" value="0" /> 重置视图 · <UKbd class="text-toned" value="meta" />
          <UKbd class="text-toned" value="S" /> 保存 ·
          <UKbd class="text-toned" value="escape" /> 关闭
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
