import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { createRoot, type NativeRenderer } from "gpuix-solid"
import { ChatApp } from "../chat/shell"
import { median } from "./stats"

type Op = unknown[]

class CaptureRenderer implements NativeRenderer {
  readonly ops: Op[] = []

  applyBatch(json: string): number[] {
    this.ops.push(...(JSON.parse(json) as Op[]))
    return []
  }

  createElement(): void {
    throw new Error("CaptureRenderer expected applyBatch for createElement")
  }

  destroyElement(): number[] {
    throw new Error("CaptureRenderer expected applyBatch for destroyElement")
  }

  appendChild(): void {
    throw new Error("CaptureRenderer expected applyBatch for appendChild")
  }

  removeChild(): void {
    throw new Error("CaptureRenderer expected applyBatch for removeChild")
  }

  insertBefore(): void {
    throw new Error("CaptureRenderer expected applyBatch for insertBefore")
  }

  setStyle(): void {
    throw new Error("CaptureRenderer expected applyBatch for setStyle")
  }

  setText(): void {
    throw new Error("CaptureRenderer expected applyBatch for setText")
  }

  setEventListener(): void {
    throw new Error("CaptureRenderer expected applyBatch for setEventListener")
  }

  setRoot(): void {
    throw new Error("CaptureRenderer expected applyBatch for setRoot")
  }

  commitMutations(): void {
    throw new Error("CaptureRenderer expected applyBatch for commitMutations")
  }

  setCustomProp(): void {
    throw new Error("CaptureRenderer expected applyBatch for setCustomProp")
  }

  getWindowSize(): { width: number; height: number } {
    return { width: 1_280, height: 800 }
  }
}

function captureOps(turnCount: number, includeSafeMdx: boolean): Op[] {
  const renderer = new CaptureRenderer()
  const root = createRoot(renderer)
  root.render(() => <ChatApp turnCount={turnCount} includeSafeMdx={includeSafeMdx} />)
  const ops = [...renderer.ops]
  root.unmount()
  return ops
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
  return `{${entries.map(([key, inner]) => `${JSON.stringify(key)}:${canonical(inner)}`).join(",")}}`
}

function internStyles(ops: readonly Op[]): Op[] {
  const ids = new Map<string, number>()
  const output: Op[] = []
  for (const op of ops) {
    if (op[0] !== "setStyle") {
      output.push(op)
      continue
    }
    const key = canonical(op[2])
    let id = ids.get(key)
    if (id === undefined) {
      id = ids.size
      ids.set(key, id)
      output.push(["defineStyle", id, op[2]])
    }
    output.push(["setStyleRef", op[1], id])
  }
  return output
}

function internRepeatedStrings(ops: readonly Op[]): Op[] {
  const styled = internStyles(ops)
  const counts = new Map<string, number>()
  const countStrings = (value: unknown): void => {
    if (typeof value === "string") {
      counts.set(value, (counts.get(value) ?? 0) + 1)
      return
    }
    if (!value || typeof value !== "object") return
    for (const inner of Object.values(value as Record<string, unknown>)) countStrings(inner)
  }
  for (const op of styled) {
    for (const value of op.slice(1)) countStrings(value)
  }

  const ids = new Map<string, number>()
  const table: string[] = []
  const swap = (value: unknown): unknown => {
    if (typeof value === "string") {
      if ((counts.get(value) ?? 0) < 2 || Buffer.byteLength(value) > 256) return value
      let id = ids.get(value)
      if (id === undefined) {
        id = table.length
        ids.set(value, id)
        table.push(value)
      }
      return { $: id }
    }
    if (!value || typeof value !== "object") return value
    if (Array.isArray(value)) return value.map(swap)
    const output: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      output[key] = swap(inner)
    }
    return output
  }

  const body = styled.map((op) => [op[0], ...op.slice(1).map(swap)])
  return [["strings", table], ...body]
}

interface BenchRow {
  label: string
  encodeMs: number
  decodeMs: number
  bytes: number
}

