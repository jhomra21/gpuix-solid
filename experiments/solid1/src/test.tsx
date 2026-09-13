import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import { For, Show, createSignal } from "solid-js"
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
  const [localReleases, setLocalReleases] = createSignal(0)
  const [globalReleases, setGlobalReleases] = createSignal(0)

  const beginDrag = () => {
    setDragging(true)
    setRemounted(false)

    const handleMove = () => {
      if (remounted()) return
      setRemounted(true)
      setGeneration((value) => value + 1)
    }
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      setDragging(false)
      setGlobalReleases((value) => value + 1)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  return (
    <div style={{ width: 320, height: 120, padding: 12, position: "relative" }}>
      <For each={[generation()]}>
        {(currentGeneration) => (
          <div
            testId="pointer-release-target"
            onPointerDown={beginDrag}
            onPointerUp={() => setLocalReleases((value) => value + 1)}
            style={{
              width: 240,
              height: 64,
              marginLeft: currentGeneration * 40,
              backgroundColor: "#202533",
            }}
          >
            <text>{`Pointer target ${currentGeneration}`}</text>
          </div>
        )}
      </For>
      <Show when={dragging()}>
        <div
          testId="pointer-drag-overlay"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
      </Show>
      <text testId="pointer-generation">{generation()}</text>
      <text testId="pointer-local-release-count">{localReleases()}</text>
      <text testId="pointer-global-release-count">{globalReleases()}</text>
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
  assert.equal(renderer.textContent("pointer-generation"), "1", "window pointer-move should replace the pressed retained target")
  assert.equal(
    renderer.textContent("pointer-global-release-count"),
    "1",
    "window pointer-up should survive replacement of the pressed retained target",
  )
  assert.equal(
    renderer.hasTestId("pointer-drag-overlay"),
    false,
    "window pointer-up should clear drag UI after the pressed retained target remounts",
  )

  const localReleasesAfterDrag = Number(renderer.textContent("pointer-local-release-count"))
  renderer.clickCenterTestId("pointer-release-target")
  assert.equal(
    Number(renderer.textContent("pointer-local-release-count")),
    localReleasesAfterDrag + 1,
    "stationary click after a drag/remount should deliver exactly one local pointer-up",
  )

  console.log("solid1 post-remount pointer release: passed")
} finally {
  pointerRoot.unmount()
}