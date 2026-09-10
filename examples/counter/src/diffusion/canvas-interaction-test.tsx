import assert from "node:assert/strict"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { EditorPage } from "./app"

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("diffusion canvas interaction: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const root = createTestRoot(1280, 800)
  root.render(() => <EditorPage />)
  const app = createTestApp(root.renderer)

  try {
    const surface = await app.getByTestId("diffusion-canvas-interaction-surface").bounds()
    const start = { x: surface.x + 180, y: surface.y + 120 }
    const end = { x: start.x + 150, y: start.y + 90 }

    await app.getByTestId("diffusion-tool-rect").click()
    await app.mouse.drag(start, end, { steps: 4 })
    assert.equal(await app.getByTestId("diffusion-scene-rect-1").count(), 1)
    const created = await app.getByTestId("diffusion-scene-rect-1").bounds()
    assert.ok(created.width >= 145, `rectangle width should follow pointer drag, got ${created.width}`)
    assert.ok(created.height >= 85, `rectangle height should follow pointer drag, got ${created.height}`)

    await app.getByTestId("diffusion-tool-select-menu").click()
    await app.getByTestId("diffusion-tool-option-move").click()
    await app.getByTestId("diffusion-scene-rect-1").dragBy(70, 35, { steps: 4 })
    const moved = await app.getByTestId("diffusion-scene-rect-1").bounds()
    assert.ok(moved.x >= created.x + 65, `Move tool should translate rectangle horizontally: ${created.x} -> ${moved.x}`)
    assert.ok(moved.y >= created.y + 30, `Move tool should translate rectangle vertically: ${created.y} -> ${moved.y}`)

    await app.getByTestId("diffusion-tool-select-menu").click()
    await app.getByTestId("diffusion-tool-option-hand").click()
    const panStart = { x: surface.x + 440, y: surface.y + 180 }
    await app.mouse.drag(panStart, { x: panStart.x + 55, y: panStart.y + 25 }, { steps: 4 })
    const panned = await app.getByTestId("diffusion-scene-rect-1").bounds()
    assert.ok(panned.x >= moved.x + 50, `Hand tool should pan scene horizontally: ${moved.x} -> ${panned.x}`)
    assert.ok(panned.y >= moved.y + 20, `Hand tool should pan scene vertically: ${moved.y} -> ${panned.y}`)

    await app.getByTestId("diffusion-tool-text").click()
    await app.mouse.click({ x: surface.x + 360, y: surface.y + 330 })
    assert.equal(await app.getByTestId("diffusion-scene-text-2").count(), 1)

    await app.getByTestId("diffusion-tool-frame").click()
    const frameStart = { x: surface.x + 520, y: surface.y + 100 }
    await app.mouse.drag(frameStart, { x: frameStart.x + 120, y: frameStart.y + 160 }, { steps: 4 })
    const frame = await app.getByTestId("diffusion-scene-frame-3").bounds()
    assert.ok(frame.width >= 115 && frame.height >= 155, `Frame tool should draw a real frame, got ${JSON.stringify(frame)}`)

    console.log("diffusion canvas interaction: Rectangle, Move, Hand, Text, and Frame gestures passed")
  } finally {
    root.unmount()
  }
}

await main()
