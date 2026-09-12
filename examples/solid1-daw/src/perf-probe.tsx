import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  setNativeStyleColorMode,
  type TestRoot,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

type Stats = { p50: number; p95: number; max: number }
type DragProbeRenderer = TestRoot["renderer"] & {
  benchmarkDragCustomPropsMoves(
    query: Readonly<Record<string, string | number | boolean | null>>,
    deltas: readonly (readonly [number, number])[],
  ): { moves: number[]; release: number }
}

const label = process.env.PERF_LABEL ?? "unknown"
const run = process.env.PERF_RUN ?? "1"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function stats(samples: readonly number[]): Stats {
  requireCondition(samples.length > 0, "performance sample set must not be empty")
  const sorted = [...samples].sort((a, b) => a - b)
  const percentile = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))] ?? 0
  return {
    p50: round(percentile(0.5)),
    p95: round(percentile(0.95)),
    max: round(sorted[sorted.length - 1] ?? 0),
  }
}

function report(scenario: string, samples: readonly number[], details: Record<string, unknown> = {}): void {
  console.log(`[daw.perf] ${JSON.stringify({ label, run, scenario, samples: samples.length, ...stats(samples), ...details })}`)
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function settleMicrotask(app: TestRoot): Promise<void> {
  await Promise.resolve()
  app.root.flush()
  app.renderer.flush()
}

async function settleFrame(app: TestRoot): Promise<void> {
  await nextFrame()
  await settleMicrotask(app)
}

async function mountDaw(): Promise<TestRoot> {
  const app = createTestRoot(1440, 900)
  app.render(() => (
    <div testId="daw-perf-viewport" style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <DawSolid1Showcase />
    </div>
  ))
  for (let frame = 0; frame < 3; frame++) await nextFrame()
  await settleMicrotask(app)
  return app
}

async function benchmarkCollapse(): Promise<void> {
  const app = await mountDaw()
  const collapseClick: number[] = []
  const collapseSettle: number[] = []
  const expandClick: number[] = []
  const expandSettle: number[] = []

  for (let warmup = 0; warmup < 2; warmup++) {
    app.renderer.clickCustomProps({ title: "Collapse track" })
    await settleFrame(app)
    app.renderer.clickCustomProps({ title: "Expand track" })
    await settleFrame(app)
  }

  requireCondition(app.renderer.hasCustomProps({ title: "Collapse track" }), "collapse benchmark must start expanded")
  for (let sample = 0; sample < 10; sample++) {
    let started = performance.now()
    app.renderer.clickCustomProps({ title: "Collapse track" })
    collapseClick.push(performance.now() - started)
    started = performance.now()
    await settleFrame(app)
    collapseSettle.push(performance.now() - started)

    started = performance.now()
    app.renderer.clickCustomProps({ title: "Expand track" })
    expandClick.push(performance.now() - started)
    started = performance.now()
    await settleFrame(app)
    expandSettle.push(performance.now() - started)
  }

  report("collapse-click", collapseClick)
  report("collapse-next-frame", collapseSettle)
  report("expand-click", expandClick)
  report("expand-next-frame", expandSettle)
  app.unmount()
}

async function benchmarkVerticalScroll(): Promise<void> {
  const app = await mountDaw()
  const testId = "timeline-scrolling-tracks"
  app.renderer.scrollTestId(testId, 0, -80)
  const scrolled = app.renderer.scrollOffsetTestId(testId)
  requireCondition((scrolled?.[1] ?? 0) < -20, `source timeline scroller must have real vertical range, got ${JSON.stringify(scrolled)}`)
  app.renderer.scrollTestId(testId, 0, 0)

  for (let warmup = 0; warmup < 4; warmup++) {
    app.renderer.scrollTestId(testId, 0, -80)
    app.renderer.scrollTestId(testId, 0, 0)
  }

  const samples: number[] = []
  for (let sample = 0; sample < 24; sample++) {
    const y = sample % 2 === 0 ? -80 : 0
    const started = performance.now()
    app.renderer.scrollTestId(testId, 0, y)
    samples.push(performance.now() - started)
  }

  report("vertical-scroll", samples, { distancePx: 80 })
  app.unmount()
}

async function benchmarkEqDrag(): Promise<void> {
  const app = await mountDaw()
  app.renderer.scrollTestId("effects-panel", -540, 0)
  const highShelfFilter = { title: "High Shelf filter" } as const
  app.renderer.clickCustomProps(highShelfFilter)
  app.renderer.clickText("High Shelf")
  await settleFrame(app)

  const gainSlider = { role: "slider", "aria-label": "Gain" } as const
  requireCondition(app.renderer.hasCustomProps(gainSlider), "EQ gain slider must be mounted for sustained-drag benchmark")
  const renderer = app.renderer as DragProbeRenderer
  const upward = Array.from({ length: 24 }, (_, index) => [0, -(index + 1) * 1.5] as const)
  const downward = Array.from({ length: 24 }, (_, index) => [0, (index + 1) * 1.5] as const)

  const runGesture = async (deltas: readonly (readonly [number, number])[]) => {
    const result = renderer.benchmarkDragCustomPropsMoves(gainSlider, deltas)
    const settleStarted = performance.now()
    await settleFrame(app)
    return { ...result, settle: performance.now() - settleStarted }
  }

  await runGesture(upward)
  await runGesture(downward)

  const moveSamples: number[] = []
  const releaseSamples: number[] = []
  const settleSamples: number[] = []
  for (let pair = 0; pair < 5; pair++) {
    for (const deltas of [upward, downward] as const) {
      const result = await runGesture(deltas)
      moveSamples.push(...result.moves)
      releaseSamples.push(result.release)
      settleSamples.push(result.settle)
    }
  }

  report("eq-drag-move", moveSamples, { movesPerGesture: upward.length })
  report("eq-drag-release", releaseSamples)
  report("eq-drag-next-frame", settleSamples)
  app.unmount()
}

if (!hasNativeTestRenderer) throw new Error("DAW performance probe requires the native GPUIX test renderer")
configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

await benchmarkCollapse()
await benchmarkVerticalScroll()
await benchmarkEqDrag()
