import { render } from "@jhomra21/gpuix-solid1"
import { loadDiffusionNativeApp } from "./bootstrap"
import { diffusionWindowOptions } from "./window-options"

const { DiffusionSourceEditor } = await loadDiffusionNativeApp()

render(() => <DiffusionSourceEditor />, diffusionWindowOptions)
