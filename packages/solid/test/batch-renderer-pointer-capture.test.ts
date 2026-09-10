import { describe, expect, it } from "vitest"
import { adaptBatchRenderer, type BatchRendererApi } from "../src/batch-renderer-adapter.js"

type WireMutation = readonly unknown[]

function recorder() {
  const batches: WireMutation[][] = []
  const renderer: BatchRendererApi = {
    applyBatch(json) {
      batches.push(JSON.parse(json) as WireMutation[])
      return []
    },
  }
  return { adapted: adaptBatchRenderer(renderer), batches }
}

function flattened(batches: WireMutation[][]): WireMutation[] {
  return batches.flat()
}

describe("batch renderer browser drag capture bridge", () => {
  it("arms native move/up when a pressed node only declares mouseDown", () => {
    const { adapted, batches } = recorder()

    adapted.applyBatch?.(JSON.stringify([
      ["setEventListener", 7, "mouseDown", true],
    ]))

    expect(flattened(batches)).toEqual([
      ["setEventListener", 7, "mouseDown", true],
      ["setEventListener", 7, "mouseMove", true],
      ["setEventListener", 7, "mouseUp", true],
    ])
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

    expect(flattened(batches)).toEqual([
      ["setEventListener", 9, "mouseDown", false],
      ["setEventListener", 9, "mouseUp", false],
    ])
  })

  it("clears listener bookkeeping when the native element is destroyed", () => {
    const { adapted, batches } = recorder()

    adapted.applyBatch?.(JSON.stringify([
      ["setEventListener", 11, "mouseDown", true],
      ["destroyElement", 11],
      ["setEventListener", 11, "mouseMove", true],
    ]))

    expect(flattened(batches).slice(-2)).toEqual([
      ["destroyElement", 11],
      ["setEventListener", 11, "mouseMove", true],
    ])
  })
})
