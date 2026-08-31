import { applyMacCpuThrottleFromEnv, render } from "gpuix-solid"
import { ChatApp } from "./shell"

applyMacCpuThrottleFromEnv()

render(() => <ChatApp turnCount={1_000} includeSafeMdx />, {
  title: "GPUix Solid Chat · 1,000 messages",
  width: 1180,
  height: 820,
  titlebarTransparent: true,
  windowBackground: "blurred",
  trafficLightX: 16,
  trafficLightY: 17,
  debugFrameOverlay: "full",
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
