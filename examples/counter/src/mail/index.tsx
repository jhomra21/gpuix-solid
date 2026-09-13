import { applyMacCpuThrottleFromEnv, render } from "gpuix-solid"
import { MailApp, MAIL_WINDOW_BACKGROUND } from "./app"

applyMacCpuThrottleFromEnv()

render(() => <MailApp />, {
  title: "Mail",
  appName: "Mail",
  width: 1280,
  height: 860,
  titlebarTransparent: true,
  windowBackground: MAIL_WINDOW_BACKGROUND,
  trafficLightX: 16,
  trafficLightY: 17,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
