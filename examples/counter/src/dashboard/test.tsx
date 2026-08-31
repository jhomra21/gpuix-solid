import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "gpuix-solid"
import { DashboardDemo } from "./source/app"

const screenshotPath = "/tmp/gpuix-solid-dashboard-source-first.png"

type TestApp = ReturnType<typeof createTestApp>

async function scrollIntoView(app: TestApp, viewportTestId: string, targetTestId: string): Promise<void> {
  const viewport = app.getByTestId(viewportTestId)
  const target = app.getByTestId(targetTestId)
  const viewportBounds = await viewport.bounds()
  const viewportBottom = viewportBounds.y + viewportBounds.height
  const isVisible = (bounds: { y: number; height: number }): boolean => (
    bounds.y >= viewportBounds.y && bounds.y + bounds.height <= viewportBottom
  )

  let targetBounds = await target.bounds()
  if (isVisible(targetBounds)) return

  let deltaY = targetBounds.y >= viewportBottom ? 240 : -240
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const previousY = targetBounds.y
    await viewport.wheel(0, deltaY)
    targetBounds = await target.bounds()
    if (isVisible(targetBounds)) return

    const expectedUp = previousY >= viewportBottom
    const movedTowardViewport = expectedUp ? targetBounds.y < previousY : targetBounds.y > previousY
    if (!movedTowardViewport) deltaY *= -1
  }

  throw new Error(
    `Could not scroll ${targetTestId} into ${viewportTestId}: viewport=${JSON.stringify(viewportBounds)}, target=${JSON.stringify(targetBounds)}`,
  )
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("dashboard integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const testRoot = createTestRoot()
  testRoot.renderer.clockPause()
  testRoot.render(() => <DashboardDemo />)
  const app = createTestApp(testRoot.renderer)

  try {
    assert.equal(await app.getByTestId("dashboard-shell").count(), 1)
    assert.equal(await app.getByTestId("page-home").count(), 1)
    assert.equal(await app.getByTestId("page-title").textContent(), "Home")
    assert.equal(await app.getByText("About This Demo").count(), 1)
    assert.equal(await app.getByText("SolidJS and Tanstack Router for reactive UI").count(), 1)

    await app.getByTestId("test-api").click()
    assert.equal(await app.getByText("Hello from the API").count(), 1)
    await app.getByTestId("close-api").click()
    assert.equal(await app.getByText("Hello from the API").count(), 0)

    await app.getByTestId("nav-tasks").click()
    assert.equal(await app.getByTestId("page-title").textContent(), "Tasks")
    assert.equal(await app.getByText("My Tasks").count(), 1)
    assert.equal(await app.getByText("Create, manage and track your tasks").count(), 1)

    await app.getByTestId("task-input").fill("Ship source-first dashboard")
    await app.getByTestId("task-add").click()
    assert.equal(await app.getByText("Ship source-first dashboard").count(), 1)
    assert.match(await app.getByTestId("tasks-summary").textContent(), /4 tasks/)

    await app.getByTestId("task-toggle-1").click()
    assert.match(await app.getByTestId("tasks-summary").textContent(), /2 completed/)
    await app.getByTestId("tasks-filter-completed").click()
    assert.equal(await app.getByTestId("task-item-1").count(), 1)
    assert.equal(await app.getByTestId("task-item-2").count(), 1)
    assert.equal(await app.getByTestId("task-item-3").count(), 0)

    await app.getByTestId("tasks-filter-all").click()
    await app.getByTestId("task-edit-open-3").click()
    await app.getByTestId("task-edit-3").fill("Test native deployment")
    await app.getByTestId("task-save-3").click()
    assert.equal(await app.getByText("Test native deployment").count(), 1)
    await app.getByTestId("task-delete-3").click()
    await app.getByTestId("task-confirm-3").click()
    assert.equal(await app.getByText("Test native deployment").count(), 0)

    await app.getByTestId("nav-notes").click()
    assert.equal(await app.getByText("My Notes").count(), 1)
    assert.equal(await app.getByText("Create, edit and manage your notes").count(), 1)
    await app.getByTestId("note-new").click()
    assert.equal(await app.getByTestId("note-editor").textContent(), "New Note")
    await app.getByTestId("note-title").fill("Dashboard findings")
    await app.getByTestId("note-body").fill("Native inputs and route-owned state are working together.")
    await app.getByTestId("note-save").click()
    assert.equal(await app.getByText("Dashboard findings").count(), 1)
    await app.getByTestId("note-archive-1").click()
    await app.getByTestId("notes-filter-archived").click()
    assert.equal(await app.getByText("Project notes").count(), 1)

    await app.getByTestId("nav-weather").click()
    assert.equal(await app.getByText("Weather Dashboard").count(), 1)
    assert.equal(await app.getByText("Monitor weather conditions for your favorite locations").count(), 1)
    await app.getByTestId("weather-dismiss-location").click()
    await app.getByTestId("weather-city").fill("Seattle")
    await app.getByTestId("weather-add").click()
    assert.equal(await app.getByText("Seattle").count(), 1)
    await app.getByTestId("weather-refresh-1").click()
    assert.match(await app.getByTestId("weather-refresh-count").textContent(), /1 refresh/)

    await app.getByTestId("nav-account").click()
    assert.equal(await app.getByText("Account Settings").count(), 1)
    assert.equal(await app.getByText("Manage your account, preferences, and data.").count(), 1)
    await app.getByTestId("account-name").fill("Source First User")
    await app.getByTestId("account-save").click()
    await app.getByTestId("account-delete-open").click()
    assert.equal(await app.getByText("This action cannot be undone. This will permanently delete your account and remove all your data from our servers.").count(), 1)
    await app.getByTestId("delete-confirmation").fill("DELETE")
    await app.getByTestId("account-delete-confirm").click()
    assert.equal(await app.getByTestId("account-delete-confirm").count(), 0)
    assert.equal(await app.getByTestId("account-delete-status").textContent(), "Account deleted successfully")

    await app.getByTestId("nav-home").click()
    assert.equal(await app.getByTestId("page-home").count(), 1)
    assert.equal(await app.getByTestId("logout").count(), 1)
    await scrollIntoView(app, "dashboard-content", "logout")
    await app.getByTestId("logout").click()
    assert.equal(await app.getByTestId("logged-out").count(), 1)

    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    console.log("dashboard integration: source-first passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
