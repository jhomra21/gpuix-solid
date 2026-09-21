import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createTestApp, createTestRoot, hasNativeTestRenderer } from "gpuix-solid"
import { WaveformApp } from "./app"

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("GPUIX Solid waveform: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const root = createTestRoot(800, 420)
  const app = createTestApp(root.renderer)
  const first = path.join(os.tmpdir(), `gpuix-solid-waveform-0-${process.pid}.png`)
  const second = path.join(os.tmpdir(), `gpuix-solid-waveform-1-${process.pid}.png`)

  try {
    root.render(() => <WaveformApp phase={0} />)
    await Promise.resolve()
    root.renderer.flush()
    root.renderer.captureScreenshot(first)

    root.render(() => <WaveformApp phase={1.2} />)
    await Promise.resolve()
    root.renderer.flush()
    root.renderer.captureScreenshot(second)

    assert.ok(fs.statSync(first).size > 0)
    assert.ok(fs.statSync(second).size > 0)
    assert.notDeepEqual(
      fs.readFileSync(first),
      fs.readFileSync(second),
      "changing phase should replace the live waveform pixels",
    )

    const list = await app.getByTestId("clip-list").element()
    assert.deepEqual(root.renderer.getScrollOffset(list.id), [0, 0])
    await app.getByTestId("jump-outro").click()
    const offset = root.renderer.getScrollOffset(list.id)
    assert.ok(offset)
    assert.ok((offset[1] ?? 0) < 0, "scrollIntoView should reveal the outro")

    console.log("GPUIX Solid waveform: live RGBA image replacement and scrollIntoView passed")
  } finally {
    for (const shot of [first, second]) {
      if (fs.existsSync(shot)) fs.unlinkSync(shot)
    }
    await app.close()
    root.unmount()
  }
}

await main()
