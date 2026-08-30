import type { ViewportSize } from "./context.js"

type MutableBrowserViewport = {
  innerWidth?: number
  innerHeight?: number
}

/** Keep browser collision/positioning libraries on the real GPUIX window size. */
export function syncBrowserViewportSize(size: ViewportSize): void {
  const browserWindow = globalThis.window as unknown as MutableBrowserViewport | undefined
  if (!browserWindow) return
  browserWindow.innerWidth = size.width
  browserWindow.innerHeight = size.height
}
