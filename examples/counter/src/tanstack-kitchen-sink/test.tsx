import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "gpuix-solid"
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
    await requireTestId(app, "invoice-create-panel")
    await app.getByTestId("create-title").fill("Eleventh invoice")
    await app.getByTestId("create-body").fill("Created from the GPUIX Solid 2 kitchen sink port")
    await app.getByTestId("create-invoice-submit").click()
    await requireTestId(app, "invoice-row-11")
    assert.equal(await app.getByText("Created!").count(), 1)

    await app.getByTestId("invoice-row-3").click()
    await requireTestId(app, "invoice-detail-panel")
    await app.getByTestId("edit-title").fill("Solid 2 native invoice")
    await app.getByTestId("toggle-invoice-notes").click()
    await requireTestId(app, "invoice-notes")
    await app.getByTestId("invoice-notes").fill("Notes persisted in native route-shaped state")
    await app.getByTestId("save-invoice").click()
    assert.equal(await app.getByText("Saved!").count(), 1)

    await app.getByTestId("dashboard-tab-users").click()
    await requireTestId(app, "users-workspace")
    await requireTestId(app, "users-sort-root")
    await requireTestId(app, "users-sort")
    assert.equal(await app.getByTestId("users-sort-value").textContent(), "name")
    const sortRootBounds = await app.getByTestId("users-sort-root").bounds()
    const sortBounds = await app.getByTestId("users-sort").bounds()
    assert.ok(sortRootBounds.width >= 140, `expected Sort By wrapper to preserve flex-1 width, got ${sortRootBounds.width}; trigger=${sortBounds.width}`)
    assert.ok(sortBounds.width >= 140, `expected Sort By trigger to fill wrapper, got ${sortBounds.width}; wrapper=${sortRootBounds.width}`)
    assert.ok(sortBounds.height >= 30, `expected Sort By trigger to be normal control height, got ${sortBounds.height}`)

    await app.getByTestId("users-sort").click()
    await requireTestId(app, "users-sort-item-email")
    await app.getByTestId("users-sort-item-email").click()
    assert.equal(await app.getByTestId("users-sort-value").textContent(), "email")

    await app.getByTestId("users-filter").fill("Clementine")
    await requireTestId(app, "user-row-3")
    assert.equal(await app.getByTestId("user-row-1").count(), 0)
    await app.getByTestId("user-row-3").click()
    await requireTestId(app, "user-detail")
    assert.equal(await app.getByText("Clementine Bauch").count() > 0, true)

    await app.clock.fastForward(300)
    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    await app.getByTestId("root-nav-home").click()
    await requireTestId(app, "page-home")
    await app.getByTestId("root-nav-login").click()
    await requireTestId(app, "page-login")
    await app.getByTestId("login-email").fill("demo@example.com")
    await app.getByTestId("login-submit").click()
    assert.equal(await app.getByText("Logged in").count(), 1)

    console.log("tanstack kitchen sink integration: passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
