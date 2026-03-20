import { computed, ref } from 'vue'

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

  const preview = ref<PreviewTarget | null>(null)
  const scale = ref<number>(1)
  const offset = ref<Point>({ x: 0, y: 0 })
  const isDragging = ref<boolean>(false)
  const dragStart = ref<Point>({ x: 0, y: 0 })
  const offsetStart = ref<Point>({ x: 0, y: 0 })

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

  const imgStyle = computed(() => ({
    transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
    transition: isDragging.value ? 'none' : 'transform 0.15s ease',
  }))

  function open(target: PreviewTarget) {
    preview.value = target
    scale.value = 1
    offset.value = { x: 0, y: 0 }
  }

  function close() {
    preview.value = null
  }

  function zoomIn() {
    scale.value = getNextScale(scale.value)
  }

  function zoomOut() {
    scale.value = getPrevScale(scale.value)
  }

  function resetZoom() {
    scale.value = 1
    offset.value = { x: 0, y: 0 }
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
    if (e.key === 'Escape') {
      close()
    } else if (e.key === '+' || e.key === '=') {
      zoomIn()
    } else if (e.key === '-') {
      zoomOut()
    } else if (e.key === '0') {
      resetZoom()
    } else if (e.key === 'o' || e.key === 'O') {
      if (preview.value) window.open(preview.value.url, '_blank', 'noopener noreferrer')
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      download()
    }
  }

  function download() {
    if (!preview.value) return
    const anchor = document.createElement('a')
    anchor.href = preview.value.url
    anchor.download = preview.value.downloadName
    anchor.click()
  }

  return {
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
  }
}
