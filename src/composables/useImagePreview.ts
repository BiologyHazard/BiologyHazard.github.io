import type { CSSProperties, Ref } from 'vue'

import { useDevicePixelRatio, useMagicKeys } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'

import { useAnimateWhenever } from '@/composables/useAnimateWhenever'
import { useImagePreviewScale } from '@/composables/useImagePreviewScale'

export type Point2D = {
  x: number
  y: number
}

export type PreviewTarget = {
  url: string
  name: string
  downloadName: string
}

export function useImagePreview(overlayRef: Ref<HTMLElement | null>) {
  const {
    clampScale,
    getNextScale,
    getPrevScale,
    getNextScaleWithMultiplier,
    getPrevScaleWithMultiplier,
  } = useImagePreviewScale()

  /** 缩放大于等于此阈值时，让图片使用最近邻居采样 */
  const PIXELATED_SCALE_THRESHOLD = 4
  /** 平移速度，单位为像素/秒 */
  const PAN_SPEED = 1600
  /** 按住 Shift 键时的平移速度倍数 */
  const PAN_FAST_MULTIPLIER = 4
  /** 旋转速度，单位为度/秒 */
  const ROTATE_SPEED = 90
  /** 按住 Shift 键时的旋转速度倍数 */
  const ROTATE_FAST_MULTIPLIER = 2

  /** 当前预览图像 */
  const preview = ref<PreviewTarget | null>(null)
  /** 图像平移量，单位为 CSS 像素 */
  const offset = ref<Point2D>({ x: 0, y: 0 })
  /** 图像旋转角度，单位为度 */
  const rotation = ref<number>(0)
  /** 图像缩放倍数，100% 缩放定义为 1 图像像素 = 1 屏幕像素，注意不是 CSS 像素 */
  const scale = ref<number>(1)
  /** 图像的初始缩放倍数（依据容器自动计算） */
  const initialScale = ref<number>(1)

  /** 设备像素比，即 1 CSS 像素与 1 屏幕像素的比值 */
  const pixelRatio = useDevicePixelRatio().pixelRatio

  /** 是否正在自动适应图像 */
  const isAutoFitting = ref<boolean>(false)
  /** 上一个动画帧的时间戳，需要不断更新 */
  const animateLastTimestamp = ref<number | null>(null)
  /** 是否正在拖动 */
  const isDragging = ref<boolean>(false)
  /** 拖动起始位置 */
  const dragStart = ref<Point2D>({ x: 0, y: 0 })
  /** 拖动起始时的平移量 */
  const offsetStart = ref<Point2D>({ x: 0, y: 0 })

  const {
    shift: keyShift,
    w: keyW,
    a: keyA,
    s: keyS,
    d: keyD,
    arrowup: keyArrowUp,
    arrowdown: keyArrowDown,
    arrowleft: keyArrowLeft,
    arrowright: keyArrowRight,
    q: keyQ,
    e: keyE,
  } = useMagicKeys()

  /** 是否应该执行平移动画 */
  const shouldPan = computed(() => {
    if (!preview.value) return false
    const { x, y } = getPanDirection()
    return x !== 0 || y !== 0
  })

  /** 是否应该执行旋转动画 */
  const shouldRotate = computed(() => {
    if (!preview.value) return false
    return getRotateDirection() !== 0
  })

  /** 获取平移方向，x 和 y 的值分别表示水平方向和垂直方向，-1 表示向左或向上，1 表示向右或向下，0 表示不移动 */
  function getPanDirection(): { x: number; y: number } {
    return {
      x: Number(keyA?.value || keyArrowLeft?.value) - Number(keyD?.value || keyArrowRight?.value),
      y: Number(keyW?.value || keyArrowUp?.value) - Number(keyS?.value || keyArrowDown?.value),
    }
  }

  /** 获取旋转方向，-1 表示逆时针，1 表示顺时针，0 表示不旋转 */
  function getRotateDirection(): number {
    return Number(keyQ?.value) - Number(keyE?.value)
  }

  /** 执行动画步骤 */
  function animateStep(timestamp: number): void {
    if (animateLastTimestamp.value === null) {
      animateLastTimestamp.value = timestamp
    }

    const deltaSeconds = (timestamp - animateLastTimestamp.value) / 1000
    animateLastTimestamp.value = timestamp

    const panDirection = getPanDirection()
    const rotateDirection = getRotateDirection()

    if (panDirection.x || panDirection.y) {
      const magnitude = Math.hypot(panDirection.x, panDirection.y) || 1
      const unitX = panDirection.x / magnitude
      const unitY = panDirection.y / magnitude

      offset.value = {
        x:
          offset.value.x +
          unitX * PAN_SPEED * (keyShift?.value ? PAN_FAST_MULTIPLIER : 1) * deltaSeconds,
        y:
          offset.value.y +
          unitY * PAN_SPEED * (keyShift?.value ? PAN_FAST_MULTIPLIER : 1) * deltaSeconds,
      }
    }

    if (rotateDirection) {
      rotation.value +=
        rotateDirection *
        ROTATE_SPEED *
        (keyShift?.value ? ROTATE_FAST_MULTIPLIER : 1) *
        deltaSeconds
    }
  }

  /** 根据容器尺寸自动适应图像缩放 */
  function fitScaleToContainer(container: HTMLElement, image: HTMLImageElement): void {
    const naturalWidth = image.naturalWidth
    const naturalHeight = image.naturalHeight

    if (!naturalWidth || !naturalHeight) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    if (!containerWidth || !containerHeight) return

    const fitScale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight)
    const defaultScale = Math.min(fitScale * pixelRatio.value, 1)
    const normalizedScale = clampScale(defaultScale)

    initialScale.value = normalizedScale
    scale.value = normalizedScale
    offset.value = { x: 0, y: 0 }
  }

  /** 图像加载完成时的回调，根据图像尺寸自动适应屏幕 */
  function onImageLoad(e: Event): void {
    const image = e.currentTarget as HTMLImageElement | null
    if (!image) return
    const container = image.parentElement
    if (!container) return
    fitScaleToContainer(container, image)
    requestAnimationFrame(() => {
      isAutoFitting.value = false
    })
  }

  /** 图像 CSS 样式 */
  const imgStyle = computed<CSSProperties>(() => {
    const transitionParts = []
    if (!isAutoFitting.value) {
      if (!isDragging.value && !shouldPan.value) {
        transitionParts.push('translate 0.15s ease')
      }
      if (!shouldRotate.value) {
        transitionParts.push('rotate 0.15s ease')
      }
      transitionParts.push('scale 0.15s ease')
    }
    const transition =
      !isAutoFitting.value && transitionParts.length > 0 ? transitionParts.join(', ') : 'none'

    return {
      translate: `${offset.value.x}px ${offset.value.y}px`,
      rotate: `${rotation.value}deg`,
      scale: `${scale.value / pixelRatio.value}`,
      transition,
      cursor: isDragging.value ? 'grabbing' : 'grab',
      imageRendering: scale.value >= PIXELATED_SCALE_THRESHOLD ? 'pixelated' : 'auto',
    }
  })

  /** 打开图像预览 */
  function open(target: PreviewTarget): void {
    preview.value = target
    isAutoFitting.value = true
    initialScale.value = 1
    scale.value = 1
    rotation.value = 0
    offset.value = { x: 0, y: 0 }
  }

  /** 关闭图像预览 */
  function close(): void {
    preview.value = null
  }

  /** 下载图像 */
  function download(): void {
    if (!preview.value) return
    const anchor = document.createElement('a')
    anchor.href = preview.value.url
    anchor.download = preview.value.downloadName
    anchor.click()
  }

  /** 放大图像 */
  function zoomIn(): void {
    scale.value = getNextScale(scale.value)
  }

  /** 缩小图像 */
  function zoomOut(): void {
    scale.value = getPrevScale(scale.value)
  }

  /** 顺时针旋转 90° */
  function rotateClockwise(): void {
    rotation.value += 90
  }

  /** 恢复图像为初始状态 */
  function resetView(): void {
    offset.value = { x: 0, y: 0 }
    rotation.value = 0
    scale.value = initialScale.value
  }

  /** 以鼠标位置为中心进行缩放 */
  function onWheel(e: WheelEvent): void {
    const previousScale = scale.value
    const nextScale =
      e.deltaY < 0
        ? getNextScaleWithMultiplier(previousScale)
        : getPrevScaleWithMultiplier(previousScale)

    if (nextScale === previousScale) return

    const container = e.currentTarget as HTMLElement | null

    if (!container) {
      scale.value = nextScale
      return
    }

    const rect = container.getBoundingClientRect()
    const pointerX = e.clientX - (rect.left + rect.width / 2)
    const pointerY = e.clientY - (rect.top + rect.height / 2)
    const ratio = nextScale / previousScale

    offset.value = {
      x: pointerX - (pointerX - offset.value.x) * ratio,
      y: pointerY - (pointerY - offset.value.y) * ratio,
    }
    scale.value = nextScale
  }

  /** 鼠标按下时的回调，仅响应左键 */
  function onMousedown(e: MouseEvent): void {
    if (e.button !== 0) return
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    offsetStart.value = { ...offset.value }
  }

  /** 鼠标移动时的回调，更新平移 */
  function onMousemove(e: MouseEvent): void {
    if (!isDragging.value) return
    offset.value = {
      x: offsetStart.value.x + e.clientX - dragStart.value.x,
      y: offsetStart.value.y + e.clientY - dragStart.value.y,
    }
  }

  /** 鼠标释放时的回调，结束拖动 */
  function onMouseup(): void {
    isDragging.value = false
  }

  /** 键盘按下时的回调，处理一次性快捷键，但不处理持续型快捷键 */
  function onKeydown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()

    if (!e.ctrlKey && !e.metaKey) {
      switch (key) {
        case 'escape':
          close()
          break
        case '+':
        case '=':
          zoomIn()
          break
        case '-':
          zoomOut()
          break
        case '0':
          resetView()
          break
        case 'r':
          rotateClockwise()
          break
        case 'o':
          if (preview.value) window.open(preview.value.url, '_blank', 'noopener noreferrer')
          break
      }
    } else {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault()
          download()
          break
      }
    }
  }

  // 当开启预览时自动聚焦容器以便接收键盘事件，关闭预览时不需要特别处理，因为组件会被卸载
  watch(preview, async (value) => {
    if (value) {
      await nextTick()
      overlayRef.value?.focus()
    }
  })

  // 在需要动画时执行动画步骤函数，自动管理动画帧的请求和取消
  useAnimateWhenever(
    computed(() => Boolean(shouldPan?.value || shouldRotate?.value)),
    animateStep,
    () => {
      animateLastTimestamp.value = null
    },
    () => {
      animateLastTimestamp.value = null
    },
  )

  return {
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
  }
}
