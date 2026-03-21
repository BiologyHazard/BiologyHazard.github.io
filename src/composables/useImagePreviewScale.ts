export function useImagePreviewScale(
  minScale: number,
  maxScale: number,
  base: number,
  stepFactors: number[],
  multiplier: number,
) {
  const stepFactorsReversed = [...stepFactors].reverse()

  function clampScale(value: number): number {
    return Math.min(maxScale, Math.max(minScale, value))
  }

  function getNextScale(value: number): number {
    const exponent = Math.floor(Math.log(value) / Math.log(base))

    for (const exp of [exponent, exponent + 1]) {
      const coefficient = base ** exp
      for (const factor of stepFactors) {
        const candidate = coefficient * factor
        if (candidate > value) {
          return clampScale(candidate)
        }
      }
    }

    return maxScale
  }

  function getPrevScale(value: number): number {
    const exponent = Math.floor(Math.log(value) / Math.log(base))

    for (const exp of [exponent, exponent - 1]) {
      const coefficient = base ** exp
      for (const factor of stepFactorsReversed) {
        const candidate = coefficient * factor
        if (candidate < value) {
          return clampScale(candidate)
        }
      }
    }

    return minScale
  }

  function getNextScaleWithMultiplier(value: number): number {
    return clampScale(value * multiplier)
  }

  function getPrevScaleWithMultiplier(value: number): number {
    return clampScale(value / multiplier)
  }

  return {
    clampScale,
    getNextScale,
    getPrevScale,
    getNextScaleWithMultiplier,
    getPrevScaleWithMultiplier,
  }
}
