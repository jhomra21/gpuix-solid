import { performance } from "node:perf_hooks"
import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

const WARMUP = 2
const SAMPLES = 12
const svgDataUrlPrefix = "data:image/svg+xml,"

const collapseTrack = { title: "Collapse track" } as const
const expandTrack = { title: "Expand track" } as const
const eqGain = { role: "slider", "aria-label": "Gain" } as const

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

type TestRoot = ReturnType<typeof createTestRoot>

type Samples = {
  gross: number[]
  lookup: number[]
  net: number[]
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function percentile(values: readonly number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index] ?? 0
}

function describe(values: readonly number[]): string {
  const midpoint = Math.max(1, Math.floor(values.length / 2))
  const early = values.slice(0, midpoint)
  const late = values.slice(midpoint)
  return [
    `p50=${percentile(values, 0.5).toFixed(2)}ms`,
    `p95=${percentile(values, 0.95).toFixed(2)}ms`,
    `max=${Math.max(...values).toFixed(2)}ms`,
    `earlyP50=${percentile(early, 0.5).toFixed(2)}ms`,
    `lateP50=${percentile(late, 0.5).toFixed(2)}ms`,
  ].join(" ")
}

function describeSamples(samples: Samples): string {
  return [
    `samples=${samples.gross.length}`,
    `gross[${describe(samples.gross)}]`,
    `lookup[${describe(samples.lookup)}]`,
    `net[${describe(samples.net)}]`,
  ].join(" ")
}

function flush(app: TestRoot): void {
  app.root.flush()
  app.renderer.flush()
}

async function settle(app: TestRoot, frames = 3): Promise<void> {
  for (let frame = 0; frame < frames; frame += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  await Promise.resolve()
  flush(app)
}

async function mountApp(): Promise<TestRoot> {
  const app = createTestRoot(1440, 900)
  app.render(() => (
    <div testId="daw-perf-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))
  await settle(app)
  return app
}

function sample(operation: () => void): number {
  const started = performance.now()
  operation()
  return performance.now() - started
}

async function sampleAsync(operation: () => Promise<void>): Promise<number> {
  const started = performance.now()
  await operation()
  return performance.now() - started
}

function pushSample(samples: Samples, gross: number, lookup: number, index: number): void {
  if (index < WARMUP) return
  samples.gross.push(gross)
  samples.lookup.push(lookup)
  samples.net.push(Math.max(0, gross - lookup))
}

function emptySamples(): Samples {
  return { gross: [], lookup: [], net: [] }
}

async function benchmarkCollapse(): Promise<Samples> {
  const app = await mountApp()
  try {
    app.renderer.scrollTestId("daw-perf-viewport", -320, 0)
    flush(app)

    const samples = emptySamples()
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const lookupCollapse = sample(() => { app.renderer.boundsCustomProps(collapseTrack) })
      const collapse = sample(() => { app.renderer.clickCustomProps(collapseTrack) })
      const lookupExpand = sample(() => { app.renderer.boundsCustomProps(expandTrack) })
      const expand = sample(() => { app.renderer.clickCustomProps(expandTrack) })
      pushSample(samples, collapse + expand, lookupCollapse + lookupExpand, index)
    }
    requireCondition(app.renderer.hasCustomProps(collapseTrack), "collapse/expand roundtrip must restore the source Collapse track control")
    return samples
  } finally {
    app.unmount()
  }
}

async function benchmarkScroll(): Promise<Samples> {
  const app = await mountApp()
  try {
    app.renderer.scrollTestId("timeline-scrolling-tracks", 0, -120)
    const movedOffset = app.renderer.scrollOffsetTestId("timeline-scrolling-tracks")?.[1] ?? 0
    requireCondition(movedOffset < 0, `timeline source scroller must move vertically, got ${movedOffset}`)
    app.renderer.scrollTestId("timeline-scrolling-tracks", 0, 0)

    const samples = emptySamples()
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const lookupDown = sample(() => { app.renderer.hasTestId("timeline-scrolling-tracks") })
      const down = sample(() => { app.renderer.scrollTestId("timeline-scrolling-tracks", 0, -120) })
      const lookupUp = sample(() => { app.renderer.hasTestId("timeline-scrolling-tracks") })
      const up = sample(() => { app.renderer.scrollTestId("timeline-scrolling-tracks", 0, 0) })
      pushSample(samples, down + up, lookupDown + lookupUp, index)
    }
    return samples
  } finally {
    app.unmount()
  }
}

function eqFrameSource(app: TestRoot): string {
  const fragments = [
    'preserveAspectRatio="none"',
    'font-size="9"',
    "+0 dB",
    "10k",
    "<circle",
  ] as const
  try {
    return app.renderer.customPropStringContainingAll("source", fragments)
  } catch {
    const src = app.renderer.customPropStringContainingAll("src", [svgDataUrlPrefix, ...fragments])
    requireCondition(src.startsWith(svgDataUrlPrefix), `expected SVG image frame, got ${src}`)
    return src.slice(svgDataUrlPrefix.length)
  }
}

async function benchmarkEq(): Promise<{ samples: Samples; initialSourceBytes: number; finalSourceBytes: number }> {
  const app = await mountApp()
  try {
    app.renderer.scrollTestId("daw-perf-viewport", -320, -260)
    app.renderer.scrollTestId("effects-panel", -540, 0)
    flush(app)
    requireCondition(app.renderer.hasCustomProps(eqGain), "exact source EQ Gain slider must be mounted")

    const initialSourceBytes = eqFrameSource(app).length
    const samples = emptySamples()
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const lookupUp = sample(() => { app.renderer.customPropByCustomProps(eqGain, "aria-valuetext") })
      const up = await sampleAsync(async () => {
        app.renderer.pressKeyCustomProps(eqGain, "PageUp")
        await settle(app, 2)
      })
      const lookupDown = sample(() => { app.renderer.customPropByCustomProps(eqGain, "aria-valuetext") })
      const down = await sampleAsync(async () => {
        app.renderer.pressKeyCustomProps(eqGain, "PageDown")
        await settle(app, 2)
      })
      pushSample(samples, up + down, lookupUp + lookupDown, index)
    }
    const finalSourceBytes = eqFrameSource(app).length
    return { samples, initialSourceBytes, finalSourceBytes }
  } finally {
    app.unmount()
  }
}

if (!hasNativeTestRenderer) {
  console.log("daw.retained-perf: native TestGpuixRenderer unavailable; skipped")
} else {
  const collapse = await benchmarkCollapse()
  const scroll = await benchmarkScroll()
  const eq = await benchmarkEq()
  const sourceGrowth = eq.initialSourceBytes > 0 ? eq.finalSourceBytes / eq.initialSourceBytes : 0

  console.log(`[daw.retained-perf] collapse roundtrip ${describeSamples(collapse)}`)
  console.log(`[daw.retained-perf] vertical-scroll roundtrip ${describeSamples(scroll)}`)
  console.log(
    `[daw.retained-perf] eq gain roundtrip ${describeSamples(eq.samples)} ` +
      `sourceBytes=${eq.initialSourceBytes}->${eq.finalSourceBytes} growth=${sourceGrowth.toFixed(2)}x`,
  )
}
