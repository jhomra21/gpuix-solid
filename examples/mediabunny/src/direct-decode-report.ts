export type DirectDecodeRun = {
  frames: number
  width: number
  height: number
  totalMs: number
  firstFrameMs: number
  frameStepP50Ms: number
  frameStepP95Ms: number
  nativePacketParseMs?: number
  nativeSampleBuildMs?: number
  nativeSubmitMs?: number
  nativeWaitMs?: number
}

export type DirectDecodeReport = {
  schemaVersion: 1
  backend: "browser-webcodecs-direct" | "videotoolbox-direct"
  generatedAt: string
  workload: {
    codec: "avc"
    fixtureBytes: number
    warmups: number
    iterations: number
  }
  runs: DirectDecodeRun[]
  verification: Record<string, string | number | boolean>
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  )
  return sorted[index] ?? 0
}

export function summarizeArrivals(arrivalMs: readonly number[]) {
  const ordered = [...arrivalMs].sort((a, b) => a - b)
  const steps: number[] = []
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1] ?? 0
    const current = ordered[index] ?? previous
    steps.push(current - previous)
  }
  return {
    frameStepP50Ms: percentile(steps, 0.5),
    frameStepP95Ms: percentile(steps, 0.95),
  }
}

export function framesPerSecond(run: DirectDecodeRun): number {
  return run.totalMs <= 0 ? 0 : run.frames / (run.totalMs / 1000)
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}
