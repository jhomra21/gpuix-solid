import { GpuixRenderer, type EventPayload, type WindowOptions } from "@gpuix/native"
import type { Element as SolidElement } from "solid-js"
import { enableAutomation } from "./automation/server.js"
import { adaptBatchRenderer } from "./batch-renderer-adapter.js"
import { applyDebugFrameOverlay } from "./capabilities.js"
import { startFrameLoop, type FrameLoop } from "./frame-loop.js"
import { useDestroyUnlinksParentBatch } from "./host/mutations.js"
import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createRoot, type Root } from "./root.js"
import { createRuntimeErrorOverlay, type RuntimeErrorDetails } from "./runtime-error-overlay.js"

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
  lastCode?: () => SolidElement
  overlayShown: boolean
}

type RuntimeFailure = Error | string
type RuntimeRejectionReason = Error | string | number | boolean | bigint | symbol | object | null | undefined

type RuntimeErrorHandlers = {
  uncaughtException: (error: Error) => void
  unhandledRejection: (reason: RuntimeRejectionReason) => void
}

type RuntimeGlobalState = typeof globalThis & {
  __gpuixSolidRuntimeErrorHandlers?: RuntimeErrorHandlers
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

function rejectionToFailure(reason: RuntimeRejectionReason): RuntimeFailure {
  return reason instanceof Error ? reason : String(reason)
}

function formatRuntimeError(thrown: RuntimeFailure): RuntimeErrorDetails {
  if (thrown instanceof Error) {
    const message = thrown.message || thrown.name || "Unknown error"
    const stack = thrown.stack ?? `${thrown.name}: ${thrown.message}`
    return { message, stack: stack.includes(message) ? stack : `${message}\n${stack}` }
  }
  const message = thrown || "Unknown error"
  return { message, stack: message }
}

function installRuntimeErrorHandlers(): void {
  if (runtimeGlobalState.__gpuixSolidRuntimeErrorHandlers) return
  const handlers: RuntimeErrorHandlers = {
    uncaughtException(error) {
      scheduleRuntimeError(error)
    },
    unhandledRejection(reason) {
      scheduleRuntimeError(rejectionToFailure(reason))
    },
  }
  process.on("uncaughtException", handlers.uncaughtException)
  process.on("unhandledRejection", handlers.unhandledRejection)
  runtimeGlobalState.__gpuixSolidRuntimeErrorHandlers = handlers
}

function uninstallRuntimeErrorHandlers(): void {
  const handlers = runtimeGlobalState.__gpuixSolidRuntimeErrorHandlers
  if (!handlers) return
  process.off("uncaughtException", handlers.uncaughtException)
  process.off("unhandledRejection", handlers.unhandledRejection)
  delete runtimeGlobalState.__gpuixSolidRuntimeErrorHandlers
}

function showRuntimeError(slot: RenderSlot, error: RuntimeFailure): void {
  if (runtimeGlobalState.__gpuixSolidRenderSlot !== slot || slot.overlayShown) return
  const formatted = formatRuntimeError(error)
  console.error("[gpuix-solid] runtime error", error)
  console.error(formatted.stack)
  slot.overlayShown = true
  slot.generation += 1
  try {
    slot.root.render(() => createRuntimeErrorOverlay(formatted, () => reloadApp(slot)))
  } catch (overlayError) {
    slot.overlayShown = false
    console.error("[gpuix-solid] failed to show runtime error overlay", overlayError)
  }
}

function scheduleRuntimeError(error: RuntimeFailure): void {
  const slot = runtimeGlobalState.__gpuixSolidRenderSlot
  if (!slot?.root || slot.overlayShown) return
  const failedGeneration = slot.generation
  queueMicrotask(() => {
    const current = runtimeGlobalState.__gpuixSolidRenderSlot
    if (current !== slot || current.generation !== failedGeneration) return
    showRuntimeError(slot, error)
  })
}

function reloadApp(slot: RenderSlot): void {
  const code = slot.lastCode
  if (!code || runtimeGlobalState.__gpuixSolidRenderSlot !== slot) return
  slot.overlayShown = false
  slot.generation += 1
  try {
    slot.root.render(code)
  } catch (error) {
    scheduleRuntimeError(error instanceof Error ? error : String(error))
  }
}

export function createRenderer(
  onEvent?: (event: EventPayload) => void,
): RendererBinding {
  let renderer: GpuixRenderer
  let automationEnabled = false
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
      scheduleRuntimeError(eventError instanceof Error ? eventError : String(eventError))
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

function mountCode(slot: RenderSlot, code: () => SolidElement, options: RenderOptions): RenderHandle {
  const { onEvent, onKeyDown, onKeyUp, debugFrameOverlay } = options
  if (slot.nativeRenderer) setRendererOnEvent(slot.nativeRenderer, onEvent)
  slot.root.setWindowKeyEventHandlers(windowKeyEventHandlers(onKeyDown, onKeyUp))
  applyDebugFrameOverlay(slot.host, debugFrameOverlay)
  slot.lastCode = code
  slot.overlayShown = false
  slot.generation += 1
  try {
    slot.root.render(code)
  } catch (error) {
    scheduleRuntimeError(error instanceof Error ? error : String(error))
  }
  return renderHandle(slot, slot.generation)
}

export function resetRender(): void {
  const slot = runtimeGlobalState.__gpuixSolidRenderSlot
  if (slot) {
    delete runtimeGlobalState.__gpuixSolidRenderSlot
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
export function render(code: () => SolidElement, options: RenderOptions = {}): RenderHandle {
  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options
  const existing = runtimeGlobalState.__gpuixSolidRenderSlot

  if (existing) {
    if (injected && injected !== existing.host) {
      throw new Error("GPUIX Solid already owns a renderer. Call resetRender() before rendering into a different renderer.")
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
    runtimeGlobalState.__gpuixSolidRenderSlot = slot
    return mountCode(slot, code, options)
  }

  installRuntimeErrorHandlers()
  const native = createRenderer(onEvent)
  native.renderer.init(windowOptions)
  const host = adaptBatchRenderer(native.renderer)
  useDestroyUnlinksParentBatch(host)
  applyDebugFrameOverlay(host, debugFrameOverlay)
  const root = createRoot(host, windowKeyEventHandlers(onKeyDown, onKeyUp))
  native.bindRoot(root)

  // Start the AppKit pump before the first Solid render. A mount-time throw must
  // not strand the native macOS window without future ticks.
  const loop = startFrameLoop(native.renderer, {
    onError(error) {
      scheduleRuntimeError(error)
    },
    onTerminated() {
      process.exit(0)
    },
  })
  const slot: RenderSlot = {
    host,
    nativeRenderer: native.renderer,
    root,
    loop,
    generation: 0,
    overlayShown: false,
  }
  runtimeGlobalState.__gpuixSolidRenderSlot = slot
  return mountCode(slot, code, options)
}
