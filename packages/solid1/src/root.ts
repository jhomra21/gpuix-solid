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
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import { BrowserPointerMutationDriver, BrowserPointerReleaseRelay } from "./host/pointer-lifecycle.js"
import type { DimensionValue, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { registerNativePortalRoot, unregisterNativePortalRoot } from "./native-portal.js"
import { universalRender } from "./universal.js"

const windowKeyEventIds = new WeakMap<NativeRenderer, number>()
type PointerRelayEventType = "mouseMove" | "mouseUp"
type PointerRelayBurst = {
  eventType: PointerRelayEventType
  x: number
  y: number
  button: number
}

function nextWindowKeyEventId(renderer: NativeRenderer): number {
  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1
  windowKeyEventIds.set(renderer, id)
  return id
}

function hasLiveElement(container: HostRootNode, elementId: number): boolean {
  const pending: HostNode[] = [...container.children]
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node) continue
    if (node.kind === "element" && node.id === elementId && node.nativeAlive) return true
    pending.push(...node.children)
  }
  return false
}

function isHostDescendant(container: HostRootNode, elementId: number, ancestorId: number): boolean {
  const pending: HostNode[] = [...container.children]
  let ancestor: HostNode | undefined
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node) continue
    if (node.kind === "element" && node.id === ancestorId) {
      ancestor = node
      break
    }
    pending.push(...node.children)
  }
  if (!ancestor) return false

  const descendants: HostNode[] = [...ancestor.children]
  while (descendants.length > 0) {
    const node = descendants.pop()
    if (!node) continue
    if (node.kind === "element" && node.id === elementId) return true
    descendants.push(...node.children)
  }
  return false
}

function pointerRelayEventType(eventType: string): PointerRelayEventType | undefined {
  if (eventType === "mouseMove" || eventType === "mouseUp") return eventType
  return undefined
}

function samePointerRelayBurst(left: PointerRelayBurst, right: PointerRelayBurst): boolean {
  return left.eventType === right.eventType
    && left.x === right.x
    && left.y === right.y
    && left.button === right.button
}

export type Solid1RenderValue = JSX.Element | HostNode

function asSolidContextChild(value: Solid1RenderValue): JSX.Element {
  // SAFETY: Solid's universal renderer accepts GPUIX HostNode values as render results;
  // the upstream Solid JSX type still models DOM Node and cannot express that custom host contract.
  return value as JSX.Element
}

export interface Root {
  render(code: () => Solid1RenderValue): void
  flush(): void
  flushSync<Value>(fn: () => Value): Value
  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void
  dispatch(event: EventPayload): boolean
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

function eventPointInsideElement(renderer: NativeRenderer, elementId: number, event: EventPayload): boolean {
  const bounds = elementBounds(renderer, elementId)
  const x = event.x
  const y = event.y
  if (!bounds || bounds.length < 4 || x === undefined || y === undefined) return false
  const left = bounds[0]
  const top = bounds[1]
  const width = bounds[2]
  const height = bounds[3]
  if (left === undefined || top === undefined || width === undefined || height === undefined) return false
  return x >= left && x <= left + width && y >= top && y <= top + height
}

export function createRoot(renderer: NativeRenderer, initialWindowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {
  installBrowserElementIdentity()
  const events = new EventRegistry()
  const driver = new BrowserPointerMutationDriver(renderer, events)
  const releaseRelay = new BrowserPointerReleaseRelay()
  const container = new HostRootNode(renderer, events, driver)
  let windowKeyEventHandlers = initialWindowKeyEventHandlers
  let windowKeyEventId = nextWindowKeyEventId(renderer)
  let dispose: (() => void) | undefined
  let pointerRelayBurst: PointerRelayBurst | undefined

  const syncWindowKeyEvents = (): void => {
    renderer.setWindowKeyEvents?.(
      Boolean(windowKeyEventHandlers.onKeyDown),
      Boolean(windowKeyEventHandlers.onKeyUp),
      windowKeyEventId,
    )
  }
  syncWindowKeyEvents()
  installBrowserPreflushCompatibility(container, driver)

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

  const isSyntheticRootRelayDuplicate = (event: EventPayload): boolean => {
    const relayType = pointerRelayEventType(event.eventType)
    if (!relayType) return false
    const mounted = container.children[0]
    if (!mounted || mounted.kind !== "element") return false

    if (event.elementId !== mounted.id) {
      const next = {
        eventType: relayType,
        x: event.x ?? 0,
        y: event.y ?? 0,
        button: event.button ?? 0,
      } satisfies PointerRelayBurst
      pointerRelayBurst = next
      queueMicrotask(() => {
        if (pointerRelayBurst === next) pointerRelayBurst = undefined
      })
      return false
    }

    const previous = pointerRelayBurst
    if (!previous) return false
    const current = {
      eventType: relayType,
      x: event.x ?? 0,
      y: event.y ?? 0,
      button: event.button ?? 0,
    } satisfies PointerRelayBurst
    if (!samePointerRelayBurst(previous, current)) return false
    const pointerType = relayType === "mouseMove" ? "pointerMove" : "pointerUp"
    return !events.has(mounted.id, pointerType) && !events.has(mounted.id, relayType)
  }

  return {
    render(code) {
      if (dispose) {
        // A remount owns a new renderer-level keyboard event id. Queued events
        // from the replaced tree therefore cannot enter the replacement root.
        windowKeyEventId = nextWindowKeyEventId(renderer)
        syncWindowKeyEvents()
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flushNative()
        events.clear()
        releaseRelay.clear()
      }

      dispose = universalRender(
        () => GpuixContext.Provider({
          value: { renderer, getViewportSize },
          get children() {
            return asSolidContextChild(code())
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
    setWindowKeyEventHandlers(handlers) {
      windowKeyEventHandlers = handlers
      syncWindowKeyEvents()
    },
    dispatch(event) {
      let handled = false
      try {
        if (event.eventType === "windowKeyDown" || event.eventType === "windowKeyUp") {
          if (event.elementId !== windowKeyEventId) return false
          const handler = event.eventType === "windowKeyDown"
            ? windowKeyEventHandlers.onKeyDown
            : windowKeyEventHandlers.onKeyUp
          if (!handler) return false
          handler(event, renderer)
          return true
        }
        if (!hasLiveElement(container, event.elementId)) return false
        const mounted = container.children[0]
        const rootId = mounted && mounted.kind === "element" ? mounted.id : undefined
        const routedEvent = releaseRelay.route(
          event,
          rootId,
          (elementId, release) => hasLiveElement(container, elementId)
            && eventPointInsideElement(renderer, elementId, release),
          (elementId, ancestorId) => isHostDescendant(container, elementId, ancestorId),
        )
        if (!routedEvent) return true
        if (!hasLiveElement(container, routedEvent.elementId)) return false
        if (isSyntheticRootRelayDuplicate(routedEvent)) return true
        const browserEvent = browserCompatibleNativeEvent(routedEvent)
        events.dispatch(browserEvent)
        dispatchBrowserKeyboardEvent(browserEvent)
        handled = true
      } finally {
        flushNative()
      }
      return handled
    },
    unmount() {
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      unregisterNativePortalRoot(renderer)
      flushNative()
      events.clear()
      releaseRelay.clear()
      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {
        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)
      }
      driver.dispose()
    },
  }
}
