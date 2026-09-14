import { render } from "@jhomra21/gpuix-solid1"
import { BlurredWindowApp } from "./app"

render(() => <BlurredWindowApp />, {
  title: "GPUIX Blurred Window",
  appName: "GPUIX Blurred Window",
  width: 760,
  height: 510,
  minWidth: 640,
  minHeight: 440,
  titlebarTransparent: true,
  windowBackground: "blurred",
  trafficLightX: 18,
  trafficLightY: 18,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
