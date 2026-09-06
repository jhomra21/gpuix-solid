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
  __gpuixSolidRuntimeErrorHandlersInstalled?: boolean
  __gpuixSolidRendererBindings?: WeakMap<GpuixRenderer, RendererBindingState>
  __gpuixSolidRenderSlot?: RenderSlot
}

// SAFETY: these optional properties are private GPUIX Solid runtime state stored
// on globalThis so a Bun hot module replacement can find the existing renderer.
const runtimeGlobalState = globalThis as RuntimeGlobalState

function rendererBindingState(renderer: GpuixRenderer): RendererBindingState {
  let bindings = runtimeGlobalState.__gpuixSolidRendererBindings
  if (!bindings) {
    bindings = new WeakMap<GpuixRenderer, RendererBindingState>()
    runtimeGlobalState.__gpuixSolidRendererBindings = bindings
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
  if (runtimeGlobalState.__gpuixSolidRuntimeErrorHandlersInstalled) return
  runtimeGlobalState.__gpuixSolidRuntimeErrorHandlersInstalled = true
  process.on("uncaughtException", (error) => {
    console.error("[gpuix-solid] uncaughtException", error)
  })
  process.on("unhandledRejection", (reason) => {
    console.error("[gpuix-solid] unhandledRejection", reason)
  })
}

export function createRenderer(
  onEvent?: (event: EventPayload) => void,
): RendererBinding {
  let renderer: GpuixRenderer
  let automationEnabled = false
  renderer = new GpuixRenderer((error, event) => {
    if (error) {
      console.error("[gpuix-solid] native event error", error)
      return
    }
    if (!event) return
    const state = rendererBindingState(renderer)
    try {
      const handled = state.root?.dispatch(event) ?? false
      if (handled) state.onEvent?.(event)
    } catch (eventError) {
      console.error("[gpuix-solid] event handler error", eventError)
    }
  })
  setRendererOnEvent(renderer, onEvent)

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
    bindRoot(root) {
      rendererBindingState(renderer).root = root
    },
    setOnEvent(nextOnEvent) {
      setRendererOnEvent(renderer, nextOnEvent)
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
  setOnEvent(onEvent?: (event: EventPayload) => void): void
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
      if (runtimeGlobalState.__gpuixSolidRenderSlot !== slot || slot.generation !== generation) return
      resetRender()
    },
  }
}

export function resetRender(): void {
  const slot = runtimeGlobalState.__gpuixSolidRenderSlot
  if (!slot) return
  delete runtimeGlobalState.__gpuixSolidRenderSlot
  slot.loop.stop()
  slot.root.unmount()
  if (slot.nativeRenderer) {
    const state = rendererBindingState(slot.nativeRenderer)
    delete state.root
    delete state.onEvent
  }
}

/** Mount the app. Under `bun --hot`, later calls remount on the same native window. */
export function render(code: () => SolidElement, options: RenderOptions = {}): RenderHandle {
  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options
  const handlers = windowKeyEventHandlers(onKeyDown, onKeyUp)
  const existing = runtimeGlobalState.__gpuixSolidRenderSlot

  if (existing) {
    if (injected && injected !== existing.host) {
      throw new Error("GPUIX Solid already owns a renderer. Call resetRender() before rendering into a different renderer.")
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
    runtimeGlobalState.__gpuixSolidRenderSlot = slot
    root.render(code)
    return renderHandle(slot, slot.generation)
  }

  installRuntimeErrorHandlers()
  const native = createRenderer(onEvent)
  native.renderer.init(windowOptions)
  const host = adaptBatchRenderer(native.renderer)
  useDestroyUnlinksParentBatch(host)
  applyDebugFrameOverlay(host, debugFrameOverlay)
  const root = createRoot(host, handlers)
  native.bindRoot(root)

  // Start the AppKit pump before the first Solid render. A mount-time throw must
  // not strand the native macOS window without future ticks.
  const loop = startFrameLoop(native.renderer, {
    onTerminated() {
      process.exit(0)
    },
  })
  const slot: RenderSlot = {
    host,
    nativeRenderer: native.renderer,
    root,
    loop,
    generation: 1,
  }
  runtimeGlobalState.__gpuixSolidRenderSlot = slot
  root.render(code)
  return renderHandle(slot, slot.generation)
}
