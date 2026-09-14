import { describe, expect, it } from "vitest"
import { adaptBatchRenderer, type BatchRendererApi } from "../src/batch-renderer-adapter.js"

function recorder() {
  const batches: unknown[] = []
  const renderer: BatchRendererApi = {
    applyBatch(json) {
      const parsed: unknown = JSON.parse(json)
      batches.push(parsed)
      return []
    },
  }
  return { adapted: adaptBatchRenderer(renderer), batches }
}

describe("batch renderer browser drag capture bridge", () => {
  it("arms native move/up when a pressed node only declares mouseDown", () => {
    const { adapted, batches } = recorder()

    adapted.applyBatch?.(JSON.stringify([
      ["setEventListener", 7, "mouseDown", true],
    ]))

    expect(batches).toEqual([[
      ["setEventListener", 7, "mouseDown", true],
      ["setEventListener", 7, "mouseMove", true],
      ["setEventListener", 7, "mouseUp", true],
    ]])
  })

  it("preserves an explicitly requested move handler when mouseDown is removed", () => {
    const { adapted, batches } = recorder()

    adapted.applyBatch?.(JSON.stringify([
      ["setEventListener", 9, "mouseDown", true],
      ["setEventListener", 9, "mouseMove", true],
    ]))
    batches.length = 0

    adapted.applyBatch?.(JSON.stringify([
      ["setEventListener", 9, "mouseDown", false],
    ]))

    expect(batches).toEqual([[
      ["setEventListener", 9, "mouseDown", false],
      ["setEventListener", 9, "mouseUp", false],
    ]])
  })

  it("clears listener bookkeeping when the native element is destroyed", () => {
    const { adapted, batches } = recorder()

    adapted.applyBatch?.(JSON.stringify([
      ["setEventListener", 11, "mouseDown", true],
      ["destroyElement", 11],
      ["setEventListener", 11, "mouseMove", true],
    ]))

    expect(batches).toEqual([[
      ["setEventListener", 11, "mouseDown", true],
      ["setEventListener", 11, "mouseMove", true],
      ["setEventListener", 11, "mouseUp", true],
      ["destroyElement", 11],
      ["setEventListener", 11, "mouseMove", true],
    ]])
  })
})