function benchJson(label: string, ops: readonly Op[], iterations: number, asBuffer: boolean): BenchRow {
  const encodeSamples: number[] = []
  const decodeSamples: number[] = []
  let bytes = 0

  for (let index = 0; index < 3; index += 1) {
    const text = JSON.stringify(ops)
    JSON.parse(text)
  }

  for (let index = 0; index < iterations; index += 1) {
    const encodeStarted = performance.now()
    const text = JSON.stringify(ops)
    const payload = asBuffer ? Buffer.from(text, "utf8") : text
    encodeSamples.push(performance.now() - encodeStarted)
    bytes = typeof payload === "string" ? Buffer.byteLength(payload) : payload.byteLength

    const decodeStarted = performance.now()
    JSON.parse(typeof payload === "string" ? payload : payload.toString("utf8"))
    decodeSamples.push(performance.now() - decodeStarted)
  }

  return {
    label,
    encodeMs: median(encodeSamples),
    decodeMs: median(decodeSamples),
    bytes,
  }
}

function inlineStyleInterning(ops: readonly Op[]): string {
  const ids = new Map<string, number>()
  const output: Op[] = []
  for (const op of ops) {
    if (op[0] !== "setStyle") {
      output.push(op)
      continue
    }
    const key = JSON.stringify(op[2])
    let id = ids.get(key)
    if (id === undefined) {
      id = ids.size
      ids.set(key, id)
      output.push(["defineStyle", id, op[2]])
    }
    output.push(["setStyleRef", op[1], id])
  }
  return JSON.stringify(output)
}

function benchInlineInterning(ops: readonly Op[], iterations: number): void {
  const plainSamples: number[] = []
  const internSamples: number[] = []
  let plainBytes = 0
  let internBytes = 0

  for (let index = 0; index < iterations; index += 1) {
    let started = performance.now()
    const plain = JSON.stringify(ops)
    plainSamples.push(performance.now() - started)
    plainBytes = Buffer.byteLength(plain)

    started = performance.now()
    const interned = inlineStyleInterning(ops)
    internSamples.push(performance.now() - started)
    internBytes = Buffer.byteLength(interned)
  }

  console.log("\nInline style interning cost")
  console.log("| path | median JS time | wire bytes |")
  console.log("| --- | ---: | ---: |")
  console.log(`| JSON.stringify(queue) | ${median(plainSamples).toFixed(2)} ms | ${(plainBytes / 1e6).toFixed(2)} MB |`)
  console.log(`| intern styles then stringify | ${median(internSamples).toFixed(2)} ms | ${(internBytes / 1e6).toFixed(2)} MB |`)
}

function main(): void {
  const turns = Number(process.env.TURNS ?? 2_000)
  const iterations = Number(process.env.ITERATIONS ?? 9)
  const safeMdx = process.env.SAFE_MDX === "1"

  console.log(`[serialization] capturing Solid Chat turnCount=${turns} safeMdx=${safeMdx}`)
  const captureStarted = performance.now()
  const ops = captureOps(turns, safeMdx)
  console.log(
    `[serialization] captured ${ops.length.toLocaleString()} ops in ` +
      `${(performance.now() - captureStarted).toFixed(2)}ms ` +
      `(${(ops.length / turns).toFixed(1)} ops/turn)`,
  )

  const fixturePath = resolve("tmp/solid-batch-fixture.json")
  mkdirSync(resolve("tmp"), { recursive: true })
  writeFileSync(fixturePath, JSON.stringify(ops))
  console.log(`[serialization] fixture ${fixturePath}`)

  const styled = internStyles(ops)
  const allInterned = internRepeatedStrings(ops)
  const rows = [
    benchJson("JSON.stringify", ops, iterations, false),
    benchJson("JSON -> utf8 Buffer", ops, iterations, true),
    benchJson("style refs + JSON", styled, iterations, false),
    benchJson("style/string refs + JSON", allInterned, iterations, false),
  ]
  const baseline = rows[0]?.bytes ?? 1

  console.log("\n| path | encode | decode | wire bytes | vs JSON |")
  console.log("| --- | ---: | ---: | ---: | ---: |")
  for (const row of rows) {
    console.log(
      `| ${row.label} | ${row.encodeMs.toFixed(2)} ms | ${row.decodeMs.toFixed(2)} ms | ` +
        `${(row.bytes / 1e6).toFixed(2)} MB | ${(row.bytes / baseline).toFixed(2)}x |`,
    )
  }

  benchInlineInterning(ops, iterations)
  console.log(
    "\nThis is the Solid-side applyBatch workload. Upstream's Rust serde half lives in remorses/gpuix native source, " +
      "so this repository does not pretend to benchmark a Rust decoder it does not own.",
  )
}

main()
