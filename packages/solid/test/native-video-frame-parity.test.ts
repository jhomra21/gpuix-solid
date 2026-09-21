import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createElement, setProp } from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

function screenshotPath(name: string): string {
  const file = path.join(os.tmpdir(), `gpuix-solid-video-frame-${name}.png`)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return file
}

function solidBgraFrame(width: number, height: number, blue: number, green: number, red: number) {
  const data = new Uint8Array(width * height * 4)
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = blue
    data[offset + 1] = green
    data[offset + 2] = red
    data[offset + 3] = 255
  }
  return { data, width, height }
}

describe("native video-frame source-edge parity", () => {
  nativeIt("uploads BGRA pixels outside the JSON mutation wire and repaints replacements", () => {
    const testRoot = createTestRoot(240, 160)
    expect(testRoot.renderer.getVideoFrameSurfaceVersion()).toBe(1)

    const surface = createElement("video-frame")
    if (surface.kind !== "element") throw new Error("video-frame host did not create an element node")

    setProp(surface, "style", {
      width: 160,
      height: 100,
    })
    setProp(surface, "objectFit", "fill")
    setProp(surface, "alt", "decoded frame")
    setProp(surface, "frame", solidBgraFrame(64, 40, 0, 0, 255))

    testRoot.render(() => surface)
    testRoot.renderer.flush()

    expect(testRoot.renderer.findByType("video-frame")).toHaveLength(1)
    expect(surface.props.has("frame")).toBe(false)

    const redPath = screenshotPath("red")
    testRoot.renderer.captureScreenshot(redPath)
    const red = fs.readFileSync(redPath)
    expect(red.byteLength).toBeGreaterThan(0)

    setProp(surface, "frame", solidBgraFrame(64, 40, 255, 0, 0))
    testRoot.renderer.flush()

    const bluePath = screenshotPath("blue")
    testRoot.renderer.captureScreenshot(bluePath)
    const blue = fs.readFileSync(bluePath)
    expect(blue.byteLength).toBeGreaterThan(0)
    expect(blue.equals(red)).toBe(false)

    setProp(surface, "frame", null)
    testRoot.renderer.flush()

    const clearedPath = screenshotPath("cleared")
    testRoot.renderer.captureScreenshot(clearedPath)
    const cleared = fs.readFileSync(clearedPath)
    expect(cleared.byteLength).toBeGreaterThan(0)
    expect(cleared.equals(blue)).toBe(false)

    testRoot.unmount()
  })
})
