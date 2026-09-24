import "fake-indexeddb/auto"
import { render } from "@jhomra21/gpuix-solid1"
import { installDiffusionDesktopHost } from "./desktop-host"

installDiffusionDesktopHost()

const { DiffusionSourceEditor } = await import("./app")

render(() => <DiffusionSourceEditor />, {
  title: "Diffusion Studio — Solid 1 + GPUIX",
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
