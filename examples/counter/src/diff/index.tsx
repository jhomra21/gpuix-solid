import { render } from "gpuix-solid"
import { DiffNativeDemo } from "./app"

render(() => <DiffNativeDemo />, {
  title: "GPUIX Diff Viewer",
  width: 900,
  height: 600,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
