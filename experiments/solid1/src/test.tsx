import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestRoot,
  hasNativeTestRenderer,
} from "gpuix-solid1-experiment"
import { Solid1CompatibilityLab } from "./app"

const screenshotPath = "/tmp/gpuix-solid1-compatibility.png"

if (!hasNativeTestRenderer) {
  console.log("solid1 compatibility: native TestGpuixRenderer unavailable; skipped")
  process.exit(0)
}

if (existsSync(screenshotPath)) unlinkSync(screenshotPath)
const testRoot = createTestRoot()
testRoot.render(() => <Solid1CompatibilityLab />)

try {
  const { renderer } = testRoot
  assert.equal(renderer.textContent("runtime-version"), "solid-js 1.9.15 → shared GPUI host kernel")
  assert.equal(renderer.textContent("count-value"), "0")

  renderer.clickTestId("increment")
  renderer.clickTestId("increment")
  assert.equal(renderer.textContent("count-value"), "2")

  renderer.typeTestId("name-input", "Ada")
  assert.equal(renderer.textContent("greeting"), "Hello Ada")

  assert.equal(renderer.hasTestId("details-panel"), false)
  renderer.clickTestId("toggle-details")
  assert.equal(renderer.hasTestId("details-panel"), true)
  renderer.clickTestId("toggle-details")
  assert.equal(renderer.hasTestId("details-panel"), false)

  renderer.clickTestId("prepend-delta")
  assert.equal(renderer.textContent("item-list"), "DeltaAlphaBetaGamma")
  renderer.clickTestId("rotate-items")
  assert.equal(renderer.textContent("item-list"), "AlphaBetaGammaDelta")

  renderer.captureScreenshot(screenshotPath)
  assert.equal(existsSync(screenshotPath), true)
  assert.ok(statSync(screenshotPath).size > 0)

  console.log("solid1 compatibility: passed")
} finally {
  testRoot.unmount()
}
