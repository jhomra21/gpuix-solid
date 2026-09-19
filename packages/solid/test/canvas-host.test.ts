import { describe, expect, it } from "vitest"
import { CANVAS_DRAW_LIST_VERSION, type CanvasDrawList } from "../src/host/canvas.js"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  insertHostNode,
  setHostProperty,
} from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

function fixture(canvasVersion?: number) {
  const renderer = new FakeRenderer()
  renderer.canvasDrawListVersion = canvasVersion
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const root = new HostRootNode(renderer, events, driver)
  const canvas = createHostElement("canvas")
  insertHostNode(root, canvas)
  driver.flush()
  return { renderer, driver, canvas }
}

async function nextCanvasBatch(renderer: FakeRenderer): Promise<CanvasDrawList> {
  await Promise.resolve()
  const operation = renderer.batches
    .flat()
    .findLast((entry) => entry[0] === "setCustomProp" && entry[2] === "drawList")
  if (!operation) throw new Error("Canvas draw-list mutation was not emitted")
  return operation[3] as CanvasDrawList
}

describe("Canvas host integration", () => {
  it("keeps published GPUIX feature detection honest when Canvas is unavailable", () => {
    const { renderer, canvas } = fixture()

    expect(canvas.getContext("2d")).toBeNull()
    expect(renderer.batches.flat()).not.toContainEqual(
      expect.arrayContaining(["setCustomProp", canvas.id, "drawList"]),
    )
  })

  it("returns a Canvas2D context only for the matching native protocol", async () => {
    const { renderer, canvas } = fixture(CANVAS_DRAW_LIST_VERSION)

    const context = canvas.getContext("2d")
    expect(context).not.toBeNull()
    expect(canvas.getContext("webgl")).toBeNull()

    context!.fillStyle = "#ff00aa"
    context!.fillRect(2, 3, 20, 10)

    const drawList = await nextCanvasBatch(renderer)
    expect(drawList).toMatchObject({
      version: CANVAS_DRAW_LIST_VERSION,
      width: 300,
      height: 150,
      commands: [{ op: "fillPath", color: "#ff00aa" }],
    })
  })

  it("uses canvas width and height as backing-store dimensions", async () => {
    const { renderer, driver, canvas } = fixture(CANVAS_DRAW_LIST_VERSION)
    setHostProperty(canvas, "width", 640)
    setHostProperty(canvas, "height", 360)
    driver.flush()

    const context = canvas.getContext("2d")
    context!.fillRect(0, 0, 10, 10)
    let drawList = await nextCanvasBatch(renderer)
    expect(drawList).toMatchObject({ width: 640, height: 360 })

    canvas.width = 320
    await Promise.resolve()
    drawList = await nextCanvasBatch(renderer)
    expect(drawList).toMatchObject({
      width: 320,
      height: 360,
      commands: [],
    })
  })

  it("rejects a native Canvas protocol version it does not understand", () => {
    const { canvas } = fixture(CANVAS_DRAW_LIST_VERSION + 1)
    expect(canvas.getContext("2d")).toBeNull()
  })
})
