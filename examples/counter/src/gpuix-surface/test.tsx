import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { GpuixSurfaceShowcase } from "./app"

function requiredBounds(
  root: ReturnType<typeof createTestRoot>,
  element: { id: number },
): [number, number, number, number] {
  const bounds = root.renderer.getElementBounds(element.id)
  if (!bounds || bounds.length < 4) throw new Error(`Missing bounds for element ${element.id}`)
  const [x, y, width, height] = bounds
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error(`Incomplete bounds for element ${element.id}`)
  }
  return [x, y, width, height]
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("GPUIX 0.9 Solid showcase: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const testRoot = createTestRoot(860, 900)
  testRoot.render(() => <GpuixSurfaceShowcase />)
  const app = createTestApp(testRoot.renderer)

  try {
    const actionNode = await app.getByTestId("accessible-action").element()
    const action = testRoot.renderer.getElement(actionNode.id)
    assert.ok(action, "accessible action should exist in the retained tree")
    assert.equal(action.customProps?.role, "button")
    assert.equal(action.customProps?.["aria-label"], "Run accessible action")
    assert.equal(action.customProps?.["aria-id"], "gpuix.surface.accessible-action")

    await app.getByTestId("accessible-action").click()
    assert.equal(await app.getByTestId("accessible-count").textContent(), "Accessible clicks: 1")

    const decoratedNode = await app.getByTestId("decorated-text").element()
    const decorated = testRoot.renderer.getElement(decoratedNode.id)
    assert.ok(decorated, "decorated text should exist in the retained tree")
    assert.equal(decorated.style.textDecoration, "underline")

    const selectionSource = await app.getByTestId("selection-source").element()
    const [x, y, width, height] = requiredBounds(testRoot, selectionSource)
    const selected = testRoot.renderer.dragSelect(x + 2, y + height / 2, x + width - 2, y + height / 2)
    assert.equal(selected, "Select this GPUIX 0.9 text")
    assert.equal(
      await app.getByTestId("selection-value").textContent(),
      "Selection: Select this GPUIX 0.9 text",
    )
    await app.getByTestId("clear-selection").click()
    assert.equal(await app.getByTestId("selection-value").textContent(), "Selection: none")

    await app.getByTestId("newline-editor").fill("\n")
    assert.equal(await app.getByTestId("newline-value").textContent(), 'Textarea value: "\\n"')

    console.log("GPUIX 0.9 Solid showcase: metadata, selection, textarea newline, and text decoration passed")
  } finally {
    await app.close()
    testRoot.unmount()
  }
}

await main()
