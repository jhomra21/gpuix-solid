import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import type { JSX } from "solid-js"
import { adaptBatchRenderer } from "./batch-renderer-adapter.js"
import { applyDebugFrameOverlay } from "./capabilities.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"
import { useDestroyUnlinksParentBatch } from "./host/mutations.js"
import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createRoot, type Root } from "./root.js"

const RUNTIME_ERROR_HANDLERS_KEY = Symbol.for("@gpuix-solid/runtime-error-handlers")

function installRuntimeErrorHandlers(): void {
  if (typeof process === "undefined" || Reflect.get(globalThis, RUNTIME_ERROR_HANDLERS_KEY)) return
  Reflect.set(globalThis, RUNTIME_ERROR_HANDLERS_KEY, true)
  process.on("uncaughtException", (error) => {
    console.error("[gpuix-solid] uncaughtException", error)
  })
  process.on("unhandledRejection", (reason) => {
    console.error("[gpuix-solid] unhandledRejection", reason)
  })
}

export interface RenderOptions extends WindowOptions, WindowKeyEventHandlers {
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
  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options
  const windowKeyEventHandlers: WindowKeyEventHandlers = {}
  if (onKeyDown) windowKeyEventHandlers.onKeyDown = onKeyDown
  if (onKeyUp) windowKeyEventHandlers.onKeyUp = onKeyUp

  if (injected) {
    applyDebugFrameOverlay(injected, debugFrameOverlay)
    const root = createRoot(injected, windowKeyEventHandlers)
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

  installRuntimeErrorHandlers()
  let root: Root | undefined
  const nativeRenderer = new GpuixRenderer((error, event) => {
    if (error) {
      console.error("[gpuix-solid1] native event error", error)
      return
    }
    if (!event) return
    try {
      root?.dispatch(event)
      onEvent?.(event)
    } catch (eventError) {
      console.error("[gpuix-solid1] event handler error", eventError)
    }
  })
  nativeRenderer.init(windowOptions)
  const renderer = adaptBatchRenderer(nativeRenderer)
  useDestroyUnlinksParentBatch(renderer)
  applyDebugFrameOverlay(renderer, debugFrameOverlay)
  root = createRoot(renderer, windowKeyEventHandlers)
  root.render(code)
  const loop = startFrameLoop(nativeRenderer, {
    onTerminated() {
      process.exit(0)
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