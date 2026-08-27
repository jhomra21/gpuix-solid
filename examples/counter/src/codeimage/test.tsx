import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
  type TestRenderer,
} from "gpuix-solid"
import { CodeImageNativeDemo } from "./app"

const screenshotPath = "/tmp/gpuix-solid-codeimage-native.png"

async function requireTestId(app: ReturnType<typeof createTestApp>, testId: string): Promise<void> {
  assert.equal(await app.getByTestId(testId).count(), 1, `expected ${testId} to exist exactly once`)
}

async function pointerClick(
  app: ReturnType<typeof createTestApp>,
  renderer: TestRenderer,
  testId: string,
): Promise<void> {
  const bounds = await app.getByTestId(testId).bounds()
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  renderer.nativeSimulateMouseMove(x, y)
  renderer.nativeSimulateClick(x, y)
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("codeimage integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const testRoot = createTestRoot()
  testRoot.renderer.clockPause()
  testRoot.render(() => <CodeImageNativeDemo />)
  const app = createTestApp(testRoot.renderer)

  try {
    await requireTestId(app, "codeimage-shell")
    assert.equal(await app.getByTestId("preview-filename").textContent(), "native-renderer.tsx")
    assert.equal(await app.getByTestId("theme-label").textContent(), "Tokyo Night")
    assert.equal(await app.getByTestId("padding-value").textContent(), "48px")

    await app.clock.fastForward(400)
    const preview = await app.getByTestId("preview-frame").bounds()
    assert.ok(preview.width > 600)
    assert.ok(preview.height > 400)

    await requireTestId(app, "tool-theme")
    await pointerClick(app, testRoot.renderer, "tool-theme")
    await requireTestId(app, "theme-rose")
    await app.getByTestId("theme-rose").click()
    assert.equal(await app.getByTestId("theme-label").textContent(), "Rosé Pine")

    await requireTestId(app, "tool-frame")
    await pointerClick(app, testRoot.renderer, "tool-frame")
    await requireTestId(app, "padding-plus")
    await app.getByTestId("padding-plus").click()
    assert.equal(await app.getByTestId("padding-value").textContent(), "56px")
    await requireTestId(app, "chrome-compact")
    await app.getByTestId("chrome-compact").click()

    await requireTestId(app, "filename-input")
    await app.getByTestId("filename-input").fill("solid2-native.tsx")
    assert.equal(await app.getByTestId("preview-filename").textContent(), "solid2-native.tsx")

    await requireTestId(app, "tool-code")
    await pointerClick(app, testRoot.renderer, "tool-code")
    await requireTestId(app, "line-number-1")
    await requireTestId(app, "toggle-line-numbers")
    await app.getByTestId("toggle-line-numbers").click()
    assert.equal(await app.getByTestId("line-number-1").count(), 0)
    await requireTestId(app, "font-size-plus")
    await app.getByTestId("font-size-plus").click()
    assert.equal(await app.getByTestId("font-size-value").textContent(), "14px")

    await requireTestId(app, "export-button")
    await app.getByTestId("export-button").click()
    assert.match(await app.getByTestId("export-status").textContent(), /Exported 1 preview/)

    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    console.log("codeimage integration: passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
