import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { MailApp } from "./app"

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("mail parity: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const root = createTestRoot(1280, 860)
  root.render(() => <MailApp />)
  const app = createTestApp(root.renderer)

  try {
    assert.equal(await app.getByTestId("mail-app").count(), 1)
    assert.equal(await app.getByTestId("mail-sidebar").count(), 1)
    assert.equal(await app.getByTestId("mail-thread-list").count(), 1)
    assert.equal(await app.getByTestId("mail-reading-pane").count(), 1)
    assert.equal(await app.getByText("Atlas Weekly").count() > 0, true)

    await app.getByTestId("search").fill("Nora")
    assert.equal(await app.getByTestId("thread-nora").count(), 1)
    assert.equal(await app.getByTestId("thread-atlas-weekly").count(), 0)
    await app.getByTestId("search").fill("")

    await app.getByTestId("channel-promotions").click()
    assert.equal(await app.getByTestId("mail-reading-pane").count(), 0)
    assert.equal(await app.getByTestId("thread-lighthouse").count(), 1)
    assert.equal(await app.getByTestId("thread-nora").count(), 0)

    await app.getByTestId("nav-thread-atlas-weekly").click()
    assert.equal(await app.getByTestId("mail-thread-list").count(), 0)
    assert.equal(await app.getByTestId("mail-reading-pane").count(), 1)
    assert.equal(await app.getByTestId("thread-split").count(), 1)

    await app.getByTestId("thread-split").click()
    assert.equal(await app.getByTestId("mail-thread-list").count(), 1)
    assert.equal(await app.getByTestId("thread-full").count(), 1)

    await app.getByTestId("composer").fill("Solid mail parity")
    assert.equal(await app.getByTestId("composer").inputValue(), "Solid mail parity")

    await app.getByTestId("thread-close").click()
    assert.equal(await app.getByTestId("mail-reading-pane").count(), 0)
    assert.equal(await app.getByTestId("mail-thread-list").count(), 1)
  } finally {
    await app.close()
    root.unmount()
  }

  console.log("mail parity: search, channel navigation, split/full/closed reading pane, and composer passed")
}

await main()
