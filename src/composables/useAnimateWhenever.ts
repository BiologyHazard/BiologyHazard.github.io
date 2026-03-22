import type { WatchSource } from 'vue'

import { onScopeDispose, watch } from 'vue'

/**
 * A composable that runs an animation step function when a condition is true, and stops it when the condition is false.
 * @param condition A reactive source that determines whether the animation should run or not.
 * @param step The function to execute on each animation frame. It receives the timestamp of the animation frame as an argument.
 * @param start The function to call when the animation starts.
 * @param stop The function to call when the animation stops.
 */
export function useAnimateWhenever(
  condition: WatchSource<boolean>,
  step: (timestamp: number) => void,
  start: () => void,
  stop: () => void,
) {
  function callback(timestamp: number): void {
    step(timestamp)
    animationFrame = requestAnimationFrame(callback)
  }

  function startAnimation(): void {
    if (animationFrame === null) {
      start()
      animationFrame = requestAnimationFrame(callback)
    }
  }

  function stopAnimation(): void {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
      stop()
    }
  }

  let animationFrame: number | null = null

  watch(
    condition,
    (value) => {
      if (value) {
        startAnimation()
      } else {
        stopAnimation()
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    stopAnimation()
  })
}
