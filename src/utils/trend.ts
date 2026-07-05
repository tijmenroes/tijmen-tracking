/**
 * Least-squares linear regression over (x, y) points.
 * Returns a predictor `f(x)` plus the raw slope/intercept.
 * `x` is expected in the same unit you want to predict with (e.g. epoch ms).
 */
export function linearTrend(points: [number, number][]) {
  const n = points.length
  if (n < 2) return null

  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0
  for (const [x, y] of points) {
    sx += x
    sy += y
    sxy += x * y
    sxx += x * x
  }

  const denom = n * sxx - sx * sx
  if (denom === 0) return null

  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
  }
}
