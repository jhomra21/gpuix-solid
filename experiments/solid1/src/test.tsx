import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import { For, createSignal } from "solid-js"
import {
  createTestRoot,
  hasNativeTestRenderer,
} from "@jhomra21/gpuix-solid1"
import { Solid1CompatibilityLab } from "./app"

const screenshotPath = "/tmp/gpuix-solid1-compatibility.png"

function PointerReleaseRecoveryFixture() {
  const [generation, setGeneration] = createSignal(0)
  const [dragging, setDragging] = createSignal(false)
  const [remounted, setRemounted] = createSignal(false)
  const [releases, setReleases] = createSignal(0)

  return (
    <div style={{ width: 320, height: 120, padding: 12 }}>
      <For each={[generation()]}>
        {(currentGeneration) => (
          <div
            testId="pointer-release-target"
            onPointerDown={() => setDragging(true)}
            onPointerMove={() => {
              if (!dragging() || remounted()) return
              setRemounted(true)
              setGeneration((value) => value + 1)
            }}
            onPointerUp={() => {
              setDragging(false)
              setReleases((value) => value + 1)
            }}
            onPointerCancel={() => setDragging(false)}
            style={{ width: 240, height: 64, backgroundColor: "#202533" }}
          >
            <text>{`Pointer target ${currentGeneration}`}</text>
          </div>
        )}
      </For>
      <text testId="pointer-generation">{generation()}</text>
      <text testId="pointer-release-count">{releases()}</text>
    </div>
  )
}

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

const pointerRoot = createTestRoot(360, 160)
pointerRoot.render(() => <PointerReleaseRecoveryFixture />)
try {
  const { renderer } = pointerRoot
  renderer.dragTestId("pointer-release-target", 40, 0)
  assert.equal(renderer.textContent("pointer-generation"), "1", "drag should replace the pressed retained target")
  const releasesAfterRemountDrag = Number(renderer.textContent("pointer-release-count"))

  renderer.clickCenterTestId("pointer-release-target")
  assert.equal(
    Number(renderer.textContent("pointer-release-count")),
    releasesAfterRemountDrag + 1,
    "stationary click after a drag/remount should deliver exactly one local pointer-up",
  )

  console.log("solid1 post-remount pointer release: passed")
} finally {
  pointerRoot.unmount()
}
