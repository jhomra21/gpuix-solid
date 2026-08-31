import { applyMacCpuThrottleFromEnv, render } from "gpuix-solid"
import { TimelineApp } from "./app"

applyMacCpuThrottleFromEnv()

render(() => <TimelineApp />, {
  title: "GPUIX · Timeline",
  width: 1280,
  height: 800,
  debugFrameOverlay: "full",
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
