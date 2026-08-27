import assert from "node:assert/strict"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  createTestApp,
  createTestRoot,
  hasNativeTestRenderer,
} from "gpuix-solid"
import { DashboardDemo } from "./app"

const screenshotPath = "/tmp/gpuix-solid-dashboard-demo.png"

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
    assert.equal(await app.getByTestId("page-overview").count(), 1)
    assert.equal(await app.getByTestId("page-title").textContent(), "Overview")

    const progressBefore = await app.getByTestId("release-progress").bounds()
    await app.clock.fastForward(700)
    const progressAfter = await app.getByTestId("release-progress").bounds()
    assert.ok(
      progressAfter.width > progressBefore.width + 80,
      `expected native progress animation to advance (${progressBefore.width} -> ${progressAfter.width})`,
    )

    await app.getByTestId("nav-tasks").click()
    assert.equal(await app.getByTestId("page-title").textContent(), "Tasks")
    assert.equal(await app.getByTestId("page-tasks").count(), 1)

    await app.getByTestId("task-input").fill("Ship dashboard fixture")
    await app.getByTestId("task-add").click()
    assert.match(await app.getByTestId("tasks-summary").textContent(), /5 total/)
    assert.equal(await app.getByText("Ship dashboard fixture").count(), 1)

    await app.getByTestId("task-toggle-1").click()
    assert.match(await app.getByTestId("tasks-summary").textContent(), /2 completed/)
    await app.getByTestId("filter-completed").click()
    assert.equal(await app.getByTestId("task-item-2").count(), 1)
    assert.equal(await app.getByTestId("task-item-1").count(), 1)
    assert.equal(await app.getByTestId("task-item-3").count(), 0)

    await app.getByTestId("nav-notes").click()
    await app.getByTestId("note-new").click()
    assert.equal(await app.getByTestId("note-editor").count(), 1)
    await app.clock.fastForward(300)
    await app.getByTestId("note-title").fill("Dashboard findings")
    await app.getByTestId("note-body").fill("Native inputs and list mutation are working together.")
    await app.getByTestId("note-save").click()
    assert.equal(await app.getByText("Dashboard findings").count(), 1)
    assert.match(await app.getByTestId("notes-summary").textContent(), /4 notes shown/)

    await app.getByTestId("note-archive-1").click()
    await app.getByTestId("notes-filter-archived").click()
    assert.equal(await app.getByTestId("note-card-1").count(), 1)
    assert.equal(await app.getByTestId("note-card-3").count(), 1)
    assert.equal(await app.getByTestId("note-card-2").count(), 0)

    await app.getByTestId("nav-weather").click()
    await app.getByTestId("weather-2").click()
    assert.equal(await app.getByText("Seattle detail").count(), 1)
    await app.getByTestId("weather-refresh").click()
    assert.match(await app.getByTestId("weather-refresh-count").textContent(), /1/)

    await app.getByTestId("nav-account").click()
    assert.equal(await app.getByTestId("page-account").count(), 1)
    await app.getByTestId("toggle-notifications").click()
    assert.match(await app.getByTestId("toggle-notifications").textContent(), /Off/)

    await app.getByTestId("density-select").click()
    assert.equal(await app.getByTestId("density-content").count(), 1)
    await app.getByTestId("density-content").press("down")
    await app.getByTestId("density-content").press("enter")
    assert.match(await app.getByTestId("density-value").textContent(), /compact/)

    await app.screenshot({ path: screenshotPath })
    assert.equal(existsSync(screenshotPath), true)
    assert.ok(statSync(screenshotPath).size > 0)

    console.log("dashboard integration: passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
