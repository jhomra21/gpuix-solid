import { performance } from "node:perf_hooks"
import { TestGpuixRenderer } from "@gpuix/native"
import {
  configureNativeStyleManifest,
  hasNativeTestRenderer,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { adaptBatchRenderer } from "../../../packages/solid1/src/batch-renderer-adapter"
import { useDestroyUnlinksParentBatch } from "../../../packages/solid1/src/host/mutations"
import { createRoot } from "../../../packages/solid1/src/root"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

const WARMUP = 2
const SAMPLES = 12

type NativeTreeNode = {
  id: number
  testId?: string
  customProps?: Record<string, string | number | boolean | null>
  children?: NativeTreeNode[]
}

type BenchmarkRoot = {
  root: ReturnType<typeof createRoot>
  native: TestGpuixRenderer
  unmount(): void
}

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

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

function tree(app: BenchmarkRoot): NativeTreeNode {
  app.native.flush()
  const parsed = JSON.parse(app.native.getTreeJson()) as NativeTreeNode | null
  if (!parsed) throw new Error("Expected a retained native tree")
  return parsed
}

function findNode(node: NativeTreeNode, predicate: (candidate: NativeTreeNode) => boolean): NativeTreeNode | undefined {
  if (predicate(node)) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return undefined
}

function findTestId(app: BenchmarkRoot, testId: string): NativeTreeNode {
  const node = findNode(tree(app), (candidate) => candidate.testId === testId)
  if (!node) throw new Error(`Expected ${testId} in retained native tree`)
  return node
}

function findCustomProps(app: BenchmarkRoot, query: Readonly<Record<string, string>>): NativeTreeNode {
  const node = findNode(tree(app), (candidate) => Object.entries(query).every(([key, value]) => candidate.customProps?.[key] === value))
  if (!node) throw new Error(`Expected custom props ${JSON.stringify(query)} in retained native tree`)
  return node
}

function findSource(app: BenchmarkRoot, fragments: readonly string[]): string {
  const node = findNode(tree(app), (candidate) => {
    const source = candidate.customProps?.source
    return typeof source === "string" && fragments.every((fragment) => source.includes(fragment))
  })
  const source = node?.customProps?.source
  if (typeof source !== "string") throw new Error(`Expected source containing ${JSON.stringify(fragments)}`)
  return source
}

function flush(app: BenchmarkRoot): void {
  app.root.flush()
  app.native.flush()
}

function dispatchNativeEvents(app: BenchmarkRoot): void {
  for (;;) {
    const events = app.native.drainEvents()
    if (events.length === 0) return
    for (const event of events) app.root.dispatch(event)
  }
}

function clickPoint(app: BenchmarkRoot, x: number, y: number): void {
  app.native.simulateMouseDown(x, y, 0)
  dispatchNativeEvents(app)
  app.native.flush()
  app.native.simulateMouseUp(x, y, 0)
  dispatchNativeEvents(app)
  app.native.flush()
}

function scrollElement(app: BenchmarkRoot, elementId: number, x: number, y: number): void {
  app.native.flush()
  app.native.scrollTo(elementId, x, y)
  app.native.flush()
}

function pressKey(app: BenchmarkRoot, elementId: number, key: string): void {
  app.native.focusElement(elementId)
  app.native.simulateKeystrokes(key)
  dispatchNativeEvents(app)
  app.native.flush()
}

function center(app: BenchmarkRoot, elementId: number): { x: number; y: number } {
  app.native.flush()
  const bounds = app.native.getElementBounds(elementId)
  if (!bounds || bounds.length < 4) throw new Error(`Expected painted bounds for element ${elementId}`)
  const [x, y, width, height] = bounds
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error(`Expected complete painted bounds for element ${elementId}`)
  }
  return { x: x + width / 2, y: y + height / 2 }
}

async function settle(app: BenchmarkRoot, frames = 3): Promise<void> {
  for (let frame = 0; frame < frames; frame += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  await Promise.resolve()
  flush(app)
}

async function mountApp(): Promise<BenchmarkRoot> {
  const native = new TestGpuixRenderer(1440, 900)
  const hostRenderer = adaptBatchRenderer(native)
  useDestroyUnlinksParentBatch(hostRenderer)
  const root = createRoot(hostRenderer)
  root.render(() => (
    <div testId="daw-perf-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))
  native.flush()

  const app: BenchmarkRoot = {
    root,
    native,
    unmount() {
      root.unmount()
      native.flush()
    },
  }
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

async function benchmarkCollapse(): Promise<number[]> {
  const app = await mountApp()
  try {
    const viewportId = findTestId(app, "daw-perf-viewport").id
    scrollElement(app, viewportId, -320, 0)
    const collapseButton = findCustomProps(app, { title: "Collapse track" })
    const point = center(app, collapseButton.id)

    const values: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const elapsed = sample(() => {
        clickPoint(app, point.x, point.y)
        clickPoint(app, point.x, point.y)
      })
      if (index >= WARMUP) values.push(elapsed)
    }
    requireCondition(
      findCustomProps(app, { title: "Collapse track" }).id > 0,
      "collapse/expand roundtrip must restore the source Collapse track control",
    )
    return values
  } finally {
    app.unmount()
  }
}

async function benchmarkScroll(): Promise<number[]> {
  const app = await mountApp()
  try {
    const scrollerId = findTestId(app, "timeline-scrolling-tracks").id
    scrollElement(app, scrollerId, 0, -120)
    const movedOffset = app.native.getScrollOffset(scrollerId)?.[1] ?? 0
    requireCondition(movedOffset < 0, `timeline source scroller must move vertically, got ${movedOffset}`)
    scrollElement(app, scrollerId, 0, 0)

    const values: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const elapsed = sample(() => {
        scrollElement(app, scrollerId, 0, -120)
        scrollElement(app, scrollerId, 0, 0)
      })
      if (index >= WARMUP) values.push(elapsed)
    }
    return values
  } finally {
    app.unmount()
  }
}

function eqSourceLength(app: BenchmarkRoot): number {
  return findSource(app, [
    'preserveAspectRatio="none"',
    'font-size="9"',
    "+0 dB",
    "10k",
    "<circle",
  ]).length
}

async function drawEqFrame(app: BenchmarkRoot): Promise<void> {
  await settle(app, 2)
}

async function benchmarkEq(): Promise<{ values: number[]; initialSourceBytes: number; finalSourceBytes: number }> {
  const app = await mountApp()
  try {
    const viewportId = findTestId(app, "daw-perf-viewport").id
    const effectsId = findTestId(app, "effects-panel").id
    scrollElement(app, viewportId, -320, -260)
    scrollElement(app, effectsId, -540, 0)
    const gainId = findCustomProps(app, { role: "slider", "aria-label": "Gain" }).id

    const initialSourceBytes = eqSourceLength(app)
    const values: number[] = []
    for (let index = 0; index < WARMUP + SAMPLES; index += 1) {
      const elapsed = await sampleAsync(async () => {
        pressKey(app, gainId, "PageUp")
        await drawEqFrame(app)
        pressKey(app, gainId, "PageDown")
        await drawEqFrame(app)
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
