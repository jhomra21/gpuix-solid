import { applyMacCpuThrottleFromEnv, render } from "gpuix-solid"
import { InfiniteChatApp } from "./app"

applyMacCpuThrottleFromEnv()

render(() => <InfiniteChatApp />, {
  title: "GPUIX Infinite History",
  width: 920,
  height: 760,
  titlebarTransparent: true,
  windowBackground: "#1A1A1A",
  debugFrameOverlay: "full",
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
