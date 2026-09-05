import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { installBrowserElementIdentity } from "./browser-element-identity.js"
import {
  browserCompatibleNativeEvent,
  dispatchBrowserKeyboardEvent,
} from "./browser-event-compat.js"
import { installBrowserPreflushCompatibility } from "./browser-preflush-compat.js"
import { syncBrowserViewportSize } from "./browser-viewport-compat.js"
import { GpuixContext, type ViewportSize } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import { HostRootNode, removeHostNode } from "./host/nodes.js"
import type { DimensionValue, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { registerNativePortalRoot, unregisterNativePortalRoot } from "./native-portal.js"
import { universalRender } from "./universal.js"

const windowKeyEventIds = new WeakMap<NativeRenderer, number>()

function nextWindowKeyEventId(renderer: NativeRenderer): number {
  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1
  windowKeyEventIds.set(renderer, id)
  return id
}

export interface Root {
  render(code: () => JSX.Element): void
  flush(): void
  flushSync<Value>(fn: () => Value): Value
  dispatch(event: EventPayload): void
  unmount(): void
}

type BoundsRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
}

function numericDimension(value: DimensionValue | undefined): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function elementBounds(renderer: NativeRenderer, elementId: number): number[] | null | undefined {
  // SAFETY: production GPUIX renderers and the native test renderer expose the synchronous getElementBounds capability; it remains optional for older bindings.
  const boundsRenderer = renderer as BoundsRenderer
  return boundsRenderer.getElementBounds?.(elementId)
}

export function createRoot(renderer: NativeRenderer, windowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {
  installBrowserElementIdentity()
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  const windowKeyEventId = nextWindowKeyEventId(renderer)
  renderer.setWindowKeyEvents?.(
    Boolean(windowKeyEventHandlers.onKeyDown),
    Boolean(windowKeyEventHandlers.onKeyUp),
    windowKeyEventId,
  )
  installBrowserPreflushCompatibility(container, driver)
  let dispose: (() => void) | undefined

  const getViewportSize = (): ViewportSize => {
    const nativeSize = renderer.getWindowSize?.()
    const mounted = container.children[0]
    const bounds = mounted && mounted.kind === "element"
      ? elementBounds(renderer, mounted.id)
      : undefined
    const styleWidth = mounted && mounted.kind === "element" ? numericDimension(mounted.style.width) : 0
    const styleHeight = mounted && mounted.kind === "element" ? numericDimension(mounted.style.height) : 0
    const size = {
      width: Math.max(nativeSize?.width ?? 800, bounds?.[2] ?? 0, styleWidth),
      height: Math.max(nativeSize?.height ?? 600, bounds?.[3] ?? 0, styleHeight),
    }
    syncBrowserViewportSize(size)
    return size
  }
  const flushNative = (): void => {
    driver.flush()
    getViewportSize()
  }
  registerNativePortalRoot(renderer, container, getViewportSize)
  getViewportSize()

  return {
    render(code) {
      if (dispose) {
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flushNative()
        events.clear()
      }

      dispose = universalRender(
        () => GpuixContext.Provider({
          value: { renderer, getViewportSize },
          get children() {
            return code()
          },
        }),
        container,
      )
      flushNative()
    },
    flush: flushNative,
    flushSync(fn) {
      try {
        return fn()
      } finally {
        flushNative()
      }
    },
    dispatch(event) {
      try {
        if (event.eventType === "windowKeyDown" || event.eventType === "windowKeyUp") {
          if (event.elementId !== windowKeyEventId) return
          const handler = event.eventType === "windowKeyDown"
            ? windowKeyEventHandlers.onKeyDown
            : windowKeyEventHandlers.onKeyUp
          handler?.(event, renderer)
          return
        }
        const browserEvent = browserCompatibleNativeEvent(event)
        events.dispatch(browserEvent)
        dispatchBrowserKeyboardEvent(browserEvent)
      } finally {
        flushNative()
      }
    },
    unmount() {
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      unregisterNativePortalRoot(renderer)
      flushNative()
      events.clear()
      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {
        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)
      }
      driver.dispose()
    },
  }
}
