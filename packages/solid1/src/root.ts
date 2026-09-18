import type { EventPayload } from "@gpuix/native"
import { createSignal, type JSX } from "solid-js"
import { installBrowserElementIdentity } from "./browser-element-identity.js"
import {
  browserCompatibleNativeEvent,
  dispatchBrowserKeyboardEvent,
} from "./browser-event-compat.js"
import { installBrowserPreflushCompatibility } from "./browser-preflush-compat.js"
import { syncBrowserViewportSize } from "./browser-viewport-compat.js"
import { GpuixContext, type ViewportSize } from "./context.js"
import { SemanticDragPreview } from "./host/drag-preview.js"
import { EventRegistry } from "./host/events.js"
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import { BrowserPointerMutationDriver, BrowserPointerReleaseRelay } from "./host/pointer-lifecycle.js"
import type { DimensionValue, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { registerNativePortalRoot, unregisterNativePortalRoot } from "./native-portal.js"
import { universalRender } from "./universal.js"

const windowKeyEventIds = new WeakMap<NativeRenderer, number>()
const windowSelectionEventIds = new WeakMap<NativeRenderer, number>()
type PointerRelayEventType = "mouseMove" | "mouseUp"
type PointerRelayBurst = {
  eventType: PointerRelayEventType
  elementId: number
  x: number
  y: number
  button: number
}
type PointerDownBurst = {
  elementId: number
  x: number
  y: number
  button: number
}

const POINTER_TARGET_EVENTS = [
  "pointerDown",
  "mouseDown",
  "pointerUp",
  "mouseUp",
  "click",
  "dblClick",
  "contextMenu",
] as const

function nextWindowKeyEventId(renderer: NativeRenderer): number {
  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1
  windowKeyEventIds.set(renderer, id)
  return id
}

function nextWindowSelectionEventId(renderer: NativeRenderer): number {
  const id = (windowSelectionEventIds.get(renderer) ?? 0) + 1
  windowSelectionEventIds.set(renderer, id)
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

function semanticDragTargetAtPoint(
  container: HostRootNode,
  renderer: NativeRenderer,
  events: EventRegistry,
  event: EventPayload,
  eventType: "dragOver" | "drop",
): number | undefined {
  const visit = (nodes: readonly HostNode[]): number | undefined => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      if (!node || node.kind !== "element" || !node.nativeAlive) continue
      const descendant = visit(node.children)
      if (descendant !== undefined) return descendant
      if (!eventPointInsideElement(renderer, node.id, event)) continue
      if (events.has(node.id, eventType)) return node.id
    }
    return undefined
  }
  return visit(container.children)
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

function samePointerDownBurst(left: PointerDownBurst, right: PointerDownBurst): boolean {
  return left.elementId === right.elementId
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

export type WindowSelectionChangeHandler = (event: EventPayload, renderer: NativeRenderer) => void

export type WindowEventHandlers = WindowKeyEventHandlers & {
  /** Window-level text selection listener added by GPUIX 0.9. */
  onSelectionChange?: WindowSelectionChangeHandler
}

export interface Root {
  render(code: () => Solid1RenderValue): void
  flush(): void
  flushSync<Value>(fn: () => Value): Value
  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void
  setWindowSelectionChangeHandler(handler?: WindowSelectionChangeHandler): void
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

function pointerTargetAtPoint(
  container: HostRootNode,
  renderer: NativeRenderer,
  events: EventRegistry,
  event: EventPayload,
): number | undefined {
  const visit = (nodes: readonly HostNode[]): number | undefined => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      if (!node || node.kind !== "element" || !node.nativeAlive) continue
      const descendant = visit(node.children)
      if (descendant !== undefined) return descendant
      if (!eventPointInsideElement(renderer, node.id, event)) continue
      if (POINTER_TARGET_EVENTS.some((eventType) => events.has(node.id, eventType))) return node.id
    }
    return undefined
  }
  return visit(container.children)
}

export function createRoot(renderer: NativeRenderer, initialWindowEventHandlers: WindowEventHandlers = {}): Root {
  installBrowserElementIdentity()
  const events = new EventRegistry()
  const driver = new BrowserPointerMutationDriver(renderer, events)
  const releaseRelay = new BrowserPointerReleaseRelay()
  const container = new HostRootNode(renderer, events, driver)
  const semanticDragPreview = new SemanticDragPreview(container)
  let windowKeyEventHandlers: WindowKeyEventHandlers = initialWindowEventHandlers
  let windowSelectionChangeHandler = initialWindowEventHandlers.onSelectionChange
  let windowKeyEventId = nextWindowKeyEventId(renderer)
  let windowSelectionEventId = nextWindowSelectionEventId(renderer)
  let selectionObserverCount = 0
  const [selectedText, setSelectedText] = createSignal<string | null>(null)
  let dispose: (() => void) | undefined
  let pointerRelayBurst: PointerRelayBurst | undefined
  let pointerDownBurst: PointerDownBurst | undefined

  const syncWindowKeyEvents = (): void => {
    renderer.setWindowKeyEvents?.(
      Boolean(windowKeyEventHandlers.onKeyDown),
      Boolean(windowKeyEventHandlers.onKeyUp),
      windowKeyEventId,
    )
  }
  const syncWindowSelectionChange = (): void => {
    renderer.setWindowSelectionChange?.(
      Boolean(windowSelectionChangeHandler) || selectionObserverCount > 0,
      windowSelectionEventId,
    )
  }
  const retainWindowSelectionChange = (): (() => void) => {
    const wasIdle = selectionObserverCount === 0
    selectionObserverCount += 1
    if (wasIdle) setSelectedText(renderer.getSelectedText?.() ?? null)
    syncWindowSelectionChange()
    let active = true
    return () => {
      if (!active) return
      active = false
      selectionObserverCount = Math.max(0, selectionObserverCount - 1)
      syncWindowSelectionChange()
    }
  }
  syncWindowKeyEvents()
  syncWindowSelectionChange()
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

  const isDuplicatePointerDown = (event: EventPayload): boolean => {
    if (event.eventType !== "mouseDown") return false
    const current = {
      elementId: event.elementId,
      x: event.x ?? 0,
      y: event.y ?? 0,
      button: event.button ?? 0,
    } satisfies PointerDownBurst
    const previous = pointerDownBurst
    if (previous && samePointerDownBurst(previous, current)) return true
    pointerDownBurst = current
    queueMicrotask(() => {
      if (pointerDownBurst === current) pointerDownBurst = undefined
    })
    return false
  }

  const isSyntheticPointerRelayDuplicate = (event: EventPayload): boolean => {
    const relayType = pointerRelayEventType(event.eventType)
    if (!relayType) return false
    const mounted = container.children[0]
    if (!mounted || mounted.kind !== "element") return false

    const current = {
      eventType: relayType,
      elementId: event.elementId,
      x: event.x ?? 0,
      y: event.y ?? 0,
      button: event.button ?? 0,
    } satisfies PointerRelayBurst
    const pointerType = relayType === "mouseMove" ? "pointerMove" : "pointerUp"
    const authored = events.has(event.elementId, pointerType) || events.has(event.elementId, relayType)
    const previous = pointerRelayBurst

    if (previous && samePointerRelayBurst(previous, current) && !authored) return true

    pointerRelayBurst = current
    queueMicrotask(() => {
      if (pointerRelayBurst === current) pointerRelayBurst = undefined
    })
    return false
  }

  return {
    render(code) {
      if (dispose) {
        // A remount owns a new renderer-level keyboard event id. Queued events
        // from the replaced tree therefore cannot enter the replacement root.
        windowKeyEventId = nextWindowKeyEventId(renderer)
        windowSelectionEventId = nextWindowSelectionEventId(renderer)
        syncWindowKeyEvents()
        syncWindowSelectionChange()
        driver.endAuthoredPointerRelay()
        semanticDragPreview.hide()
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flushNative()
        events.clear()
        releaseRelay.clear()
        pointerRelayBurst = undefined
        pointerDownBurst = undefined
      }

      dispose = universalRender(
        () => GpuixContext.Provider({
          value: {
            renderer,
            getViewportSize,
            selection: {
              text: selectedText,
              retain: retainWindowSelectionChange,
              clear: () => renderer.clearSelection?.(),
            },
          },
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
    setWindowSelectionChangeHandler(handler) {
      windowSelectionChangeHandler = handler
      syncWindowSelectionChange()
    },
    dispatch(event) {
      let handled = false
      try {
        if (event.eventType === "selectionChange") {
          if (event.elementId !== windowSelectionEventId) return false
          if (!windowSelectionChangeHandler && selectionObserverCount === 0) return false
          setSelectedText(event.value ?? null)
          windowSelectionChangeHandler?.(
            event.elementId === 0 ? event : { ...event, elementId: 0 },
            renderer,
          )
          return true
        }
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
        if (
          event.eventType === "mouseDown"
          && event.elementId === rootId
          && releaseRelay.pressedElementId !== undefined
          && releaseRelay.pressedElementId !== rootId
        ) {
          return true
        }

        let routedEvent = releaseRelay.route(
          event,
          rootId,
          (elementId, release) => hasLiveElement(container, elementId)
            && eventPointInsideElement(renderer, elementId, release),
          (elementId, ancestorId) => isHostDescendant(container, elementId, ancestorId),
        )
        if (!routedEvent) return true
        if (isSyntheticPointerRelayDuplicate(routedEvent)) return true

        if (event.elementId === rootId && (event.eventType === "mouseDown" || event.eventType === "mouseUp")) {
          const targetId = pointerTargetAtPoint(container, renderer, events, event)
          if (targetId !== undefined && targetId !== rootId && routedEvent.elementId === rootId) {
            routedEvent = { ...event, elementId: targetId }
            if (event.eventType === "mouseDown") {
              routedEvent = releaseRelay.route(
                routedEvent,
                rootId,
                (elementId, release) => hasLiveElement(container, elementId)
                  && eventPointInsideElement(renderer, elementId, release),
                (elementId, ancestorId) => isHostDescendant(container, elementId, ancestorId),
              ) ?? routedEvent
            }
          }
        }

        if (
          events.hasDragSession()
          && (routedEvent.eventType === "mouseMove" || routedEvent.eventType === "mouseUp")
        ) {
          const dragEventType = routedEvent.eventType === "mouseMove" ? "dragOver" : "drop"
          const targetId = semanticDragTargetAtPoint(container, renderer, events, routedEvent, dragEventType)
          if (targetId !== undefined && targetId !== routedEvent.elementId) {
            routedEvent = { ...routedEvent, elementId: targetId }
          }
        }

        if (!hasLiveElement(container, routedEvent.elementId)) return false
        if (isDuplicatePointerDown(routedEvent)) return true
        if (routedEvent.eventType === "mouseDown") {
          driver.beginAuthoredPointerRelay(routedEvent.elementId)
        }
        const browserEvent = browserCompatibleNativeEvent(routedEvent)
        events.dispatch(browserEvent)
        dispatchBrowserKeyboardEvent(browserEvent)
        if (routedEvent.eventType === "mouseMove") {
          const preview = events.activeDragPreview()
          if (preview && rootId !== undefined) {
            renderer.clearSelection?.()
            semanticDragPreview.show(
              rootId,
              routedEvent.x ?? 0,
              routedEvent.y ?? 0,
              preview.label,
            )
          } else {
            semanticDragPreview.hide()
          }
        } else if (routedEvent.eventType === "mouseUp" || routedEvent.eventType === "mouseDown") {
          semanticDragPreview.hide()
        }
        handled = true
      } finally {
        if (event.eventType === "mouseUp") driver.endAuthoredPointerRelay()
        flushNative()
      }
      return handled
    },
    unmount() {
      driver.endAuthoredPointerRelay()
      semanticDragPreview.hide()
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      unregisterNativePortalRoot(renderer)
      flushNative()
      events.clear()
      releaseRelay.clear()
      pointerRelayBurst = undefined
      pointerDownBurst = undefined
      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {
        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)
      }
      if (windowSelectionEventIds.get(renderer) === windowSelectionEventId) {
        renderer.setWindowSelectionChange?.(false, windowSelectionEventId)
      }
      driver.dispose()
    },
  }
}