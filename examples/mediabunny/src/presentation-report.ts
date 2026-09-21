export type PresentationBackend =
  | "browser-webcodecs-canvas"
  | "gpuix-native-video-frame"
  | "mediabunny-server-avframe-gpuix-video-frame"
  | "mediabunny-server-iosurface-gpuix-video-frame"

export type PresentationRun = {
  frames: number
  width: number
  height: number
  totalMs: number
  firstFrameMs: number
  frameStepP50Ms: number
  frameStepP95Ms: number
  decodeMs?: number
  allocationMs?: number
  copyBgraMs?: number
  uploadMs?: number
  renderFlushMs?: number
  firstFrameDecodeMs?: number
  firstFrameAllocationMs?: number
  firstFrameCopyBgraMs?: number
  firstFrameUploadMs?: number
  firstFrameRenderFlushMs?: number
  nativeBgraStride?: number
  nativePackedFallback?: boolean
  nativeSourcePixelFormat?: number
}

export type PresentationBenchmarkReport = {
  schemaVersion: 2
  backend: PresentationBackend
  generatedAt: string
  workload: {
    codec: "vp8" | "avc"
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

export function steadyStateFramesPerSecond(run: PresentationRun): number {
  const frames = Math.max(0, run.frames - 1)
  const milliseconds = run.totalMs - run.firstFrameMs
  return frames === 0 || milliseconds <= 0 ? 0 : frames / (milliseconds / 1000)
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a"
}

function ratio(nativeValue: number, browserValue: number): string {
  if (!Number.isFinite(nativeValue) || !Number.isFinite(browserValue) || browserValue === 0) return "n/a"
  return `${(nativeValue / browserValue).toFixed(2)}x`
}

function stageMedian(
  runs: readonly PresentationRun[],
  key:
    | "decodeMs"
    | "allocationMs"
    | "copyBgraMs"
    | "uploadMs"
    | "renderFlushMs"
    | "firstFrameDecodeMs"
    | "firstFrameAllocationMs"
    | "firstFrameCopyBgraMs"
    | "firstFrameUploadMs"
    | "firstFrameRenderFlushMs",
): number {
  return median(runs.map((run) => run[key] ?? 0))
}

function stagePerFrameMedian(
  runs: readonly PresentationRun[],
  key: "decodeMs" | "allocationMs" | "copyBgraMs" | "uploadMs" | "renderFlushMs",
): number {
  return median(runs.map((run) => run.frames > 0 ? (run[key] ?? 0) / run.frames : 0))
}

export function formatPresentationComparison(
  browser: PresentationBenchmarkReport,
  native: PresentationBenchmarkReport,
): string {
  if (browser.schemaVersion !== 2 || native.schemaVersion !== 2) {
    throw new Error("Unsupported presentation benchmark schema")
  }
  if (browser.workload.fixtureBytes !== native.workload.fixtureBytes) {
    throw new Error("Browser and native presentation reports used different fixture bytes")
  }
  if (browser.workload.codec !== native.workload.codec) {
    throw new Error("Browser and native presentation reports used different codecs")
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
  const browserSteadyFps = median(browser.endToEnd.map(steadyStateFramesPerSecond))
  const nativeSteadyFps = median(native.endToEnd.map(steadyStateFramesPerSecond))
  const browserFirstFrame = median(browser.endToEnd.map((run) => run.firstFrameMs))
  const nativeFirstFrame = median(native.endToEnd.map((run) => run.firstFrameMs))
  const browserP95 = median(browser.endToEnd.map((run) => run.frameStepP95Ms))
  const nativeP95 = median(native.endToEnd.map((run) => run.frameStepP95Ms))
  const browserTotal = median(browser.endToEnd.map((run) => run.totalMs))
  const nativeTotal = median(native.endToEnd.map((run) => run.totalMs))
  const sample = browser.endToEnd[0] ?? native.endToEnd[0]
  if (!sample) throw new Error("Presentation benchmark produced no measured runs")

  const usesServerAvFrame = native.backend === "mediabunny-server-avframe-gpuix-video-frame"
  const usesIosurface = native.backend === "mediabunny-server-iosurface-gpuix-video-frame"
  const nativeLabel = usesIosurface
    ? "MediaBunny VideoToolbox IOSurface + GPUix surface"
    : usesServerAvFrame
      ? "MediaBunny server AVFrame + GPUix video-frame"
      : "napi-WebCodecs + GPUix video-frame"
  const allocationLabel = usesIosurface
    ? "surface setup"
    : usesServerAvFrame
      ? "AVFrame/BGRA setup"
      : "BGRA buffer allocation/resize"
  const copyLabel = usesIosurface
    ? "AVFrame ref + IOSurface export"
    : usesServerAvFrame
      ? "AVFrame ref + BGRA conversion"
      : "BGRA copy"
  const handoffLabel = usesIosurface ? "GPUix IOSurface handoff" : "GPUix frame handoff"

  const nativeStages = [
    ["decoder wait", "decodeMs"],
    [allocationLabel, "allocationMs"],
    [copyLabel, "copyBgraMs"],
    [handoffLabel, "uploadMs"],
    ["native render flush", "renderFlushMs"],
  ] as const

  const nativeFirstFrameStages = [
    ["decoder wait", "firstFrameDecodeMs"],
    [allocationLabel, "firstFrameAllocationMs"],
    [copyLabel, "firstFrameCopyBgraMs"],
    [handoffLabel, "firstFrameUploadMs"],
    ["native render flush", "firstFrameRenderFlushMs"],
  ] as const

  const pathDescription = usesIosurface
    ? "The browser end-to-end path uses MediaBunny CanvasSink and browser WebCodecs. The native path asks MediaBunny's official server decoder for hardware acceleration, keeps VideoToolbox output in its FFmpeg AVFrame, exports the backing IOSurface, hands that surface to GPUix, and paints it through GPUI's CoreVideo surface path. No BGRA conversion or RenderImage atlas upload is part of this path."
    : usesServerAvFrame
      ? "The browser end-to-end path uses MediaBunny CanvasSink, which draws decoded browser VideoFrames directly. The native path uses MediaBunny's official server decoder, keeps decoded frames as FFmpeg AVFrames, refs each sample without copying it, converts into one reusable BGRA AVFrame with libswscale, hands those bytes to GPUix, and then flushes native rendering. The stage timers separate reusable AVFrame/scaler setup, AVFrame ref plus BGRA conversion, the synchronous GPUix frame handoff, and the explicit native render flush."
      : "The browser end-to-end path uses MediaBunny CanvasSink, which draws decoded browser VideoFrames directly. The GPUix path keeps one reusable BGRA destination for fixed-resolution frames, copies each decoded sample into it, hands those bytes to the binary video-frame API, and then flushes native rendering. The stage timers separate buffer allocation or resize, MediaBunny copyTo, the synchronous GPUix frame handoff, and the explicit native render flush."

  return [
    "# MediaBunny browser vs GPUix presentation benchmark",
    "",
    `Same ${browser.workload.codec.toUpperCase()} fixture for both paths: ${sample.width}×${sample.height}, ${sample.frames} frames, ${browser.workload.fixtureBytes} encoded bytes. Results are medians across ${browser.workload.iterations} measured runs after ${browser.workload.warmups} warmup run(s).`,
    "",
    `| Metric | Browser WebCodecs + CanvasSink | ${nativeLabel} | Native / browser |`,
    "| --- | ---: | ---: | ---: |",
    `| Decode-only throughput | ${formatNumber(browserDecodeFps)} fps | ${formatNumber(nativeDecodeFps)} fps | ${ratio(nativeDecodeFps, browserDecodeFps)} |`,
    `| End-to-end presentation throughput | ${formatNumber(browserPresentFps)} fps | ${formatNumber(nativePresentFps)} fps | ${ratio(nativePresentFps, browserPresentFps)} |`,
    `| Steady-state presentation throughput | ${formatNumber(browserSteadyFps)} fps | ${formatNumber(nativeSteadyFps)} fps | ${ratio(nativeSteadyFps, browserSteadyFps)} |`,
    `| End-to-end total | ${formatNumber(browserTotal)} ms | ${formatNumber(nativeTotal)} ms | ${ratio(nativeTotal, browserTotal)} |`,
    `| First presented frame | ${formatNumber(browserFirstFrame)} ms | ${formatNumber(nativeFirstFrame)} ms | ${ratio(nativeFirstFrame, browserFirstFrame)} |`,
    `| Per-frame step p95 | ${formatNumber(browserP95)} ms | ${formatNumber(nativeP95)} ms | ${ratio(nativeP95, browserP95)} |`,
    "",
    "Throughput ratios above 1 mean the native path processed more frames per second. Latency ratios below 1 mean the native path took less time. Steady-state throughput excludes the first presented frame.",
    "",
    "## Native end-to-end stage breakdown",
    "",
    "| Stage | Median total | Median per frame |",
    "| --- | ---: | ---: |",
    ...nativeStages.map(([label, key]) =>
      `| ${label} | ${formatNumber(stageMedian(native.endToEnd, key))} ms | ${formatNumber(stagePerFrameMedian(native.endToEnd, key))} ms |`
    ),
    "",
    "## Native first-frame breakdown",
    "",
    "| Stage | Median first frame |",
    "| --- | ---: |",
    ...nativeFirstFrameStages.map(([label, key]) =>
      `| ${label} | ${formatNumber(stageMedian(native.endToEnd, key))} ms |`
    ),
    "",
    pathDescription,
    "",
    "Stage medians are calculated independently, so their sum does not have to equal the median end-to-end total.",
  ].join("\n")
}
