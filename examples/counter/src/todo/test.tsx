import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { TodoApp } from "./app"

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("todo parity: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const testRoot = createTestRoot({ width: 940, height: 660 })
  testRoot.renderer.clockPause()
  testRoot.render(() => <TodoApp />)
  const app = createTestApp(testRoot.renderer)

  try {
    assert.equal(await app.getByTestId("view-title").textContent(), "Today")
    assert.equal(await app.getByTestId("view-count").textContent(), "2")
    assert.equal(await app.getByTestId("row-t3").count(), 1)
    assert.equal(await app.getByTestId("row-t4").count(), 1)
    assert.equal(await app.getByTestId("row-t5").count(), 0)

    await app.getByTestId("view-inbox").click()
    assert.equal(await app.getByTestId("view-title").textContent(), "Inbox")
    assert.equal(await app.getByTestId("view-count").textContent(), "6")
    assert.equal(await app.getByTestId("row-t8").count(), 1)

    await app.getByTestId("row-t5").hover()
    assert.equal(await app.getByTestId("delete-t5").count(), 1)
    await app.getByTestId("delete-t5").click()
    assert.equal(await app.getByTestId("row-t5").count(), 0)
    assert.equal(await app.getByTestId("view-count").textContent(), "5")

    await app.getByTestId("view-today").click()
    await app.getByTestId("composer").fill("Write a Solid parity test")
    await app.getByTestId("add").click()
    assert.equal(await app.getByText("Write a Solid parity test").count(), 1)
    assert.equal(await app.getByTestId("view-count").textContent(), "3")

    await app.getByTestId("toggle-t3").click()
    assert.equal(await app.getByTestId("row-t3").count(), 0)
    assert.equal(await app.getByTestId("view-count").textContent(), "2")
    await app.getByTestId("view-done").click()
    assert.equal(await app.getByTestId("row-t3").count(), 1)
    assert.equal(await app.getByTestId("view-count").textContent(), "3")

    const sidebarBefore = await app.getByTestId("sidebar-clip").bounds()
    assert.ok(sidebarBefore.width > 200, `expected open sidebar, got ${sidebarBefore.width}`)
    await app.getByTestId("sidebar-toggle").click()
    await app.clock.fastForward(250)
    const sidebarAfter = await app.getByTestId("sidebar-clip").bounds()
    assert.ok(sidebarAfter.width < 5, `expected collapsed sidebar, got ${sidebarAfter.width}`)
    await app.getByTestId("sidebar-toggle").click()
    await app.clock.fastForward(250)
    const sidebarRestored = await app.getByTestId("sidebar-clip").bounds()
    assert.ok(sidebarRestored.width > 200, `expected restored sidebar, got ${sidebarRestored.width}`)

    await app.getByTestId("view-today").click()
    for (let index = 1; index <= 20; index += 1) {
      await app.getByTestId("composer").fill(`task ${index}`)
      await app.getByTestId("add").click()
      assert.ok(
        testRoot.renderer.getPaintedText().includes(`task ${index}`),
        `newest prepended row left the viewport after ${index} additions`,
      )
    }

    console.log("todo parity: passed")
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
