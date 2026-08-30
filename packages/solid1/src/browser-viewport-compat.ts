import type { ViewportSize } from "./context.js"

/** Keep browser collision/positioning libraries on the real GPUIX window size. */
export function syncBrowserViewportSize(size: ViewportSize): void {
  if (!globalThis.window) return
  Object.defineProperty(globalThis.window, "innerWidth", {
    configurable: true,
    writable: true,
    value: size.width,
  })
  Object.defineProperty(globalThis.window, "innerHeight", {
    configurable: true,
    writable: true,
    value: size.height,
  })
}
