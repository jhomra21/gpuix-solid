import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "@jhomra21/gpuix-solid"
import { CodeImageNativeDemo } from "./app"

const screenshotPath = "/tmp/gpuix-solid-codeimage-native.png"

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
    assert.equal(await app.getByTestId("codeimage-shell").count(), 1)
    assert.equal(await app.getByTestId("preview-filename").textContent(), "native-renderer.tsx")
    assert.equal(await app.getByTestId("theme-label").textContent(), "Tokyo Night")
    assert.equal(await app.getByTestId("padding-value").textContent(), "48px")

    await app.clock.fastForward(400)
    const preview = await app.getByTestId("preview-frame").bounds()
    assert.ok(preview.width > 600)
    assert.ok(preview.height > 400)

    await app.getByTestId("tool-theme").click()
    await app.getByTestId("theme-rose").click()
    assert.equal(await app.getByTestId("theme-label").textContent(), "Rosé Pine")

    await app.getByTestId("tool-frame").click()
    await app.getByTestId("padding-plus").click()
    assert.equal(await app.getByTestId("padding-value").textContent(), "56px")
    await app.getByTestId("chrome-compact").click()

    await app.getByTestId("filename-input").fill("solid2-native.tsx")
    assert.equal(await app.getByTestId("preview-filename").textContent(), "solid2-native.tsx")

    await app.getByTestId("tool-code").click()
    assert.equal(await app.getByTestId("line-number-1").count(), 1)
    await app.getByTestId("toggle-line-numbers").click()
    assert.equal(await app.getByTestId("line-number-1").count(), 0)
    await app.getByTestId("font-size-plus").click()
    assert.equal(await app.getByTestId("font-size-value").textContent(), "14px")

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
