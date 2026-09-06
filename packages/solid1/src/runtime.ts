import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import type { JSX } from "solid-js"
import { adaptBatchRenderer } from "./batch-renderer-adapter.js"
import { applyDebugFrameOverlay } from "./capabilities.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"
import { useDestroyUnlinksParentBatch } from "./host/mutations.js"
import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createRoot, type Root } from "./root.js"
import { createRuntimeErrorOverlay, type RuntimeErrorDetails } from "./runtime-error-overlay.js"

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
  lastCode?: () => JSX.Element
  lastOptions?: RenderOptions
  overlayShown: boolean
}

type RuntimeErrorHandlers = {
  uncaughtException: (error: Error) => void
  unhandledRejection: (reason: unknown) => void
}

type RuntimeGlobalState = typeof globalThis & {
  __gpuixSolid1RuntimeErrorHandlers?: RuntimeErrorHandlers
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

function thrownToError(thrown: unknown): Error | string {
  if (thrown instanceof Error) return thrown
  try {
    return String(thrown)
  } catch {
    return "Unknown error"
  }
}

function formatRuntimeError(thrown: Error | string): RuntimeErrorDetails {
  if (thrown instanceof Error) {
    const message = thrown.message || thrown.name || "Unknown error"
    const stack = thrown.stack ?? `${thrown.name}: ${thrown.message}`
    return { message, stack: stack.includes(message) ? stack : `${message}\n${stack}` }
  }
  const message = thrown || "Unknown error"
  return { message, stack: message }
}

function installRuntimeErrorHandlers(): void {
  if (runtimeGlobalState.__gpuixSolid1RuntimeErrorHandlers) return
  const handlers: RuntimeErrorHandlers = {
    uncaughtException(error) {
      scheduleRuntimeError(error)
    },
    unhandledRejection(reason) {
      scheduleRuntimeError(thrownToError(reason))
    },
  }
  process.on("uncaughtException", handlers.uncaughtException)
  process.on("unhandledRejection", handlers.unhandledRejection)
  runtimeGlobalState.__gpuixSolid1RuntimeErrorHandlers = handlers
}

function uninstallRuntimeErrorHandlers(): void {
  const handlers = runtimeGlobalState.__gpuixSolid1RuntimeErrorHandlers
  if (!handlers) return
  process.off("uncaughtException", handlers.uncaughtException)
  process.off("unhandledRejection", handlers.unhandledRejection)
  delete runtimeGlobalState.__gpuixSolid1RuntimeErrorHandlers
}

function showRuntimeError(slot: RenderSlot, error: Error | string): void {
  if (runtimeGlobalState.__gpuixSolid1RenderSlot !== slot || slot.overlayShown) return
  const formatted = formatRuntimeError(error)
  console.error("[gpuix-solid1] runtime error", error)
  console.error(formatted.stack)
  slot.overlayShown = true
  slot.generation += 1
  try {
    slot.root.render(() => createRuntimeErrorOverlay(formatted, () => reloadApp(slot)))
  } catch (overlayError) {
    slot.overlayShown = false
    console.error("[gpuix-solid1] failed to show runtime error overlay", overlayError)
  }
}

function scheduleRuntimeError(error: Error | string): void {
  const slot = runtimeGlobalState.__gpuixSolid1RenderSlot
  if (!slot?.root || slot.overlayShown) return
  const failedGeneration = slot.generation
  queueMicrotask(() => {
    const current = runtimeGlobalState.__gpuixSolid1RenderSlot
    if (current !== slot || current.generation !== failedGeneration) return
    showRuntimeError(slot, error)
  })
}

function reloadApp(slot: RenderSlot): void {
  const code = slot.lastCode
  if (!code || runtimeGlobalState.__gpuixSolid1RenderSlot !== slot) return
  slot.overlayShown = false
  slot.generation += 1
  try {
    slot.root.render(code)
  } catch (error) {
    scheduleRuntimeError(thrownToError(error))
  }
}

function createNativeRenderer(onEvent?: (event: EventPayload) => void): GpuixRenderer {
  let renderer: GpuixRenderer
  renderer = new GpuixRenderer((error, event) => {
    if (error) {
      scheduleRuntimeError(error)
      return
    }
    if (!event) return
    const state = rendererBindingState(renderer)
    try {
      const handled = state.root?.dispatch(event) ?? false
      if (handled) state.onEvent?.(event)
    } catch (eventError) {
      scheduleRuntimeError(thrownToError(eventError))
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

function mountCode(slot: RenderSlot, code: () => JSX.Element, options: RenderOptions): RenderHandle {
  const { onEvent, onKeyDown, onKeyUp, debugFrameOverlay } = options
  if (slot.nativeRenderer) setRendererOnEvent(slot.nativeRenderer, onEvent)
  slot.root.setWindowKeyEventHandlers(windowKeyEventHandlers(onKeyDown, onKeyUp))
  applyDebugFrameOverlay(slot.host, debugFrameOverlay)
  slot.lastCode = code
  slot.lastOptions = options
  slot.overlayShown = false
  slot.generation += 1
  try {
    slot.root.render(code)
  } catch (error) {
    scheduleRuntimeError(thrownToError(error))
  }
  return renderHandle(slot, slot.generation)
}

export function resetRender(): void {
  const slot = runtimeGlobalState.__gpuixSolid1RenderSlot
  if (slot) {
    delete runtimeGlobalState.__gpuixSolid1RenderSlot
    slot.loop.stop()
    slot.root.unmount()
    if (slot.nativeRenderer) {
      const state = rendererBindingState(slot.nativeRenderer)
      delete state.root
      delete state.onEvent
    }
  }
  uninstallRuntimeErrorHandlers()
}

/** Mount the app. Under `bun --hot`, later calls remount on the same native window. */
export function render(code: () => JSX.Element, options: RenderOptions = {}): RenderHandle {
  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options
  const existing = runtimeGlobalState.__gpuixSolid1RenderSlot

  if (existing) {
    if (injected && injected !== existing.host) {
      throw new Error("GPUIX Solid 1 already owns a renderer. Call resetRender() before rendering into a different renderer.")
    }
    return mountCode(existing, code, options)
  }

  if (injected) {
    const root = createRoot(injected, windowKeyEventHandlers(onKeyDown, onKeyUp))
    const slot: RenderSlot = {
      host: injected,
      root,
      loop: { stop() {} },
      generation: 0,
      overlayShown: false,
    }
    runtimeGlobalState.__gpuixSolid1RenderSlot = slot
    return mountCode(slot, code, options)
  }

  installRuntimeErrorHandlers()
  const nativeRenderer = createNativeRenderer(onEvent)
  nativeRenderer.init(windowOptions)
  const host = adaptBatchRenderer(nativeRenderer)
  useDestroyUnlinksParentBatch(host)
  applyDebugFrameOverlay(host, debugFrameOverlay)
  const root = createRoot(host, windowKeyEventHandlers(onKeyDown, onKeyUp))
  rendererBindingState(nativeRenderer).root = root

  // Start the AppKit pump before the first Solid render. A mount-time throw must
  // not strand the native macOS window without future ticks.
  const loop = startFrameLoop(nativeRenderer, {
    onError(error) {
      scheduleRuntimeError(thrownToError(error))
    },
    onTerminated() {
      process.exit(0)
    },
  })
  const slot: RenderSlot = {
    host,
    nativeRenderer,
    root,
    loop,
    generation: 0,
    overlayShown: false,
  }
  runtimeGlobalState.__gpuixSolid1RenderSlot = slot
  return mountCode(slot, code, options)
}
