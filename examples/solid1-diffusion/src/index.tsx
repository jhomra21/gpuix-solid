import { render } from "@jhomra21/gpuix-solid1"
import { loadDiffusionNativeApp } from "./bootstrap"
import { installNativeOffscreenTextMeasurement } from "./native-offscreen-text"
import { diffusionWindowOptions } from "./window-options"

const {
  NativeDiffusionApp,
  prepareNativeDiffusionSession,
} = await loadDiffusionNativeApp()

const session = await prepareNativeDiffusionSession()
const app = render(() => <NativeDiffusionApp session={session} />, diffusionWindowOptions)
installNativeOffscreenTextMeasurement(app.renderer)

console.log("GPUIX Diffusion native project:", JSON.stringify({
  id: session.project.id,
  name: session.project.displayName,
  dir: session.project.dir,
  entry: session.project.entry,
}))
