import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { Gpuix08Showcase } from "./app"

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("GPUIX 0.8 Solid showcase: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const testRoot = createTestRoot(860, 720)
  testRoot.render(() => <Gpuix08Showcase />)
  const app = createTestApp(testRoot.renderer)

  try {
    const actionNode = await app.getByTestId("accessible-action").element()
    const action = testRoot.renderer.getElement(actionNode.id)
    assert.ok(action, "accessible action should exist in the retained tree")
    assert.equal(action.customProps?.role, "button")
    assert.equal(action.customProps?.["aria-label"], "Run accessible action")
    assert.equal(action.customProps?.["aria-id"], "gpuix08.accessible-action")

    // Assert the user-visible event path rather than the renderer's internal
    // event storage. Native event storage differs by platform, while the
    // automation click is the public behavior this example promises.
    await app.getByTestId("accessible-action").click()
    assert.equal(await app.getByTestId("accessible-count").textContent(), "Accessible clicks: 1")

    const decoratedNode = await app.getByTestId("decorated-text").element()
    const decorated = testRoot.renderer.getElement(decoratedNode.id)
    assert.ok(decorated, "decorated text should exist in the retained tree")
    assert.equal(decorated.style.textDecoration, "underline")

    await app.getByTestId("newline-editor").fill("\n")
    assert.equal(await app.getByTestId("newline-value").textContent(), 'Textarea value: "\\n"')

    console.log("GPUIX 0.8 Solid showcase: accessibility, textarea newline, and text decoration passed")
  } finally {
    await app.close()
    testRoot.unmount()
  }
}

await main()
