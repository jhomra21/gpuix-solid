import {
  existsSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createRenderEffect, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import {
  createElement,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip
const IMAGE_FIXTURE_PATH = join(tmpdir(), "gpuix-solid-img-fixture.svg")
const SCREENSHOT_PATH = join(tmpdir(), "gpuix-solid-svg-parity.png")

function writeSvgFixture(filePath: string): void {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140">',
    '<rect x="0" y="0" width="240" height="140" fill="#1e2d59"/>',
    '<rect x="16" y="16" width="208" height="108" rx="14" fill="#5ca9ff"/>',
    '<circle cx="68" cy="70" r="24" fill="#ffd166"/>',
    '<rect x="112" y="50" width="88" height="14" rx="7" fill="#20304f"/>',
    '<rect x="112" y="74" width="70" height="12" rx="6" fill="#2a3c61"/>',
    "</svg>",
  ].join("")
  writeFileSync(filePath, svg, "utf8")
}

function removeIfPresent(path: string): void {
  if (existsSync(path)) unlinkSync(path)
}

describe("native img/svg parity", () => {
  nativeIt("forwards img src/objectFit into the real native retained tree", () => {
    writeSvgFixture(IMAGE_FIXTURE_PATH)
    const testRoot = createTestRoot()

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 240 })

      const image = createElement("img")
      setProp(image, "src", IMAGE_FIXTURE_PATH)
      setProp(image, "objectFit", "cover")
      setProp(image, "style", { width: 220, height: 120 })
      insertNode(root, image)
      return root
    })

    const images = testRoot.renderer.findByType("img")
    expect(images).toHaveLength(1)
    expect(images[0]?.customProps?.src).toBe(IMAGE_FIXTURE_PATH)
    expect(images[0]?.customProps?.objectFit).toBe("cover")

    testRoot.unmount()
  })

  nativeIt("reactively updates an svg source and captures the native frame", () => {
    writeSvgFixture(IMAGE_FIXTURE_PATH)
    const testRoot = createTestRoot()
    const [loaded, setLoaded] = createSignal(false)

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", {
        width: 640,
        height: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f111a",
      })
      setProp(root, "onClick", () => setLoaded(true))

      const svg = createElement("svg")
      setProp(svg, "style", { width: 240, height: 140, color: "#5ca9ff" })
      createRenderEffect(
        () => loaded() ? IMAGE_FIXTURE_PATH : "",
        (next, previous) => {
          setProp(svg, "src", next, previous)
        },
      )
      insertNode(root, svg)
      return root
    })

    const svg = testRoot.renderer.findByType("svg")[0]
    expect(svg?.customProps?.src).toBe("")

    testRoot.renderer.nativeSimulateClick(40, 40)
    testRoot.renderer.flush()
    testRoot.renderer.flush()
    expect(testRoot.renderer.findByType("svg")[0]?.customProps?.src).toBe(
      IMAGE_FIXTURE_PATH,
    )

    removeIfPresent(SCREENSHOT_PATH)
    testRoot.renderer.captureScreenshot(SCREENSHOT_PATH)

    expect(existsSync(SCREENSHOT_PATH)).toBe(true)
    expect(statSync(SCREENSHOT_PATH).size).toBeGreaterThan(0)

    testRoot.unmount()
  })
})
