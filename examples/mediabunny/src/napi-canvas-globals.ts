import { Canvas } from "@napi-rs/canvas"

export function installNapiCanvasGlobals(): void {
  if (typeof OffscreenCanvas !== "undefined") return

  Object.defineProperty(globalThis, "OffscreenCanvas", {
    configurable: true,
    writable: true,
    value: Canvas,
  })
}
