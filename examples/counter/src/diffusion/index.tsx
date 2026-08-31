import { render } from "gpuix-solid"
import { EditorPage } from "./app"

render(() => <EditorPage />, {
  title: "Diffusion Studio",
  appName: "Diffusion Studio",
  width: 1280,
  height: 800,
  minWidth: 960,
  minHeight: 640,
  titlebarTransparent: true,
  windowBackground: "blurred",
  trafficLightX: 16,
  trafficLightY: 17,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
