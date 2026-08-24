import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "@jhomra21/gpuix-solid"
import { SolidStartDevtoolsNativeDemo } from "./app"

const screenshotPath = "/tmp/gpuix-solid-solid-start-devtools-native.png"

async function requireTestId(app: ReturnType<typeof createTestApp>, testId: string): Promise<void> {
  assert.equal(await app.getByTestId(testId).count(), 1, `expected ${testId} to exist exactly once`)
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("solid-start-devtools integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const testRoot = createTestRoot()
  testRoot.renderer.clockPause()
  testRoot.render(() => <SolidStartDevtoolsNativeDemo />)
  const app = createTestApp(testRoot.renderer)

  try {
    await requireTestId(app, "solid-start-devtools-shell")
    assert.equal(await app.getByTestId("visible-count").textContent(), "4 calls detected")
    assert.equal(await app.getByTestId("detail-name").textContent(), "getProjects")

    await app.getByTestId("call-fn-004").click()
    assert.equal(await app.getByTestId("detail-name").textContent(), "publishPreview")

    await app.getByTestId("tab-response").click()
    assert.match(await app.getByTestId("detail-body").textContent(), /Preview already exists/)

    await app.getByTestId("headers-toggle").click()
    assert.equal(await app.getByTestId("headers-table").count(), 0)
    await app.getByTestId("headers-toggle").click()
    assert.equal(await app.getByTestId("headers-table").count(), 1)

    await app.getByTestId("information-toggle").click()
    assert.match(await app.getByText("86 ms").textContent(), /86 ms/)

    await app.getByTestId("filter-post").click()
    assert.equal(await app.getByTestId("visible-count").textContent(), "2 calls detected")

    await app.getByTestId("function-search").fill("save")
    assert.equal(await app.getByTestId("visible-count").textContent(), "1 calls detected")
    await requireTestId(app, "call-fn-002")

    await app.getByTestId("toolbar-errors").click()
    await requireTestId(app, "errors-panel")
    assert.equal(await app.getByTestId("error-title").textContent(), "Route data warning")
    await app.getByTestId("error-2").click()
    assert.equal(await app.getByTestId("error-title").textContent(), "Server function rejected")

    await app.clock.fastForward(350)
    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    await app.getByTestId("clear-errors").click()
    await requireTestId(app, "errors-empty")

    await app.getByTestId("toolbar-functions").click()
    await requireTestId(app, "functions-panel")

    console.log("solid-start-devtools integration: passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
