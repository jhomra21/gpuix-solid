import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import type { JSX } from "solid-js"
import { adaptBatchRenderer } from "./batch-renderer-adapter.js"
import { applyDebugFrameOverlay } from "./capabilities.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"
import { useDestroyUnlinksParentBatch } from "./host/mutations.js"
import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createRoot, type Root } from "./root.js"

type RendererBindingState = {
  root?: Root
  onEvent?: (event: EventPayload) => void
}

type RenderSlot = {
  host: NativeRenderer
  nativeRenderer?: GpuixRenderer
  root: Root
  loop: FrameLoop
  generation: number
}

type RuntimeGlobalState = typeof globalThis & {
  __gpuixSolid1RuntimeErrorHandlersInstalled?: boolean
  __gpuixSolid1RendererBindings?: WeakMap<GpuixRenderer, RendererBindingState>
  __gpuixSolid1RenderSlot?: RenderSlot
}

// SAFETY: these optional properties are private GPUIX Solid 1 runtime state stored
// on globalThis so a Bun hot module replacement can find the existing renderer.
const runtimeGlobalState = globalThis as RuntimeGlobalState

function rendererBindingState(renderer: GpuixRenderer): RendererBindingState {
  let bindings = runtimeGlobalState.__gpuixSolid1RendererBindings
  if (!bindings) {
    bindings = new WeakMap<GpuixRenderer, RendererBindingState>()
    runtimeGlobalState.__gpuixSolid1RendererBindings = bindings
  }
  let state = bindings.get(renderer)
  if (!state) {
    state = {}
    bindings.set(renderer, state)
  }
  return state
}

function setRendererOnEvent(renderer: GpuixRenderer, onEvent?: (event: EventPayload) => void): void {
  const state = rendererBindingState(renderer)
  if (onEvent) state.onEvent = onEvent
  else delete state.onEvent
}

function installRuntimeErrorHandlers(): void {
  if (typeof process === "undefined" || runtimeGlobalState.__gpuixSolid1RuntimeErrorHandlersInstalled) return
  runtimeGlobalState.__gpuixSolid1RuntimeErrorHandlersInstalled = true
  process.on("uncaughtException", (error) => {
    console.error("[gpuix-solid1] uncaughtException", error)
  })
  process.on("unhandledRejection", (reason) => {
    console.error("[gpuix-solid1] unhandledRejection", reason)
  })
}

function createNativeRenderer(onEvent?: (event: EventPayload) => void): GpuixRenderer {
  let renderer: GpuixRenderer
  renderer = new GpuixRenderer((error, event) => {
    if (error) {
      console.error("[gpuix-solid1] native event error", error)
      return
    }
    if (!event) return
    const state = rendererBindingState(renderer)
    try {
      const handled = state.root?.dispatch(event) ?? false
      if (handled) state.onEvent?.(event)
    } catch (eventError) {
      console.error("[gpuix-solid1] event handler error", eventError)
    }
  })
  setRendererOnEvent(renderer, onEvent)
  return renderer
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

function windowKeyEventHandlers(onKeyDown: RenderOptions["onKeyDown"], onKeyUp: RenderOptions["onKeyUp"]): WindowKeyEventHandlers {
  const handlers: WindowKeyEventHandlers = {}
  if (onKeyDown) handlers.onKeyDown = onKeyDown
  if (onKeyUp) handlers.onKeyUp = onKeyUp
  return handlers
}

function renderHandle(slot: RenderSlot, generation: number): RenderHandle {
  return {
    root: slot.root,
    renderer: slot.host,
    loop: slot.loop,
    unmount() {
      if (runtimeGlobalState.__gpuixSolid1RenderSlot !== slot || slot.generation !== generation) return
      resetRender()
    },
  }
}

export function resetRender(): void {
  const slot = runtimeGlobalState.__gpuixSolid1RenderSlot
  if (!slot) return
  delete runtimeGlobalState.__gpuixSolid1RenderSlot
  slot.loop.stop()
  slot.root.unmount()
  if (slot.nativeRenderer) {
    const state = rendererBindingState(slot.nativeRenderer)
    delete state.root
    delete state.onEvent
  }
}

/** Mount the app. Under `bun --hot`, later calls remount on the same native window. */
export function render(code: () => JSX.Element, options: RenderOptions = {}): RenderHandle {
  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options
  const handlers = windowKeyEventHandlers(onKeyDown, onKeyUp)
  const existing = runtimeGlobalState.__gpuixSolid1RenderSlot

  if (existing) {
    if (injected && injected !== existing.host) {
      throw new Error("GPUIX Solid 1 already owns a renderer. Call resetRender() before rendering into a different renderer.")
    }
    if (existing.nativeRenderer) setRendererOnEvent(existing.nativeRenderer, onEvent)
    existing.root.setWindowKeyEventHandlers(handlers)
    applyDebugFrameOverlay(existing.host, debugFrameOverlay)
    existing.root.render(code)
    existing.generation += 1
    return renderHandle(existing, existing.generation)
  }

  if (injected) {
    applyDebugFrameOverlay(injected, debugFrameOverlay)
    const root = createRoot(injected, handlers)
    const slot: RenderSlot = {
      host: injected,
      root,
      loop: { stop() {} },
      generation: 1,
    }
    runtimeGlobalState.__gpuixSolid1RenderSlot = slot
    root.render(code)
    return renderHandle(slot, slot.generation)
  }

  installRuntimeErrorHandlers()
  const nativeRenderer = createNativeRenderer(onEvent)
  nativeRenderer.init(windowOptions)
  const host = adaptBatchRenderer(nativeRenderer)
  useDestroyUnlinksParentBatch(host)
  applyDebugFrameOverlay(host, debugFrameOverlay)
  const root = createRoot(host, handlers)
  rendererBindingState(nativeRenderer).root = root

  // Start the AppKit pump before the first Solid render. A mount-time throw must
  // not strand the native macOS window without future ticks.
  const loop = startFrameLoop(nativeRenderer, {
    onTerminated() {
      process.exit(0)
    },
  })
  const slot: RenderSlot = {
    host,
    nativeRenderer,
    root,
    loop,
    generation: 1,
  }
  runtimeGlobalState.__gpuixSolid1RenderSlot = slot
  root.render(code)
  return renderHandle(slot, slot.generation)
}
