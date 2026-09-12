import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { adaptBatchRenderer, type BatchRendererApi } from "../src/batch-renderer-adapter.js"

const solid1PointerLifecycle = readFileSync(
  fileURLToPath(new URL("../src/host/pointer-lifecycle.ts", import.meta.url)),
  "utf8",
)
const solid2PointerLifecycle = readFileSync(
  fileURLToPath(new URL("../../solid/src/host/pointer-lifecycle.ts", import.meta.url)),
  "utf8",
)
assert.equal(
  solid1PointerLifecycle,
  solid2PointerLifecycle,
  "Solid 1 and Solid 2 pointer lifecycle implementations must remain byte-identical",
)

const batches: unknown[] = []
const renderer: BatchRendererApi = {
  applyBatch(json) {
    const parsed: unknown = JSON.parse(json)
    batches.push(parsed)
    return []
  },
}
const adapted = adaptBatchRenderer(renderer)

adapted.applyBatch?.(JSON.stringify([
  ["setEventListener", 7, "mouseDown", true],
]))
assert.deepEqual(batches, [[
  ["setEventListener", 7, "mouseDown", true],
  ["setEventListener", 7, "mouseUp", true],
]])

batches.length = 0
adapted.applyBatch?.(JSON.stringify([
  ["setEventListener", 7, "mouseMove", true],
  ["setEventListener", 7, "mouseDown", false],
]))
assert.deepEqual(batches, [[
  ["setEventListener", 7, "mouseMove", true],
  ["setEventListener", 7, "mouseDown", false],
  ["setEventListener", 7, "mouseUp", false],
]])

batches.length = 0
adapted.applyBatch?.(JSON.stringify([
  ["setEventListener", 7, "mouseMove", false],
]))
assert.deepEqual(batches, [[
  ["setEventListener", 7, "mouseMove", false],
]])

console.log("solid1 browser drag native relay compatibility: passed")