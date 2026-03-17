import { computed, ref } from 'vue'

export type PreviewTarget = {
  url: string
  name: string
  downloadName: string
}

export function useImagePreview() {
  const preview = ref<PreviewTarget | null>(null)
  const scale = ref(1)
  const offset = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const offsetStart = ref({ x: 0, y: 0 })

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
    scale.value = Math.min(scale.value * 1.25, 8)
  }

  function zoomOut() {
    scale.value = Math.max(scale.value / 1.25, 0.125)
  }

  function resetZoom() {
    scale.value = 1
    offset.value = { x: 0, y: 0 }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (e.deltaY < 0) zoomIn()
    else zoomOut()
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
    if (e.key === 'Escape') close()
    else if (e.key === '+' || e.key === '=') zoomIn()
    else if (e.key === '-') zoomOut()
    else if (e.key === '0') resetZoom()
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
