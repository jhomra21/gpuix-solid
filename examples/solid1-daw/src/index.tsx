import {
  configureNativeStyleManifest,
  render,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

render(() => (
  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
    <DawSolid1Showcase />
  </div>
), {
  title: "DAW Browser — Solid 1 + GPUIX",
  width: 1440,
  height: 900,
  debugFrameOverlay: "full",
})
