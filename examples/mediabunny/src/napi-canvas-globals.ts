import { Canvas } from "@napi-rs/canvas"

export function installNapiCanvasGlobals(): void {
  if (typeof OffscreenCanvas === "undefined") {
    Object.defineProperty(globalThis, "OffscreenCanvas", {
      configurable: true,
      writable: true,
      value: Canvas,
    })
  }

  if (typeof OffscreenCanvasRenderingContext2D === "undefined") {
    const context = new Canvas(1, 1).getContext("2d")
    const contextConstructor = Object.getPrototypeOf(context).constructor

    Object.defineProperty(globalThis, "OffscreenCanvasRenderingContext2D", {
      configurable: true,
      writable: true,
      value: contextConstructor,
    })
  }
}
