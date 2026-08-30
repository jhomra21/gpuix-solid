import { createSignal, type Element as SolidElement, type Setter } from "solid-js"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type App,
  type TestRoot,
} from "gpuix-solid"
import { ChatApp } from "../chat/shell"
import { report } from "./stats"

const TURNS = Number(process.env.TURNS ?? 1_000)
const WARMUP = 10
const SAMPLES = 40
const WHEEL_AT = { x: 700, y: 400 }

interface HighlightController {
  setQuery?: Setter<string>
  setActiveIndex?: Setter<number>
}

function sampleFlushes(root: TestRoot, count: number): number[] {
  const samples: number[] = []
  for (let index = 0; index < count; index += 1) {
    const started = performance.now()
    root.renderer.flush()
    samples.push(performance.now() - started)
  }
  return samples
}

function mountChat(): TestRoot {
  const root = createTestRoot()
  root.render(() => <ChatApp turnCount={TURNS} includeSafeMdx />)
  return root
}

function HighlightHarness(props: { controller: HighlightController }): SolidElement {
  const [query, setQuery] = createSignal("")
  const [activeIndex, setActiveIndex] = createSignal(0)
  props.controller.setQuery = setQuery
  props.controller.setActiveIndex = setActiveIndex

  return (
    <div
      style={{ flexGrow: 1 }}
      highlight={query() ? { query: query(), activeIndex: activeIndex() } : null}
    >
      <ChatApp turnCount={TURNS} includeSafeMdx />
    </div>
  )
}

async function close(root: TestRoot, app?: App): Promise<void> {
  if (app) await app.close()
  root.unmount()
}

function benchmarkMount(): void {
  const root = createTestRoot()
  try {
    const started = performance.now()
    root.render(() => <ChatApp turnCount={TURNS} includeSafeMdx />)
    const elapsed = performance.now() - started
    console.log(`[chat.perf] mount turns=${TURNS} ${elapsed.toFixed(2)}ms`)
  } finally {
    root.unmount()
  }
}

function benchmarkIdleAndWheel(): void {
  const root = mountChat()
  try {
    sampleFlushes(root, WARMUP)
    report("chat.perf", "idle flush", sampleFlushes(root, SAMPLES))

    for (let index = 0; index < WARMUP; index += 1) {
      const deltaY = index % 2 === 0 ? -160 : 160
      root.renderer.nativeSimulateScrollWheel(WHEEL_AT.x, WHEEL_AT.y, 0, deltaY)
    }

    const wheel: number[] = []
    for (let index = 0; index < SAMPLES; index += 1) {
      const deltaY = Math.floor(index / 8) % 2 === 0 ? -160 : 160
      const started = performance.now()
      root.renderer.nativeSimulateScrollWheel(WHEEL_AT.x, WHEEL_AT.y, 0, deltaY)
      wheel.push(performance.now() - started)
    }
    report("chat.perf", "wheel", wheel)

    root.renderer.resetDebugFrameOverlayStats()
    root.renderer.flush()
    const overlay = root.renderer.getDebugFrameOverlayStats()
    console.log(
      `[chat.perf] overlay samples=${overlay.samples} p90=${(overlay.p90Ms ?? 0).toFixed(2)}ms ` +
        `max=${(overlay.maxMs ?? 0).toFixed(2)}ms`,
    )
  } finally {
    root.unmount()
  }
}

function benchmarkHighlight(): void {
  const root = createTestRoot()
  const controller: HighlightController = {}
  try {
    root.render(() => <HighlightHarness controller={controller} />)
    sampleFlushes(root, WARMUP)

    root.root.flushSync(() => controller.setQuery?.("p"))
    const word = "performance of the renderer"
    const querySamples: number[] = []
    for (let length = 2; length <= word.length; length += 1) {
      const started = performance.now()
      root.root.flushSync(() => controller.setQuery?.(word.slice(0, length)))
      querySamples.push(performance.now() - started)
    }
    report("chat.perf", "highlight keystroke", querySamples)

    const cursorSamples: number[] = []
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now()
      root.root.flushSync(() => controller.setActiveIndex?.(index))
      cursorSamples.push(performance.now() - started)
    }
    report("chat.perf", "highlight cursor", cursorSamples)
  } finally {
    root.unmount()
  }
}

async function benchmarkSidebar(): Promise<void> {
  const root = mountChat()
  const app = createTestApp(root.renderer)
  try {
    await app.getByTestId("sidebar-collapse").waitFor()
    await app.clock.pause()
    const samples: number[] = []
    for (let index = 0; index < 8; index += 1) {
      const testId = index % 2 === 0 ? "sidebar-collapse" : "sidebar-expand"
      const started = performance.now()
      await app.getByTestId(testId).click()
      samples.push(performance.now() - started)
      await app.clock.fastForward(200)
    }
    report("chat.perf", "sidebar click", samples)
    await app.clock.resume()
  } finally {
    await close(root, app)
  }
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("chat.perf: native TestGpuixRenderer unavailable; skipped")
    return
  }

  console.log(
    "[chat.perf] workload matches the upstream GPUIX React 0.6 Chat benchmark: " +
      "1000 turns, idle flush, wheel draw, highlight updates, and sidebar toggles.",
  )
  console.log(
    "[chat.perf] upstream React reference budgets: mount 170ms, wheel p95 8ms/max 16ms, " +
      "highlight p95 12ms/max 25ms, sidebar max 40ms. These are references, not Solid claims.",
  )
  benchmarkMount()
  benchmarkIdleAndWheel()
  benchmarkHighlight()
  await benchmarkSidebar()
}

await main()
