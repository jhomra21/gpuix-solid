import { existsSync, statSync, unlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CANVAS_DRAW_LIST_VERSION } from "../src/host/canvas.js"
import {
  createElement,
  setProp,
} from "../src/host/universal.js"
import {
  createTestRoot,
  hasNativeTestRenderer,
} from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip
const SCREENSHOT_PATH = join(tmpdir(), "gpuix-solid-native-canvas.png")

function cleanScreenshot(): void {
  if (existsSync(SCREENSHOT_PATH)) unlinkSync(SCREENSHOT_PATH)
}

describe("native Canvas2D source-edge parity", () => {
  nativeIt("paints a retained draw list and preserves pointer continuity", async () => {
    const testRoot = createTestRoot(320, 200)
    expect(testRoot.renderer.getCanvasDrawListVersion()).toBe(CANVAS_DRAW_LIST_VERSION)

    const pointerEvents: string[] = []
    const canvas = createElement("canvas")
    setProp(canvas, "width", 240)
    setProp(canvas, "height", 140)
    setProp(canvas, "style", {
      width: 240,
      height: 140,
      backgroundColor: "#10141e",
    })
    setProp(canvas, "onPointerDown", () => pointerEvents.push("down"))
    setProp(canvas, "onPointerMove", () => pointerEvents.push("move"))
    setProp(canvas, "onPointerUp", () => pointerEvents.push("up"))

    testRoot.render(() => canvas)
    testRoot.renderer.flush()

    const context = canvas.getContext("2d")
    expect(context).not.toBeNull()
    if (!context) throw new Error("source-edge Canvas2D context was not available")

    context.fillStyle = "#2f81f7"
    context.fillRect(12, 12, 80, 44)

    context.fillStyle = "#f2cc60"
    context.beginPath()
    context.moveTo(120, 18)
    context.lineTo(176, 58)
    context.lineTo(114, 78)
    context.closePath()
    context.fill()

    context.fillStyle = "#3fb950"
    context.beginPath()
    context.arc(196, 96, 22, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = "#ffffff"
    context.font = "600 16px Arial"
    context.fillText("GPUix", 18, 116)

    await Promise.resolve()
    testRoot.renderer.flush()

    expect(testRoot.renderer.findByType("canvas")[0]?.customProps?.drawList).toMatchObject({
      version: CANVAS_DRAW_LIST_VERSION,
      width: 240,
      height: 140,
      commands: [
        { op: "fillPath", color: "#2f81f7" },
        { op: "fillPath", color: "#f2cc60" },
        { op: "fillPath", color: "#3fb950" },
        { op: "fillText", text: "GPUix", fontFamily: "Arial" },
      ],
    })

    const bounds = testRoot.renderer.getElementBounds(canvas.id)
    expect(bounds).not.toBeNull()
    const x = bounds?.[0] ?? 0
    const y = bounds?.[1] ?? 0
    const width = bounds?.[2] ?? 0
    const height = bounds?.[3] ?? 0
    expect(width).toBeGreaterThan(200)
    expect(height).toBeGreaterThan(100)

    testRoot.renderer.nativeSimulateMouseDown(x + 20, y + 20)
    testRoot.renderer.nativeSimulateMouseMove(x + width + 24, y + height + 18, 0)
    testRoot.renderer.nativeSimulateMouseUp(x + width + 24, y + height + 18)
    expect(pointerEvents).toEqual(["down", "move", "up"])

    cleanScreenshot()
    testRoot.renderer.captureScreenshot(SCREENSHOT_PATH)
    expect(existsSync(SCREENSHOT_PATH)).toBe(true)
    expect(statSync(SCREENSHOT_PATH).size).toBeGreaterThan(0)

    testRoot.unmount()
  })
})
