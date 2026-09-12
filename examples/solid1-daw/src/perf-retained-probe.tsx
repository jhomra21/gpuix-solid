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

const collapseTrack = { title: "Collapse track" } as const
const expandTrack = { title: "Expand track" } as const
const eqGain = { role: "slider", "aria-label": "Gain" } as const

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

type TestRoot = ReturnType<typeof createTestRoot>

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
    `samples=${values.length}`,
    `p50=${percentile(values, 0.5).toFixed(2)}ms`,
    `p95=${percentile(values, 0.95).toFixed(2)}ms`,
    `max=${Math.max(...values).toFixed(2)}ms`,
    `earlyP50=${percentile(early, 0.5).toFixed(2)}ms`,
    `lateP50=${percentile(late, 0.5).toFixed(2)}ms`,
  ].join(" ")
}

function flush(app: TestRoot): void {
  app.root.flush()
  app.renderer.flush()
}

async function settle(app: TestRoot): Promise<void> {
  for (let frame = 0; frame < 3; frame += 1) {
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

async function benchmarkCollapse(): Promise<number[]> {
  const app = await mountApp()
  try {
    app.renderer.scrollTestId("daw-perf-viewport", -320, 0)
    flush(app)

    const values: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const elapsed = sample(() => {
        app.renderer.clickCustomProps(collapseTrack)
        flush(app)
        requireCondition(app.renderer.hasCustomProps(expandTrack), "collapse must expose the source Expand track control")
        app.renderer.clickCustomProps(expandTrack)
        flush(app)
        requireCondition(app.renderer.hasCustomProps(collapseTrack), "expand must restore the source Collapse track control")
      })
      if (index >= WARMUP) values.push(elapsed)
    }
    return values
  } finally {
    app.unmount()
  }
}

async function benchmarkScroll(): Promise<number[]> {
  const app = await mountApp()
  try {
    app.renderer.scrollTestId("timeline-scrolling-tracks", 0, -120)
    flush(app)
    const movedOffset = app.renderer.scrollOffsetTestId("timeline-scrolling-tracks")?.[1] ?? 0
    requireCondition(movedOffset < 0, `timeline source scroller must move vertically, got ${movedOffset}`)
    app.renderer.scrollTestId("timeline-scrolling-tracks", 0, 0)
    flush(app)

    const values: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const elapsed = sample(() => {
        app.renderer.scrollTestId("timeline-scrolling-tracks", 0, -120)
        flush(app)
        app.renderer.scrollTestId("timeline-scrolling-tracks", 0, 0)
        flush(app)
      })
      if (index >= WARMUP) values.push(elapsed)
    }
    return values
  } finally {
    app.unmount()
  }
}

function eqSourceLength(app: TestRoot): number {
  return app.renderer.customPropStringContainingAll("source", [
    'preserveAspectRatio="none"',
    'font-size="9"',
    "+0 dB",
    "10k",
    "<circle",
  ]).length
}

async function benchmarkEq(): Promise<{ values: number[]; initialSourceBytes: number; finalSourceBytes: number }> {
  const app = await mountApp()
  try {
    app.renderer.scrollTestId("daw-perf-viewport", -320, -260)
    app.renderer.scrollTestId("effects-panel", -540, 0)
    flush(app)
    requireCondition(app.renderer.hasCustomProps(eqGain), "exact source EQ Gain slider must be mounted")

    const initialSourceBytes = eqSourceLength(app)
    const values: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const elapsed = sample(() => {
        app.renderer.pressKeyCustomProps(eqGain, "PageUp")
        flush(app)
        app.renderer.pressKeyCustomProps(eqGain, "PageDown")
        flush(app)
      })
      if (index >= WARMUP) values.push(elapsed)
    }
    const finalSourceBytes = eqSourceLength(app)
    return { values, initialSourceBytes, finalSourceBytes }
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

  console.log(`[daw.retained-perf] collapse roundtrip ${describe(collapse)}`)
  console.log(`[daw.retained-perf] vertical-scroll roundtrip ${describe(scroll)}`)
  console.log(
    `[daw.retained-perf] eq gain roundtrip ${describe(eq.values)} ` +
      `sourceBytes=${eq.initialSourceBytes}->${eq.finalSourceBytes} growth=${sourceGrowth.toFixed(2)}x`,
  )
}
