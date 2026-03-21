import { useDevicePixelRatio } from '@vueuse/core'
import { computed, ref, type CSSProperties } from 'vue'

export type Point = {
  x: number
  y: number
}

export type PreviewTarget = {
  url: string
  name: string
  downloadName: string
}

export function useImagePreview() {
  const MIN_SCALE = 1 / 128
  const MAX_SCALE = 128
  const STEP_FACTORS = [1, 1.25, 1.5] as const
  const PIXELATED_SCALE_THRESHOLD = 4
  const PAN_SPEED = 1600
  const PAN_FAST_MULTIPLIER = 4
  const ROTATE_SPEED = 90
  const ROTATE_FAST_MULTIPLIER = 2
  const ANIMATE_KEYS = new Set([
    'w',
    'a',
    's',
    'd',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    'q',
    'e',
  ])

  const preview = ref<PreviewTarget | null>(null)
  const scale = ref<number>(1)
  const initialScale = ref<number>(1)
  const { pixelRatio } = useDevicePixelRatio()
  const rotation = ref<number>(0)
  const offset = ref<Point>({ x: 0, y: 0 })
  const isDragging = ref<boolean>(false)
  const isAutoFitting = ref<boolean>(false)
  const dragStart = ref<Point>({ x: 0, y: 0 })
  const offsetStart = ref<Point>({ x: 0, y: 0 })
  const pressedAnimateKeys = ref<Set<string>>(new Set())
  const isShiftPressed = ref<boolean>(false)
  const animateFrame = ref<number | null>(null)
  const animateLastTimestamp = ref<number | null>(null)

  /** 获取平移方向，x 和 y 的值分别表示水平方向和垂直方向，-1 表示向左或向上，1 表示向右或向下，0 表示不移动 */
  function getPanDirection() {
    const keys = pressedAnimateKeys.value
    const x =
      Number(keys.has('a') || keys.has('arrowleft')) -
      Number(keys.has('d') || keys.has('arrowright'))
    const y =
      Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
    return { x, y }
  }

  /** 获取旋转方向，-1 表示逆时针，1 表示顺时针，0 表示不旋转 */
  function getRotateDirection() {
    const keys = pressedAnimateKeys.value
    return Number(keys.has('e')) - Number(keys.has('q'))
  }

  function startAnimate() {
    if (animateFrame.value !== null) return
    animateFrame.value = requestAnimationFrame(animateStep)
  }

  function stopAnimate() {
    if (animateFrame.value !== null) {
      cancelAnimationFrame(animateFrame.value)
      animateFrame.value = null
    }
    animateLastTimestamp.value = null
  }

  function animateStep(timestamp: number) {
    if (animateLastTimestamp.value === null) {
      animateLastTimestamp.value = timestamp
    }

    const deltaSeconds = (timestamp - animateLastTimestamp.value) / 1000
    animateLastTimestamp.value = timestamp

    const panDirection = getPanDirection()
    const rotateDirection = getRotateDirection()

    if (!panDirection.x && !panDirection.y && !rotateDirection) {
      stopAnimate()
      return
    }

    if (panDirection.x || panDirection.y) {
      const magnitude = Math.hypot(panDirection.x, panDirection.y) || 1
      const unitX = panDirection.x / magnitude
      const unitY = panDirection.y / magnitude

      offset.value = {
        x:
          offset.value.x +
          unitX * PAN_SPEED * (isShiftPressed.value ? PAN_FAST_MULTIPLIER : 1) * deltaSeconds,
        y:
          offset.value.y +
          unitY * PAN_SPEED * (isShiftPressed.value ? PAN_FAST_MULTIPLIER : 1) * deltaSeconds,
      }
    }

    if (rotateDirection) {
      rotation.value +=
        rotateDirection *
        ROTATE_SPEED *
        (isShiftPressed.value ? ROTATE_FAST_MULTIPLIER : 1) *
        deltaSeconds
    }

    animateFrame.value = requestAnimationFrame(animateStep)
  }

  function getNextScale(value: number) {
    const exponent = Math.floor(Math.log2(value))

    for (let exp = exponent - 1; exp <= exponent + 2; exp += 1) {
      const base = 2 ** exp
      for (const factor of STEP_FACTORS) {
        const candidate = base * factor
        if (candidate > value && candidate >= MIN_SCALE && candidate <= MAX_SCALE) {
          return candidate
        }
      }
    }

    return MAX_SCALE
  }

  function getPrevScale(value: number) {
    const exponent = Math.floor(Math.log2(value))

    for (let exp = exponent + 1; exp >= exponent - 2; exp -= 1) {
      const base = 2 ** exp
      for (const factor of [...STEP_FACTORS].reverse()) {
        const candidate = base * factor
        if (candidate < value && candidate >= MIN_SCALE && candidate <= MAX_SCALE) {
          return candidate
        }
      }
    }

    return MIN_SCALE
  }

  function clampScale(value: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
  }

  function fitScaleToContainer(container: HTMLElement, image: HTMLImageElement) {
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

  function onImageLoad(e: Event) {
    const image = e.currentTarget as HTMLImageElement | null
    if (!image) return
    const container = image.parentElement
    if (!container) return
    fitScaleToContainer(container, image)
    requestAnimationFrame(() => {
      isAutoFitting.value = false
    })
  }

  const imgStyle = computed<CSSProperties>(() => ({
    transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value / pixelRatio.value}) rotate(${rotation.value}deg)`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
    transition:
      isDragging.value || isAutoFitting.value || animateFrame.value
        ? 'none'
        : 'transform 0.15s ease',
    imageRendering: scale.value >= PIXELATED_SCALE_THRESHOLD ? 'pixelated' : 'auto',
  }))

  function open(target: PreviewTarget) {
    preview.value = target
    isAutoFitting.value = true
    initialScale.value = 1
    scale.value = 1
    rotation.value = 0
    offset.value = { x: 0, y: 0 }
  }

  function close() {
    preview.value = null
    pressedAnimateKeys.value.clear()
    isShiftPressed.value = false
    stopAnimate()
  }

  function download() {
    if (!preview.value) return
    const anchor = document.createElement('a')
    anchor.href = preview.value.url
    anchor.download = preview.value.downloadName
    anchor.click()
  }

  function zoomIn() {
    scale.value = getNextScale(scale.value)
  }

  function zoomOut() {
    scale.value = getPrevScale(scale.value)
  }

  function rotateClockwise() {
    rotation.value += 90
  }

  function resetView() {
    scale.value = initialScale.value
    offset.value = { x: 0, y: 0 }
    rotation.value = 0
  }

  /** 以鼠标位置为中心进行缩放 */
  function onWheel(e: WheelEvent) {
    const previousScale = scale.value
    const nextScale =
      e.deltaY < 0
        ? Math.min(previousScale * 1.25, MAX_SCALE)
        : Math.max(previousScale / 1.25, MIN_SCALE)

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

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0) return
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    offsetStart.value = { ...offset.value }
  }

  function onMousemove(e: MouseEvent) {
    if (!isDragging.value) return
    offset.value = {
      x: offsetStart.value.x + e.clientX - dragStart.value.x,
      y: offsetStart.value.y + e.clientY - dragStart.value.y,
    }
  }

  function onMouseup() {
    isDragging.value = false
  }

  function onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()

    if (key === 'shift') {
      isShiftPressed.value = true
    }

    if (!e.ctrlKey && !e.metaKey && ANIMATE_KEYS.has(key)) {
      e.preventDefault()
      pressedAnimateKeys.value.add(key)
      startAnimate()
      return
    }

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

  function onKeyup(e: KeyboardEvent) {
    const key = e.key.toLowerCase()

    if (key === 'shift') {
      isShiftPressed.value = false
    }

    if (ANIMATE_KEYS.has(key)) {
      pressedAnimateKeys.value.delete(key)
      if (pressedAnimateKeys.value.size === 0) {
        stopAnimate()
      } else {
        startAnimate()
      }
    }
  }

  function onBlur() {
    pressedAnimateKeys.value.clear()
    isShiftPressed.value = false
    stopAnimate()
  }

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
    onKeyup,
    onBlur,
  }
}
