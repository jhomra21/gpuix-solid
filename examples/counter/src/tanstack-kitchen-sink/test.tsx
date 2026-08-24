import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "@jhomra21/gpuix-solid"
import { TanStackKitchenSinkNative } from "./app"

const screenshotPath = "/tmp/gpuix-solid-tanstack-kitchen-sink.png"

async function requireTestId(app: ReturnType<typeof createTestApp>, testId: string): Promise<void> {
  assert.equal(await app.getByTestId(testId).count(), 1, `expected ${testId} to exist exactly once`)
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("tanstack kitchen sink integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const testRoot = createTestRoot()
  testRoot.renderer.clockPause()
  testRoot.render(() => <TanStackKitchenSinkNative />)
  const app = createTestApp(testRoot.renderer)

  try {
    await requireTestId(app, "tanstack-kitchen-sink")
    await requireTestId(app, "page-dashboard")
    assert.equal(await app.getByTestId("invoice-count").textContent(), "10 total invoices.")

    await app.getByTestId("dashboard-tab-invoices").click()
    await requireTestId(app, "invoice-workspace")
    await requireTestId(app, "invoice-row-3")
    await requireTestId(app, "invoice-detail-panel")

    await app.getByTestId("edit-title").fill("Solid 2 native invoice")
    await app.getByTestId("toggle-invoice-notes").click()
    await requireTestId(app, "invoice-notes")
    await app.getByTestId("invoice-notes").fill("Notes persisted in native route-shaped state")
    await app.getByTestId("save-invoice").click()
    assert.equal(await app.getByText("Saved!").count(), 1)

    await app.getByTestId("create-invoice-nav").click()
    await requireTestId(app, "invoice-create-panel")
    await app.getByTestId("create-title").fill("Eleventh invoice")
    await app.getByTestId("create-body").fill("Created from the GPUIX Solid 2 kitchen sink port")
    await app.getByTestId("create-invoice-submit").click()
    await requireTestId(app, "invoice-row-11")

    await app.getByTestId("dashboard-tab-users").click()
    await requireTestId(app, "users-workspace")
    await app.getByTestId("users-filter").fill("Clementine")
    await requireTestId(app, "user-row-3")
    assert.equal(await app.getByTestId("user-row-1").count(), 0)
    await app.getByTestId("user-row-3").click()
    await requireTestId(app, "user-detail")
    assert.equal(await app.getByText("Clementine Bauch").count() > 0, true)

    await app.getByTestId("root-nav-home").click()
    await requireTestId(app, "page-home")
    await app.getByTestId("root-nav-login").click()
    await requireTestId(app, "page-login")
    await app.getByTestId("login-email").fill("demo@example.com")
    await app.getByTestId("login-submit").click()
    assert.equal(await app.getByText("Logged in").count(), 1)

    await app.getByTestId("root-nav-dashboard").click()
    await app.clock.fastForward(300)
    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    console.log("tanstack kitchen sink integration: passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
