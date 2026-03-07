import { onMounted, onUnmounted, ref } from 'vue'

export function useNowMs(interval: number) {
  const nowMs = ref(Date.now())
  let timer: NodeJS.Timeout | null = null

  onMounted(() => {
    timer = setInterval(() => {
      nowMs.value = Date.now()
    }, interval)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  return { nowMs }
}
