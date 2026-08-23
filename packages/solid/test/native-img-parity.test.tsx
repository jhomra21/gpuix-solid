import {
  existsSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip
const IMAGE_FIXTURE_PATH = "/tmp/gpuix-solid-img-fixture.svg"

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

    testRoot.render(() => (
      <div style={{ width: 400, height: 240 }}>
        <img
          src={IMAGE_FIXTURE_PATH}
          objectFit="cover"
          style={{ width: 220, height: 120 }}
        />
      </div>
    ))

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

    testRoot.render(() => (
      <div
        style={{
          width: 640,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f111a",
        }}
        onClick={() => setLoaded(true)}
      >
        <svg
          src={loaded() ? IMAGE_FIXTURE_PATH : ""}
          style={{ width: 240, height: 140, color: "#5ca9ff" }}
        />
      </div>
    ))

    const svg = testRoot.renderer.findByType("svg")[0]
    expect(svg?.customProps?.src).toBe("")

    testRoot.renderer.nativeSimulateClick(40, 40)
    testRoot.renderer.flush()
    testRoot.renderer.flush()
    expect(testRoot.renderer.findByType("svg")[0]?.customProps?.src).toBe(
      IMAGE_FIXTURE_PATH,
    )

    const screenshotPath = "/tmp/gpuix-solid-svg-parity.png"
    removeIfPresent(screenshotPath)
    testRoot.renderer.captureScreenshot(screenshotPath)

    expect(existsSync(screenshotPath)).toBe(true)
    expect(statSync(screenshotPath).size).toBeGreaterThan(0)

    testRoot.unmount()
  })
})
