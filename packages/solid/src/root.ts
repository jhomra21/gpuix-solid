import type { EventPayload } from "@gpuix/native"
import { flush as flushSolid, type Element as SolidElement } from "solid-js"
import { GpuixContext, type GpuixContextValue } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import { BrowserPointerMutationDriver, BrowserPointerReleaseRelay } from "./host/pointer-lifecycle.js"
import type { NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"
import { createComponent, universalRender } from "./host/universal.js"

const windowKeyEventIds = new WeakMap<NativeRenderer, number>()
type PointerRelayEventType = "mouseMove" | "mouseUp"
type PointerRelayBurst = {
  eventType: PointerRelayEventType
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
type BoundsRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
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

function eventPointInsideElement(renderer: NativeRenderer, elementId: number, event: EventPayload): boolean {
  // SAFETY: GPUIX production/test renderers may expose this optional synchronous bounds capability; callers already tolerate it being absent.
  const bounds = (renderer as BoundsRenderer).getElementBounds?.(elementId)
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

export interface Root {
  render(code: () => SolidElement): void
  flush(): void
  flushSync<T>(fn: () => T): T
  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void
  dispatch(event: EventPayload): boolean
  unmount(): void
}

export function createRoot(renderer: NativeRenderer, initialWindowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {
  const events = new EventRegistry()
  const driver = new BrowserPointerMutationDriver(renderer, events)
  const releaseRelay = new BrowserPointerReleaseRelay()
  const container = new HostRootNode(renderer, events, driver)
  let windowKeyEventHandlers = initialWindowKeyEventHandlers
  let windowKeyEventId = nextWindowKeyEventId(renderer)
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
  syncWindowKeyEvents()

  const flushNative = (): void => driver.flush()
  const flush = (): void => {
    flushSolid()
    flushNative()
  }
  const flushSync = <T,>(fn: () => T): T => {
    try {
      return flushSolid(fn)
    } finally {
      flushNative()
    }
  }
  const contextValue: GpuixContextValue = { renderer, flushSync }

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
        driver.endAuthoredPointerRelay()
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flush()
        events.clear()
        releaseRelay.clear()
        pointerDownBurst = undefined
      }

      type UniversalNode = HostRootNode | HostNode
      type ContextProps = { value: GpuixContextValue; readonly children: SolidElement }
      const Context = (props: ContextProps): UniversalNode => {
        // SAFETY: The Solid context provider returns the active renderer's host child.
        return GpuixContext(props) as UniversalNode
      }

      dispose = universalRender(
        () =>
          createComponent(Context, {
            value: contextValue,
            get children() {
              return code()
            },
          }),
        container,
      )
      flush()
    },
    flush,
    flushSync,
    setWindowKeyEventHandlers(handlers) {
      windowKeyEventHandlers = handlers
      syncWindowKeyEvents()
    },
    dispatch(event) {
      let handled = false
      try {
        flushSolid(() => {
          if (event.eventType === "windowKeyDown" || event.eventType === "windowKeyUp") {
            if (event.elementId !== windowKeyEventId) return
            const handler = event.eventType === "windowKeyDown"
              ? windowKeyEventHandlers.onKeyDown
              : windowKeyEventHandlers.onKeyUp
            if (!handler) return
            handler(event, renderer)
            handled = true
            return
          }
          if (!hasLiveElement(container, event.elementId)) return
          const mounted = container.children[0]
          const rootId = mounted && mounted.kind === "element" ? mounted.id : undefined
          if (
            event.eventType === "mouseDown"
            && event.elementId === rootId
            && releaseRelay.pressedElementId !== undefined
            && releaseRelay.pressedElementId !== rootId
          ) {
            handled = true
            return
          }

          let routedEvent = releaseRelay.route(
            event,
            rootId,
            (elementId, release) => hasLiveElement(container, elementId)
              && eventPointInsideElement(renderer, elementId, release),
            (elementId, ancestorId) => isHostDescendant(container, elementId, ancestorId),
          )
          if (!routedEvent) {
            handled = true
            return
          }

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

          if (!hasLiveElement(container, routedEvent.elementId)) return
          if (isDuplicatePointerDown(routedEvent)) {
            handled = true
            return
          }
          if (isSyntheticRootRelayDuplicate(routedEvent)) {
            handled = true
            return
          }
          if (routedEvent.eventType === "mouseDown") {
            driver.beginAuthoredPointerRelay(routedEvent.elementId)
          }
          events.dispatch(routedEvent)
          handled = true
        })
      } finally {
        if (event.eventType === "mouseUp") driver.endAuthoredPointerRelay()
        flushNative()
      }
      return handled
    },
    unmount() {
      driver.endAuthoredPointerRelay()
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      flush()
      events.clear()
      releaseRelay.clear()
      pointerDownBurst = undefined
      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {
        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)
      }
      driver.dispose()
    },
  }
}
