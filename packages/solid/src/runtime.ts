import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import type { Element as SolidElement } from "solid-js"
import { enableAutomation } from "./automation/server.js"
import { adaptBatchRenderer } from "./batch-renderer-adapter.js"
import { applyDebugFrameOverlay } from "./capabilities.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"
import { useDestroyUnlinksParentBatch } from "./host/mutations.js"
import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createRoot, type Root } from "./root.js"

export { createRoot } from "./root.js"
export type { Root } from "./root.js"

export function createRenderer(
  onEvent?: (event: EventPayload) => void,
): RendererBinding {
  let root: Root | undefined
  let automationEnabled = false
  const renderer = new GpuixRenderer((error, event) => {
    if (error) {
      console.error("[gpuix-solid] native event error", error)
      return
    }
    if (!event) return
    root?.dispatch(event)
    onEvent?.(event)
  })

  const nativeInit = renderer.init.bind(renderer)
  renderer.init = (options) => {
    nativeInit(options)
    if (!process.stdin.isTTY && !automationEnabled) {
      enableAutomation(renderer)
      automationEnabled = true
    }
  }

  return {
    renderer,
    bindRoot(nextRoot) {
      root = nextRoot
    },
  }
}

export interface RenderOptions extends WindowOptions, WindowKeyEventHandlers {
  renderer?: NativeRenderer
  onEvent?: (event: EventPayload) => void
  debugFrameOverlay?: DebugFrameOverlayMode
}

export interface RendererBinding {
  renderer: GpuixRenderer
  bindRoot(root: Root): void
}

export interface RenderHandle {
  root: Root
  loop: FrameLoop
  renderer: NativeRenderer
  unmount(): void
}

export function render(code: () => SolidElement, options: RenderOptions = {}): RenderHandle {
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

  const native = createRenderer(onEvent)
  native.renderer.init(windowOptions)
  const renderer = adaptBatchRenderer(native.renderer)
  useDestroyUnlinksParentBatch(renderer)
  applyDebugFrameOverlay(renderer, debugFrameOverlay)
  const root = createRoot(renderer, windowKeyEventHandlers)
  native.bindRoot(root)
  root.render(code)
  const loop = startFrameLoop(native.renderer, {
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
      root.unmount()
    },
  }
}
