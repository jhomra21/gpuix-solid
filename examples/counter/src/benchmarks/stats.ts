export interface BenchmarkStats {
  n: number
  p50: number
  p95: number
  max: number
}

export function percentile(sorted: readonly number[], percentileValue: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  )
  return sorted[Math.max(0, index)] ?? 0
}

export function summarize(samples: readonly number[]): BenchmarkStats {
  const sorted = [...samples].sort((left, right) => left - right)
  return {
    n: samples.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted.at(-1) ?? 0,
  }
}

export function report(prefix: string, label: string, samples: readonly number[]): BenchmarkStats {
  const stats = summarize(samples)
  console.log(
    `[${prefix}] ${label} n=${stats.n} p50=${stats.p50.toFixed(2)}ms ` +
      `p95=${stats.p95.toFixed(2)}ms max=${stats.max.toFixed(2)}ms`,
  )
  return stats
}

export function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}
