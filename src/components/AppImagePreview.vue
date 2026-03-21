<script setup lang="ts">
import { useImagePreview } from '@/composables/useImagePreview'
import { useTemplateRef } from 'vue'

const overlayRef = useTemplateRef('overlayRef')

const {
  preview,
  scale,
  imgStyle,
  onImageLoad,
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
  onKeydown,
} = useImagePreview(overlayRef)

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
            class="max-w-none"
            draggable="false"
            referrerpolicy="no-referrer"
            :src="preview.url"
            :style="imgStyle"
            @load="onImageLoad"
            @mousedown="onMousedown"
          />
        </div>

        <!-- 底部悬浮提示 -->
        <div
          class="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl bg-default/75 px-3 py-1.5 text-xs text-muted backdrop-blur lg:flex"
        >
          <span class="inline-flex items-center gap-1">
            <div
              class="inline-flex h-5 items-center justify-center rounded-sm bg-default px-1 text-toned ring ring-accented ring-inset"
            >
              <UIcon name="i-lucide-mouse" />
            </div>
            缩放 / 移动
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="W" />
            <UKbd class="text-toned" value="A" />
            <UKbd class="text-toned" value="S" />
            <UKbd class="text-toned" value="D" />
            / <UKbd class="text-toned" value="arrowup" />
            <UKbd class="text-toned" value="arrowdown" />
            <UKbd class="text-toned" value="arrowleft" />
            <UKbd class="text-toned" value="arrowright" />
            平移
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="shift" /> + 方向键 / WASD 加速平移
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="Q" /> / <UKbd class="text-toned" value="E" />
            缓慢旋转
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="shift" /> + <UKbd class="text-toned" value="Q" /> /
            <UKbd class="text-toned" value="E" />
            加速旋转
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="-" />
            / <UKbd class="text-toned" value="=" />
            缩放
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="R" />
            旋转
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="O" />
            新标签页打开
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="0" />
            重置视图
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="meta" /> + <UKbd class="text-toned" value="S" />
            下载
          </span>
          <span class="inline-flex items-center gap-1">
            <UKbd class="text-toned" value="esc" />
            关闭
          </span>
          <span class="inline-flex items-center gap-1 text-warning"
            >提示：快捷键请在英文输入状态下使用</span
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
