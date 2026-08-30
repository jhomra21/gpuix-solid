import { render } from "gpuix-solid"
import { TodoApp } from "./app"

render(() => <TodoApp />, {
  title: "Todo",
  width: 940,
  height: 660,
  titlebarTransparent: true,
  windowBackground: "blurred",
  trafficLightX: 16,
  trafficLightY: 17,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
