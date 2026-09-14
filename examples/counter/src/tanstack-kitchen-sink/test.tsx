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
    await requireTestId(app, "page-home")
    assert.equal(await app.getByText("Welcome Home!").count(), 1)

    await app.getByTestId("home-new-invoice").click()
    await requireTestId(app, "page-dashboard")
    await requireTestId(app, "invoice-detail-panel")
    assert.equal(await app.getByTestId("edit-title").count(), 1)

    await app.getByTestId("root-nav-home").click()
    await requireTestId(app, "page-home")
    await app.getByTestId("root-nav-dashboard").click()
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
    await requireTestId(app, "users-sidebar")
    await requireTestId(app, "users-sort-toolbar")
    await requireTestId(app, "users-sort-root")
    await requireTestId(app, "users-sort")
    assert.equal(await app.getByTestId("users-sort-value").textContent(), "name")
    const workspaceBounds = await app.getByTestId("users-workspace").bounds()
    const sidebarBounds = await app.getByTestId("users-sidebar").bounds()
    const toolbarBounds = await app.getByTestId("users-sort-toolbar").bounds()
    const sortRootBounds = await app.getByTestId("users-sort-root").bounds()
    const sortBounds = await app.getByTestId("users-sort").bounds()
    const layout = `workspace=${workspaceBounds.width}; sidebar=${sidebarBounds.width}; toolbar=${toolbarBounds.width}; wrapper=${sortRootBounds.width}; trigger=${sortBounds.width}`
    assert.ok(sidebarBounds.width >= 300, `expected Users sidebar to preserve its 310px source width; ${layout}`)
    assert.ok(toolbarBounds.width >= 280, `expected Sort By toolbar to fill the Users sidebar; ${layout}`)
    assert.ok(sortRootBounds.width >= 140, `expected Sort By wrapper to preserve flex-1 width; ${layout}`)
    assert.ok(sortBounds.width >= 140, `expected Sort By trigger to fill wrapper; ${layout}`)
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
    await requireTestId(app, "user-detail-email-line")
    assert.equal(await app.getByText("Clementine Bauch").count() > 0, true)
    const userDetail = app.getByTestId("user-detail")
    const userDetailText = await userDetail.textContent()
    assert.match(userDetailText, /"address"/)
    assert.match(userDetailText, /"geo"/)
    assert.match(userDetailText, /"company"/)
    assert.match(userDetailText, /"catchPhrase"/)
    const userDetailBounds = await userDetail.bounds()
    const emailLineBounds = await app.getByTestId("user-detail-email-line").bounds()
    assert.ok(
      userDetailBounds.width >= 250,
      `expected user detail to preserve block-level outlet width, got ${userDetailBounds.width}`,
    )
    assert.ok(
      emailLineBounds.width >= userDetailBounds.width - 2,
      `expected emulated pre line to fill its block width; detail=${userDetailBounds.width}; email=${emailLineBounds.width}`,
    )

    await app.clock.fastForward(300)
    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    await app.getByTestId("root-nav-expensive").click()
    await requireTestId(app, "page-expensive")
    assert.match(await app.getByTestId("page-expensive").textContent(), /I am an "expensive" component/)

    await app.getByTestId("root-nav-route-a").click()
    await requireTestId(app, "page-route-a")
    const routeAText = await app.getByTestId("page-route-a").textContent()
    assert.match(routeAText, /Layout/)
    assert.match(routeAText, /I'm A!/)

    await app.getByTestId("root-nav-route-b").click()
    await requireTestId(app, "page-route-b")
    assert.equal(await app.getByText("I'm B!").count(), 1)

    await app.getByTestId("root-nav-profile").click()
    await requireTestId(app, "page-login")
    assert.equal(await app.getByText("You must log in!").count(), 1)
    await app.getByTestId("login-email").fill("demo-user")
    await app.getByTestId("login-submit").click()
    await requireTestId(app, "page-profile")
    assert.equal(await app.getByTestId("profile-username").textContent(), "demo-user")

    await app.getByTestId("root-nav-login").click()
    await requireTestId(app, "page-login")
    assert.equal(await app.getByTestId("login-username").textContent(), "demo-user")
    await app.getByTestId("login-logout").click()
    assert.equal(await app.getByText("You must log in!").count(), 1)

    await app.getByTestId("root-nav-home").click()
    await requireTestId(app, "page-home")

    console.log("tanstack kitchen sink integration: source routes and interactions passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
