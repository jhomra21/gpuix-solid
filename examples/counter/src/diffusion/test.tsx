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

    assert.equal(await app.getByTestId("diffusion-project-menu-content").count(), 0)
    await app.getByTestId("diffusion-project-menu").click()
    assert.equal(await app.getByTestId("diffusion-project-menu-content").count(), 1)
    assert.equal(await app.getByTestId("diffusion-project-menu-content").getByText("Go to dashboard").count(), 1)
    await app.getByTestId("diffusion-project-menu-content").getByText("View").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("Zoom in").click()
    assert.match(await app.getByTestId("diffusion-zoom").textContent(), /125%/)
    await app.getByTestId("diffusion-project-menu").click()
    assert.equal(await app.getByTestId("diffusion-project-menu-content").count(), 0)

    await app.getByTestId("diffusion-project-menu").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("File").click()
    await app.getByTestId("diffusion-file-import").click()
    assert.equal(await app.getByTestId("diffusion-project-menu-content").count(), 0)
    assert.equal(await app.getByText("imported-1").count(), 1)

    await app.getByTestId("diffusion-project-menu").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("File").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("Asset").click()
    await app.getByTestId("diffusion-download-all-assets").click()
    assert.match(await app.getByTestId("diffusion-project-menu-status").textContent(), /5 assets prepared for local download/)

    await app.getByTestId("diffusion-project-menu").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("File").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("Asset").click()
    await app.getByTestId("diffusion-remove-unused-media").click()
    assert.match(await app.getByTestId("diffusion-project-menu-status").textContent(), /Removed 1 unused media item/)
    assert.equal(await app.getByTestId("diffusion-asset-image-1").count(), 0)

    assert.equal(await app.getByTestId("diffusion-add-assets-menu").count(), 0)
    await app.getByTestId("diffusion-import").click()
    assert.equal(await app.getByTestId("diffusion-add-assets-menu").count(), 1)
    assert.equal(await app.getByTestId("diffusion-add-assets-menu").getByText("Import assets").count(), 1)
    assert.equal(await app.getByTestId("diffusion-add-assets-menu").getByText("Create folder").count(), 1)
    await app.getByTestId("diffusion-create-folder").click()
    assert.equal(await app.getByTestId("diffusion-folder-1").count(), 1)

    assert.equal(await app.getByTestId("diffusion-tool-move").count(), 1)
    await app.getByTestId("diffusion-tool-select-menu").click()
    assert.equal(await app.getByTestId("diffusion-tool-hand").count(), 1)
    assert.equal(await app.getByTestId("diffusion-tool-move").count(), 0)
    await app.getByTestId("diffusion-tool-frame").click()
    assert.equal(await app.getByTestId("diffusion-tool-move").count(), 1)

    assert.equal(await app.getByTestId("diffusion-prompt").count(), 0)
    await app.getByTestId("diffusion-project-menu").click()
    await app.getByTestId("diffusion-project-menu-content").getByText("Tool").click()
    await app.getByTestId("diffusion-menu-generate-ai").click()
    assert.equal(await app.getByTestId("diffusion-project-menu-content").count(), 0)
    assert.equal(await app.getByTestId("diffusion-prompt").count(), 1)
    await app.getByTestId("diffusion-prompt-close").click()
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

    assert.equal(await app.getByTestId("diffusion-clock").textContent(), "00:05:40")
    const normalLayerBounds = await app.getByTestId("diffusion-layer-row-0").bounds()
    const normalVideoBounds = await app.getByTestId("diffusion-clip-video").bounds()

    await app.getByTestId("diffusion-clip-video").click()
    assert.equal(await app.getByTestId("diffusion-clip-video-split-1").count(), 0)
    await app.getByTestId("diffusion-split").click()
    assert.equal(await app.getByTestId("diffusion-clip-video-split-1").count(), 1)
    const leftSplit = await app.getByTestId("diffusion-clip-video").bounds()
    const rightSplit = await app.getByTestId("diffusion-clip-video-split-1").bounds()
    assert.ok(leftSplit.width < normalVideoBounds.width)
    assert.ok(rightSplit.width < normalVideoBounds.width)
    assert.ok(Math.abs(leftSplit.y - rightSplit.y) <= 1)

    await app.getByTestId("diffusion-more").click()
    assert.equal(await app.getByTestId("diffusion-more-menu").count(), 1)
    await app.getByTestId("diffusion-layer-height-64").click()
    const relaxedLayerBounds = await app.getByTestId("diffusion-layer-row-0").bounds()
    const relaxedVideoBounds = await app.getByTestId("diffusion-clip-video").bounds()
    const layerHeightDelta = relaxedLayerBounds.height - normalLayerBounds.height
    const clipHeightDelta = relaxedVideoBounds.height - normalVideoBounds.height
    assert.ok(layerHeightDelta > 20)
    assert.ok(clipHeightDelta > 20)
    assert.ok(Math.abs(layerHeightDelta - clipHeightDelta) <= 2)

    await app.getByTestId("diffusion-time-format-timecode").click()
    assert.equal(await app.getByTestId("diffusion-clock").textContent(), "00:00:05:12")
    await app.getByTestId("diffusion-time-format-frames").click()
    assert.equal(await app.getByTestId("diffusion-clock").textContent(), "162f")

    assert.equal(await app.getByTestId("diffusion-layer-row-4").count(), 0)
    await app.getByTestId("diffusion-add-layer").click()
    assert.equal(await app.getByTestId("diffusion-layer-row-4").count(), 1)
    assert.equal(await app.getByTestId("diffusion-more-menu").count(), 0)

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
