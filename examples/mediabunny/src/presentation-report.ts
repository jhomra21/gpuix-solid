export type PresentationBackend =
  | "browser-webcodecs-canvas"
  | "gpuix-native-video-frame"

export type PresentationRun = {
  frames: number
  width: number
  height: number
  totalMs: number
  firstFrameMs: number
  frameStepP50Ms: number
  frameStepP95Ms: number
  decodeMs?: number
  copyBgraMs?: number
  uploadAndFlushMs?: number
}

export type PresentationBenchmarkReport = {
  schemaVersion: 1
  backend: PresentationBackend
  generatedAt: string
  workload: {
    codec: "vp8"
    fixtureBytes: number
    warmups: number
    iterations: number
  }
  decodeOnly: PresentationRun[]
  endToEnd: PresentationRun[]
  verification: Record<string, string | number | boolean>
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))
  return sorted[index] ?? 0
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function summarizeFrameSteps(frameSteps: readonly number[]) {
  return {
    frameStepP50Ms: percentile(frameSteps, 0.5),
    frameStepP95Ms: percentile(frameSteps, 0.95),
  }
}

export function framesPerSecond(run: PresentationRun): number {
  return run.totalMs <= 0 ? 0 : run.frames / (run.totalMs / 1000)
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a"
}

function ratio(nativeValue: number, browserValue: number): string {
  if (!Number.isFinite(nativeValue) || !Number.isFinite(browserValue) || browserValue === 0) return "n/a"
  return `${(nativeValue / browserValue).toFixed(2)}x`
}

export function formatPresentationComparison(
  browser: PresentationBenchmarkReport,
  native: PresentationBenchmarkReport,
): string {
  if (browser.schemaVersion !== 1 || native.schemaVersion !== 1) {
    throw new Error("Unsupported presentation benchmark schema")
  }
  if (browser.workload.fixtureBytes !== native.workload.fixtureBytes) {
    throw new Error("Browser and native presentation reports used different fixture bytes")
  }

  const browserDecodeFrames = browser.decodeOnly.map((run) => run.frames)
  const nativeDecodeFrames = native.decodeOnly.map((run) => run.frames)
  const browserPresentFrames = browser.endToEnd.map((run) => run.frames)
  const nativePresentFrames = native.endToEnd.map((run) => run.frames)
  const allFrameCounts = [
    ...browserDecodeFrames,
    ...nativeDecodeFrames,
    ...browserPresentFrames,
    ...nativePresentFrames,
  ]
  if (new Set(allFrameCounts).size !== 1) {
    throw new Error(`Presentation benchmark frame counts differ: ${allFrameCounts.join(", ")}`)
  }

  const browserDecodeFps = median(browser.decodeOnly.map(framesPerSecond))
  const nativeDecodeFps = median(native.decodeOnly.map(framesPerSecond))
  const browserPresentFps = median(browser.endToEnd.map(framesPerSecond))
  const nativePresentFps = median(native.endToEnd.map(framesPerSecond))
  const browserFirstFrame = median(browser.endToEnd.map((run) => run.firstFrameMs))
  const nativeFirstFrame = median(native.endToEnd.map((run) => run.firstFrameMs))
  const browserP95 = median(browser.endToEnd.map((run) => run.frameStepP95Ms))
  const nativeP95 = median(native.endToEnd.map((run) => run.frameStepP95Ms))
  const browserTotal = median(browser.endToEnd.map((run) => run.totalMs))
  const nativeTotal = median(native.endToEnd.map((run) => run.totalMs))

  const nativeDecodeMs = median(native.endToEnd.map((run) => run.decodeMs ?? 0))
  const nativeCopyMs = median(native.endToEnd.map((run) => run.copyBgraMs ?? 0))
  const nativeUploadMs = median(native.endToEnd.map((run) => run.uploadAndFlushMs ?? 0))
  const sample = browser.endToEnd[0] ?? native.endToEnd[0]
  if (!sample) throw new Error("Presentation benchmark produced no measured runs")

  return [
    "# MediaBunny browser vs GPUix presentation benchmark",
    "",
    `Same VP8 fixture for both paths: ${sample.width}×${sample.height}, ${sample.frames} frames, ${browser.workload.fixtureBytes} encoded bytes. Results are medians across ${browser.workload.iterations} measured runs after ${browser.workload.warmups} warmup run(s).`,
    "",
    "| Metric | Browser WebCodecs + CanvasSink | napi-WebCodecs + GPUix video-frame | Native / browser |",
    "| --- | ---: | ---: | ---: |",
    `| Decode-only throughput | ${formatNumber(browserDecodeFps)} fps | ${formatNumber(nativeDecodeFps)} fps | ${ratio(nativeDecodeFps, browserDecodeFps)} |`,
    `| End-to-end presentation throughput | ${formatNumber(browserPresentFps)} fps | ${formatNumber(nativePresentFps)} fps | ${ratio(nativePresentFps, browserPresentFps)} |`,
    `| End-to-end total | ${formatNumber(browserTotal)} ms | ${formatNumber(nativeTotal)} ms | ${ratio(nativeTotal, browserTotal)} |`,
    `| First presented frame | ${formatNumber(browserFirstFrame)} ms | ${formatNumber(nativeFirstFrame)} ms | ${ratio(nativeFirstFrame, browserFirstFrame)} |`,
    `| Per-frame step p95 | ${formatNumber(browserP95)} ms | ${formatNumber(nativeP95)} ms | ${ratio(nativeP95, browserP95)} |`,
    "",
    "Throughput ratios above 1 mean the native path processed more frames per second. Latency ratios below 1 mean the native path took less time.",
    "",
    "## Native end-to-end breakdown",
    "",
    `Median decoder wait: ${formatNumber(nativeDecodeMs)} ms. Median BGRA allocation and copy: ${formatNumber(nativeCopyMs)} ms. Median GPUix upload and render flush: ${formatNumber(nativeUploadMs)} ms.`,
    "",
    "The browser end-to-end path uses MediaBunny CanvasSink, which draws decoded browser VideoFrames directly. The GPUix path copies each decoded sample to BGRA, uploads those bytes through the binary video-frame API, and flushes GPUI rendering. The benchmark keeps that difference because it measures the paths an application can use today.",
  ].join("\n")
}
