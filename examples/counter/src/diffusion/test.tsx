import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { EditorPage } from "./app"

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("diffusion integration: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const root = createTestRoot(1280, 800)
  root.render(() => <EditorPage />)
  const app = createTestApp(root.renderer)

  try {
    assert.equal(await app.getByTestId("diffusion-editor").count(), 1)
    assert.equal(await app.getByTestId("diffusion-sidebar-left").count(), 1)
    assert.equal(await app.getByTestId("diffusion-canvas").count(), 1)
    assert.equal(await app.getByTestId("diffusion-inspector").count(), 1)
    assert.equal(await app.getByTestId("diffusion-layers").count(), 1)
    assert.equal(await app.getByTestId("diffusion-timeline").count(), 1)
    assert.equal(await app.getByTestId("diffusion-soundboard").count(), 1)
    assert.equal(await app.getByText("Assets").count(), 1)
    assert.equal(await app.getByText("Editor").count(), 1)
    assert.equal(await app.getByText("Master").count(), 1)

    assert.equal(await app.getByTestId("diffusion-tool-move").count(), 1)
    await app.getByTestId("diffusion-tool-select-menu").click()
    assert.equal(await app.getByTestId("diffusion-tool-hand").count(), 1)
    assert.equal(await app.getByTestId("diffusion-tool-move").count(), 0)
    await app.getByTestId("diffusion-tool-frame").click()
    assert.equal(await app.getByTestId("diffusion-tool-move").count(), 1)

    assert.equal(await app.getByTestId("diffusion-prompt").count(), 0)
    await app.getByTestId("diffusion-ai-generate").click()
    assert.equal(await app.getByTestId("diffusion-prompt").count(), 1)
    await app.getByTestId("diffusion-prompt-input").fill("Create a cinematic sunrise")
    assert.match(await app.getByTestId("diffusion-prompt-mode").textContent(), /IMAGE/)
    await app.getByTestId("diffusion-prompt-mode").click()
    assert.match(await app.getByTestId("diffusion-prompt-mode").textContent(), /VIDEO/)
    await app.getByTestId("diffusion-prompt-settings").click()
    assert.equal(await app.getByText("Kling").count(), 1)
    await app.getByTestId("diffusion-prompt-submit").click()
    assert.match(await app.getByTestId("diffusion-prompt-result").textContent(), /video generation queued locally/)
    await app.getByTestId("diffusion-prompt-close").click()
    assert.equal(await app.getByTestId("diffusion-prompt").count(), 0)

    await app.getByTestId("diffusion-asset-search").fill("voiceover")
    assert.equal(await app.getByTestId("diffusion-asset-audio-1").count(), 1)
    assert.equal(await app.getByTestId("diffusion-asset-video-1").count(), 0)
    await app.getByTestId("diffusion-asset-audio-1").click()
    assert.equal(await app.getByText("audio-1").count(), 1)

    assert.equal(await app.getByTestId("diffusion-play").textContent(), "▶")
    await app.getByTestId("diffusion-play").click()
    assert.equal(await app.getByTestId("diffusion-play").textContent(), "Ⅱ")

    await app.getByTestId("diffusion-toggle-timeline").click()
    assert.equal(await app.getByTestId("diffusion-soundboard").count(), 0)
    await app.getByTestId("diffusion-toggle-timeline").click()
    assert.equal(await app.getByTestId("diffusion-soundboard").count(), 1)

    await app.getByTestId("diffusion-toggle-ui").click()
    assert.equal(await app.getByTestId("diffusion-sidebar-left").count(), 0)
    assert.equal(await app.getByTestId("diffusion-inspector").count(), 0)
    assert.equal(await app.getByTestId("diffusion-floating-header").count(), 1)
    await app.getByTestId("diffusion-show-ui").click()
    assert.equal(await app.getByTestId("diffusion-sidebar-left").count(), 1)

    console.log("diffusion integration: source-shaped editor passed")
  } finally {
    await app.close()
    root.unmount()
  }
}

await main()
