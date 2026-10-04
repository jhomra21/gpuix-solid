import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer, type PublicInstance } from "gpuix-solid"
import { TodoApp } from "./app"

const scrollMetricsScreenshot = "/tmp/gpuix-solid-virtual-list-scroll-metrics.png"

function verifyInitialVirtualListMetrics(): void {
  const root = createTestRoot(320, 180)
  let listRef: PublicInstance | undefined

  try {
    root.render(() => (
      <virtual-list
        ref={(instance) => { listRef = instance }}
        estimatedItemHeight={32}
        overdraw={0}
        style={{ width: 200, height: 80 }}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <div style={{ width: 200, height: 32 }}>
            <text>{`Metric row ${index + 1}`}</text>
          </div>
        ))}
      </virtual-list>
    ))

    assert.ok(listRef, "expected Solid virtual-list ref")
    const metrics = root.renderer.getScrollMetrics(listRef.id)
    assert.ok(metrics, "expected native virtual-list metrics before the first scroll event")

    const [offsetX, offsetY, maxX, maxY, viewportWidth, viewportHeight] = metrics
    assert.equal(offsetX, 0)
    assert.equal(offsetY, 0)
    assert.ok(maxX >= 0)
    assert.ok(maxY > 0, `expected virtual-list vertical overflow, got ${maxY}`)
    assert.ok(viewportWidth > 0)
    assert.ok(viewportHeight > 0)
    assert.equal(listRef.clientWidth, viewportWidth)
    assert.equal(listRef.clientHeight, viewportHeight)
    assert.equal(listRef.scrollWidth, Math.ceil(viewportWidth + Math.max(0, maxX)))
    assert.equal(listRef.scrollHeight, Math.ceil(viewportHeight + Math.max(0, maxY)))
    assert.ok(
      listRef.scrollHeight > listRef.clientHeight,
      `expected initial native scrollHeight > clientHeight, got ${listRef.scrollHeight} <= ${listRef.clientHeight}`,
    )

    root.renderer.captureScreenshot(scrollMetricsScreenshot)
  } finally {
    root.unmount()
  }
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("todo parity: native TestGpuixRenderer unavailable; skipped")
    return
  }

  verifyInitialVirtualListMetrics()

  const testRoot = createTestRoot(940, 660)
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

    const listNode = await app.getByType("virtual-list").element()
    await app.getByTestId("list-bottom").click()
    const bottomAnchor = testRoot.renderer.getListScrollTop(listNode.id)
    assert.ok(bottomAnchor && bottomAnchor[0] > 0, `expected Bottom to move retained-list anchor, got ${JSON.stringify(bottomAnchor)}`)
    await app.getByTestId("list-top").click()
    const topAnchor = testRoot.renderer.getListScrollTop(listNode.id)
    assert.ok(topAnchor && topAnchor[0] === 0, `expected Top to restore first retained-list row, got ${JSON.stringify(topAnchor)}`)

    console.log(`todo parity: passed (scroll metrics artifact: ${scrollMetricsScreenshot})`)
  } finally {
    await app.clock.resume()
    await app.close()
    testRoot.unmount()
  }
}

await main()
