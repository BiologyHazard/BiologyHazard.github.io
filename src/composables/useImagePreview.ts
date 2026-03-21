import type { CSSProperties, Ref } from 'vue'

import { useDevicePixelRatio, useMagicKeys } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'

import { useAnimateWhenever } from '@/composables/useAnimateWhenever'

import { useImagePreviewScale } from './useImagePreviewScale'

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
  const PIXELATED_SCALE_THRESHOLD = 4
  const PAN_SPEED = 1600
  const PAN_FAST_MULTIPLIER = 4
  const ROTATE_SPEED = 90
  const ROTATE_FAST_MULTIPLIER = 2
  const {
    clampScale,
    getNextScale,
    getPrevScale,
    getNextScaleWithMultiplier,
    getPrevScaleWithMultiplier,
  } = useImagePreviewScale(1 / 128, 128, 2, [1, 1.25, 1.5], 1.25)

  const preview = ref<PreviewTarget | null>(null)
  const offset = ref<Point2D>({ x: 0, y: 0 })
  const rotation = ref<number>(0)
  const scale = ref<number>(1)
  const initialScale = ref<number>(1)

  const { pixelRatio } = useDevicePixelRatio()

  const isAutoFitting = ref<boolean>(false)
  const animateLastTimestamp = ref<number | null>(null)
  const isDragging = ref<boolean>(false)
  const dragStart = ref<Point2D>({ x: 0, y: 0 })
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

  const shouldPan = computed(() => {
    if (!preview.value) return false
    const { x, y } = getPanDirection()
    return x !== 0 || y !== 0
  })

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
      scale: `${scale.value / pixelRatio.value}`,
      rotate: `${rotation.value}deg`,
      cursor: isDragging.value ? 'grabbing' : 'grab',
      transition,
      imageRendering: scale.value >= PIXELATED_SCALE_THRESHOLD ? 'pixelated' : 'auto',
    }
  })

  function open(target: PreviewTarget): void {
    preview.value = target
    isAutoFitting.value = true
    initialScale.value = 1
    scale.value = 1
    rotation.value = 0
    offset.value = { x: 0, y: 0 }
  }

  function close(): void {
    preview.value = null
  }

  function download(): void {
    if (!preview.value) return
    const anchor = document.createElement('a')
    anchor.href = preview.value.url
    anchor.download = preview.value.downloadName
    anchor.click()
  }

  function zoomIn(): void {
    scale.value = getNextScale(scale.value)
  }

  function zoomOut(): void {
    scale.value = getPrevScale(scale.value)
  }

  function rotateClockwise(): void {
    rotation.value += 90
  }

  function resetView(): void {
    scale.value = initialScale.value
    offset.value = { x: 0, y: 0 }
    rotation.value = 0
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

  function onMousedown(e: MouseEvent): void {
    if (e.button !== 0) return
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    offsetStart.value = { ...offset.value }
  }

  function onMousemove(e: MouseEvent): void {
    if (!isDragging.value) return
    offset.value = {
      x: offsetStart.value.x + e.clientX - dragStart.value.x,
      y: offsetStart.value.y + e.clientY - dragStart.value.y,
    }
  }

  function onMouseup(): void {
    isDragging.value = false
  }

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

  watch(preview, async (value) => {
    if (value) {
      await nextTick()
      overlayRef.value?.focus()
    }
  })

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
