import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import type { JSX } from "solid-js"
import { applyDebugFrameOverlay } from "./capabilities.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"
import type { DebugFrameOverlayMode, NativeRenderer } from "./host/types.js"
import { createRoot, type Root } from "./root.js"

export interface RenderOptions extends WindowOptions {
  renderer?: NativeRenderer
  onEvent?: (event: EventPayload) => void
  debugFrameOverlay?: DebugFrameOverlayMode
}

export interface RenderHandle {
  root: Root
  loop: FrameLoop
  renderer: NativeRenderer
  unmount(): void
}

export function render(code: () => JSX.Element, options: RenderOptions = {}): RenderHandle {
  const { renderer: injected, onEvent, debugFrameOverlay, ...windowOptions } = options

  if (injected) {
    applyDebugFrameOverlay(injected, debugFrameOverlay)
    const root = createRoot(injected)
    root.render(code)
    return {
      root,
      renderer: injected,
      loop: { stop() {} },
      unmount() {
        root.unmount()
      },
    }
  }

  let root: Root | undefined
  const nativeRenderer = new GpuixRenderer((error, event) => {
    if (error) {
      console.error("[gpuix-solid1] native event error", error)
      return
    }
    if (!event) return
    root?.dispatch(event)
    onEvent?.(event)
  })
  nativeRenderer.init(windowOptions)
  // SAFETY: GPUIX 0.4+ exposes applyBatch plus the capability methods consumed by this host; the legacy per-mutation methods in NativeRenderer are never reached when applyBatch is present.
  const renderer = nativeRenderer as unknown as NativeRenderer
  applyDebugFrameOverlay(renderer, debugFrameOverlay)
  root = createRoot(renderer)
  root.render(code)
  const loop = startFrameLoop(renderer, {
    onTerminated() {
      process.exitCode = 0
    },
  })

  return {
    root,
    renderer,
    loop,
    unmount() {
      loop.stop()
      root?.unmount()
    },
  }
}