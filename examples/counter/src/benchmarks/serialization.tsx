import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { createRoot, type NativeRenderer } from "gpuix-solid"
import { ChatApp } from "../chat/shell"
import { median } from "./stats"

type JsonPrimitive = string | number | boolean | null
interface JsonObject {
  [key: string]: JsonValue
}
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
type Op = JsonValue[]

function parseMutationBatch(json: string): Op[] {
  // JSON.parse can only produce JSON values. MutationDriver sends a top-level
  // array whose entries are mutation tuple arrays, so validate those two
  // structural boundaries before the benchmark owns the result.
  const parsed: JsonValue = JSON.parse(json)
  if (!Array.isArray(parsed) || !parsed.every(Array.isArray)) {
    throw new Error("Expected an applyBatch mutation array")
  }
  return parsed
}

class CaptureRenderer implements NativeRenderer {
  readonly ops: Op[] = []

  applyBatch(json: string): number[] {
    this.ops.push(...parseMutationBatch(json))
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

  getWindowSize() {
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

function quote(value: string): string {
  const encoded = JSON.stringify(value)
  if (encoded === undefined) throw new Error("JSON string encoding returned undefined")
  return encoded
}

function canonical(value: JsonValue): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (typeof value === "string") return quote(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${quote(key)}:${canonical(value[key] ?? null)}`).join(",")}}`
}

function at(op: readonly JsonValue[], index: number): JsonValue {
  return op[index] ?? null
}

function internStyles(ops: readonly Op[]): Op[] {
  const ids = new Map<string, number>()
  const output: Op[] = []
  for (const op of ops) {
    if (op[0] !== "setStyle") {
      output.push(op)
      continue
    }
    const style = at(op, 2)
    const key = canonical(style)
    let id = ids.get(key)
    if (id === undefined) {
      id = ids.size
      ids.set(key, id)
      output.push(["defineStyle", id, style])
    }
    output.push(["setStyleRef", at(op, 1), id])
  }
  return output
}

function countStrings(value: JsonValue, counts: Map<string, number>): void {
  if (typeof value === "string") {
    counts.set(value, (counts.get(value) ?? 0) + 1)
    return
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return
  if (Array.isArray(value)) {
    for (const inner of value) countStrings(inner, counts)
    return
  }
  for (const key of Object.keys(value)) countStrings(value[key] ?? null, counts)
}

interface StringTable {
  ids: Map<string, number>
  values: string[]
}

function swapRepeatedString(
  value: JsonValue,
  counts: ReadonlyMap<string, number>,
  table: StringTable,
): JsonValue {
  if (typeof value === "string") {
    if ((counts.get(value) ?? 0) < 2 || Buffer.byteLength(value) > 256) return value
    let id = table.ids.get(value)
    if (id === undefined) {
      id = table.values.length
      table.ids.set(value, id)
      table.values.push(value)
    }
    return { $: id }
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) {
    return value.map((inner) => swapRepeatedString(inner, counts, table))
  }

  const output: JsonObject = {}
  for (const key of Object.keys(value)) {
    output[key] = swapRepeatedString(value[key] ?? null, counts, table)
  }
  return output
}

function internRepeatedStrings(ops: readonly Op[]): Op[] {
  const styled = internStyles(ops)
  const counts = new Map<string, number>()
  for (const op of styled) {
    for (const value of op.slice(1)) countStrings(value, counts)
  }

  const table: StringTable = { ids: new Map<string, number>(), values: [] }
  const body = styled.map((op) =>
    op.map((value, index) =>
      index === 0 ? value : swapRepeatedString(value, counts, table),
    ),
  )
  return [["strings", table.values], ...body]
}

interface BenchRow {
  label: string
  encodeMs: number
  decodeMs: number
  bytes: number
}

function warmJson(ops: readonly Op[]): void {
  for (let index = 0; index < 3; index += 1) {
    const text = JSON.stringify(ops)
    JSON.parse(text)
  }
}

function benchJsonString(label: string, ops: readonly Op[], iterations: number): BenchRow {
  warmJson(ops)
  const encodeSamples: number[] = []
  const decodeSamples: number[] = []
  let bytes = 0

  for (let index = 0; index < iterations; index += 1) {
    const encodeStarted = performance.now()
    const payload = JSON.stringify(ops)
    encodeSamples.push(performance.now() - encodeStarted)
    bytes = Buffer.byteLength(payload)

    const decodeStarted = performance.now()
    JSON.parse(payload)
    decodeSamples.push(performance.now() - decodeStarted)
  }

  return {
    label,
    encodeMs: median(encodeSamples),
    decodeMs: median(decodeSamples),
    bytes,
  }
}

function benchJsonBuffer(label: string, ops: readonly Op[], iterations: number): BenchRow {
  warmJson(ops)
  const encodeSamples: number[] = []
  const decodeSamples: number[] = []
  let bytes = 0

  for (let index = 0; index < iterations; index += 1) {
    const encodeStarted = performance.now()
    const payload = Buffer.from(JSON.stringify(ops), "utf8")
    encodeSamples.push(performance.now() - encodeStarted)
    bytes = payload.byteLength

    const decodeStarted = performance.now()
    JSON.parse(payload.toString("utf8"))
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
    const style = at(op, 2)
    const key = JSON.stringify(style)
    let id = ids.get(key)
    if (id === undefined) {
      id = ids.size
      ids.set(key, id)
      output.push(["defineStyle", id, style])
    }
    output.push(["setStyleRef", at(op, 1), id])
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
    benchJsonString("JSON.stringify", ops, iterations),
    benchJsonBuffer("JSON -> utf8 Buffer", ops, iterations),
    benchJsonString("style refs + JSON", styled, iterations),
    benchJsonString("style/string refs + JSON", allInterned, iterations),
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
      "so this repository does not claim a Rust decoder benchmark it does not own.",
  )
}

main()
