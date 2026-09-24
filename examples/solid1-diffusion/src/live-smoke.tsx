import { existsSync, statSync, unlinkSync } from "node:fs"
import { render } from "@jhomra21/gpuix-solid1"
import { loadDiffusionNativeApp } from "./bootstrap"
import { diffusionWindowOptions } from "./window-options"

const screenshotPath = "/tmp/gpuix-solid1-diffusion-live.png"

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function settleFrames(count: number): Promise<void> {
  await Promise.race([
    new Promise<void>((resolve) => {
      let remaining = count
      const next = () => requestAnimationFrame(() => {
        remaining -= 1
        if (remaining === 0) resolve()
        else next()
      })
      next()
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Diffusion live window did not settle within 10 seconds`)), 10_000)
    }),
  ])
}

async function main(): Promise<void> {
  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)
  const { DiffusionSourceEditor } = await loadDiffusionNativeApp()
  const app = render(() => <DiffusionSourceEditor />, { ...diffusionWindowOptions, focus: false })

  try {
    await settleFrames(6)
    await Promise.resolve()
    app.root.flush()

    const size = app.renderer.getWindowSize?.()
    requireCondition(Boolean(size && size.width >= 960 && size.height >= 640), `Unexpected live Diffusion window size: ${JSON.stringify(size)}`)

    const paintedText = app.renderer.getPaintedText?.() ?? []
    const text = paintedText.join("\n")
    requireCondition(text.includes("Add media"), "Live Diffusion window should paint the Assets sidebar")
    requireCondition(text.includes("Editor"), "Live Diffusion window should paint the Inspector header")
    requireCondition(text.includes("30%"), "Live Diffusion window should paint the Inspector zoom value")
    requireCondition(text.includes("GPUix rectangle"), "Live Diffusion window should paint the fixture timeline layer")

    requireCondition(typeof app.renderer.captureScreenshot === "function", "Live renderer should expose screenshot capture")
    app.renderer.captureScreenshot(screenshotPath)
    requireCondition(existsSync(screenshotPath), "Live Diffusion screenshot should be written")
    requireCondition(statSync(screenshotPath).size > 10_000, "Live Diffusion screenshot should contain a rendered frame")

    console.log("solid1 Diffusion live window:", JSON.stringify({ size, paintedText: paintedText.length, screenshotPath }))
  } finally {
    app.unmount()
  }
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
