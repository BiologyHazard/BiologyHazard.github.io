<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useImagePreview } from '@/composables/useImagePreview'

const {
  preview,
  scale,
  imgStyle,
  open,
  close,
  zoomIn,
  zoomOut,
  resetZoom,
  onWheel,
  onMousedown,
  onMousemove,
  onMouseup,
  onKeydown,
  download,
} = useImagePreview()

const overlayRef = ref<HTMLDivElement | null>(null)

watch(preview, async value => {
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
      leave-to-class="opacity-0"
      enter-from-class="opacity-0"
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
    >
      <div
        v-if="preview"
        ref="overlayRef"
        tabindex="0"
        class="fixed inset-0 z-50 flex flex-col bg-black/92 outline-none"
        @keydown="onKeydown"
        @mouseup="onMouseup"
        @mouseleave="onMouseup"
        @mousemove="onMousemove"
      >
        <!-- 顶部工具栏 -->
        <div class="flex shrink-0 items-center justify-between gap-4 bg-black/40 px-4 py-2">
          <p class="truncate text-sm text-white/70">{{ preview.name }}</p>
          <div class="flex shrink-0 items-center gap-1">
            <UTooltip text="缩小 (-)">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-zoom-out"
                class="text-white hover:bg-white/15"
                @click="zoomOut"
              />
            </UTooltip>
            <UButton
              color="neutral"
              variant="ghost"
              class="min-w-16 text-sm text-white hover:bg-white/15"
              @click="resetZoom"
            >
              {{ Math.round(scale * 100) }}%
            </UButton>
            <UTooltip text="放大 (+)">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-zoom-in"
                class="text-white hover:bg-white/15"
                @click="zoomIn"
              />
            </UTooltip>
            <div class="mx-1 h-5 w-px bg-white/20" />
            <UTooltip text="下载">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-download"
                class="text-white hover:bg-white/15"
                @click="download"
              />
            </UTooltip>
            <UTooltip text="关闭 (Esc)">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                class="text-white hover:bg-white/15"
                @click="close"
              />
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
            draggable="false"
            :style="imgStyle"
            :src="preview.url"
            :alt="preview.name"
            class="max-h-full max-w-full object-contain"
            @mousedown="onMousedown"
          />
        </div>

        <!-- 底部提示 -->
        <div class="shrink-0 py-2 text-center text-xs text-white/30">
          滚轮缩放 · 拖拽移动 · 单击百分比重置 · 点击背景或 Esc 关闭
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
