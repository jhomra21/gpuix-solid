import assert from "node:assert/strict"
import { adaptBatchRenderer, type BatchRendererApi } from "../src/batch-renderer-adapter.js"

type WireMutation = readonly unknown[]

const batches: WireMutation[][] = []
const renderer: BatchRendererApi = {
  applyBatch(json) {
    batches.push(JSON.parse(json) as WireMutation[])
    return []
  },
}
const adapted = adaptBatchRenderer(renderer)

adapted.applyBatch?.(JSON.stringify([
  ["setEventListener", 7, "mouseDown", true],
]))
assert.deepEqual(batches.flat(), [
  ["setEventListener", 7, "mouseDown", true],
  ["setEventListener", 7, "mouseMove", true],
  ["setEventListener", 7, "mouseUp", true],
])

batches.length = 0
adapted.applyBatch?.(JSON.stringify([
  ["setEventListener", 7, "mouseMove", true],
  ["setEventListener", 7, "mouseDown", false],
]))
assert.deepEqual(batches.flat(), [
  ["setEventListener", 7, "mouseDown", false],
  ["setEventListener", 7, "mouseUp", false],
])

batches.length = 0
adapted.applyBatch?.(JSON.stringify([
  ["setEventListener", 7, "mouseMove", false],
]))
assert.deepEqual(batches.flat(), [
  ["setEventListener", 7, "mouseMove", false],
])

console.log("solid1 browser drag native capture compatibility: passed")
