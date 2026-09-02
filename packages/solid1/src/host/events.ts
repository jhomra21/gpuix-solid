import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import type { DomCompatTarget, EventPayload, HostEventHandler } from "./types.js"

export type { DomCompatTarget } from "./types.js"

export const EVENT_PROPS = [
  ["onToggleFile", "toggleFile", "toggleFile"],
  ["onShowMore", "showMore", "showMore"],
  ["onLineClick", "lineClick", "lineClick"],
  ["onLinkClick", "linkClick", "linkClick"],
  ["onVisibleRange", "visibleRange", "visibleRange"],
  ["onHighlight", "highlight", "highlight"],
  ["onChange", "change", "change"],
  ["onInput", "input", "change"],
  ["onSubmit", "submit", "submit"],
  ["onClick", "click", "click"],
  ["onDblClick", "dblClick", "click"],
  ["onAuxClick", "auxClick", "auxClick"],
  ["onContextMenu", "contextMenu", "mouseUp"],
  ["onMouseDown", "mouseDown", "mouseDown"],
  ["onPointerDown", "pointerDown", "mouseDown"],
  ["onMouseUp", "mouseUp", "mouseUp"],
  ["onPointerUp", "pointerUp", "mouseUp"],
  ["onPointerCancel", "pointerCancel", null],
  ["onLostPointerCapture", "lostPointerCapture", null],
  ["onMouseEnter", "mouseEnter", "mouseEnter"],
  ["onMouseOver", "mouseOver", "mouseEnter"],
  ["onPointerEnter", "pointerEnter", "mouseEnter"],
  ["onMouseLeave", "mouseLeave", "mouseLeave"],
  ["onMouseOut", "mouseOut", "mouseLeave"],
  ["onPointerLeave", "pointerLeave", "mouseLeave"],
  ["onMouseMove", "mouseMove", "mouseMove"],
  ["onPointerMove", "pointerMove", "mouseMove"],
  ["onMouseDownOutside", "mouseDownOutside", "mouseDownOutside"],
  ["onKeyDown", "keyDown", "keyDown"],
  ["onKeyUp", "keyUp", "keyUp"],
  ["onFocus", "focus", "focus"],
  ["onBlur", "blur", "blur"],
  ["onScroll", "scroll", "scroll"],
] as const

export type EventPropName = (typeof EVENT_PROPS)[number][0]
export type DomEventType = (typeof EVENT_PROPS)[number][1]
export type NativeEventType = Exclude<(typeof EVENT_PROPS)[number][2], null>

export const EVENT_PROP_TO_TYPE = new Map<string, DomEventType>()
const DOM_EVENT_TO_NATIVE = new Map<string, NativeEventType>()
const DOM_EVENTS_BY_NATIVE = new Map<string, DomEventType[]>()
for (const [propName, domEventType, nativeEventType] of EVENT_PROPS) {
  EVENT_PROP_TO_TYPE.set(propName, domEventType)
  if (nativeEventType === null) continue
  DOM_EVENT_TO_NATIVE.set(domEventType, nativeEventType)
  const domEvents = DOM_EVENTS_BY_NATIVE.get(nativeEventType) ?? []
  domEvents.push(domEventType)
  DOM_EVENTS_BY_NATIVE.set(nativeEventType, domEvents)
}

export function nativeEventTypeForDomEvent(eventType: string): NativeEventType | undefined {
  return DOM_EVENT_TO_NATIVE.get(eventType)
}

type GlobalEventHandler = (event: EventPayload) => void
const globalListeners = new Map<string, Set<GlobalEventHandler>>()
const EVENT_STATE = new WeakMap<object, { defaultPrevented: boolean; propagationStopped: boolean }>()
const POINTER_ID = 0
const DOUBLE_CLICK_MS = 500
const DOUBLE_CLICK_DISTANCE_PX = 4

installNativeDomGlobals()

function fallbackTarget(event: NativeEventPayload): DomCompatTarget {
  const x = event.x ?? 0
  const y = event.y ?? 0
  return {
    value: event.value ?? "",
    scrollTop: 0,
    scrollLeft: 0,
    style: {},
    dataset: {},
    classList: {
      add: () => undefined,
      remove: () => undefined,
    },
    focus: () => undefined,
    blur: () => undefined,
    select: () => undefined,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    hasPointerCapture: () => false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    getBoundingClientRect: () => ({
      left: x,
      top: y,
      right: x,
      bottom: y,
      width: 0,
      height: 0,
    }),
  }
}

function browserEventName(eventType: string): string {
  switch (eventType) {
    case "dblClick": return "dblclick"
    case "pointerDown": return "pointerdown"
    case "pointerUp": return "pointerup"
    case "pointerMove": return "pointermove"
    case "pointerEnter": return "pointerenter"
    case "pointerLeave": return "pointerleave"
    case "pointerCancel": return "pointercancel"
    case "lostPointerCapture": return "lostpointercapture"
    case "mouseDown": return "mousedown"
    case "mouseUp": return "mouseup"
    case "mouseMove": return "mousemove"
    case "mouseEnter": return "mouseenter"
    case "mouseLeave": return "mouseleave"
    case "mouseOver": return "mouseover"
    case "mouseOut": return "mouseout"
    case "keyDown": return "keydown"
    case "keyUp": return "keyup"
    default: return eventType.toLowerCase()
  }
}

function domCompatibleEvent(
  event: NativeEventPayload,
  target: DomCompatTarget | undefined,
  domEventType: string,
): EventPayload {
  const x = event.x ?? 0
  const y = event.y ?? 0
  const currentTarget = target ?? fallbackTarget(event)
  if (event.value !== undefined) currentTarget.value = event.value
  const state = { defaultPrevented: false, propagationStopped: false }
  // SAFETY: EventPayload is the native event plus the DOM-compatible fields constructed below.
  const payload = Object.assign({}, event, {
    type: browserEventName(domEventType),
    currentTarget,
    target: currentTarget,
    clientX: x,
    clientY: y,
    pointerId: POINTER_ID,
    pointerType: "mouse",
    shiftKey: event.modifiers?.shift ?? false,
    metaKey: event.modifiers?.cmd ?? false,
    altKey: event.modifiers?.alt ?? false,
    ctrlKey: event.modifiers?.ctrl ?? false,
    preventDefault: () => { state.defaultPrevented = true },
    stopPropagation: () => { state.propagationStopped = true },
  }) as EventPayload
  Object.defineProperties(payload, {
    defaultPrevented: { configurable: true, get: () => state.defaultPrevented },
    cancelBubble: {
      configurable: true,
      get: () => state.propagationStopped,
      set: (value: boolean) => { state.propagationStopped = Boolean(value) },
    },
  })
  EVENT_STATE.set(payload, state)
  return payload
}

function createTargetEvent(eventType: string, event: EventPayload, target: EventTarget): Event {
  const domEvent = new Event(browserEventName(eventType), { bubbles: true, cancelable: true })
  const originalPreventDefault = domEvent.preventDefault.bind(domEvent)
  const originalStopPropagation = domEvent.stopPropagation.bind(domEvent)
  Object.defineProperties(domEvent, {
    target: { configurable: true, value: target },
    currentTarget: { configurable: true, value: target },
    clientX: { configurable: true, value: event.clientX ?? 0 },
    clientY: { configurable: true, value: event.clientY ?? 0 },
    pointerId: { configurable: true, value: event.pointerId ?? POINTER_ID },
    pointerType: { configurable: true, value: event.pointerType ?? "mouse" },
    button: { configurable: true, value: event.button ?? 0 },
    shiftKey: { configurable: true, value: event.shiftKey ?? false },
    metaKey: { configurable: true, value: event.metaKey ?? false },
    altKey: { configurable: true, value: event.altKey ?? false },
    ctrlKey: { configurable: true, value: event.ctrlKey ?? false },
    preventDefault: {
      configurable: true,
      value: () => {
        originalPreventDefault()
        event.preventDefault?.()
      },
    },
    stopPropagation: {
      configurable: true,
      value: () => {
        originalStopPropagation()
        event.stopPropagation?.()
      },
    },
    composedPath: { configurable: true, value: () => [target] },
  })
  return domEvent
}

function createGlobalDomEvent(name: string, event: EventPayload, currentTarget: EventTarget): Event {
  const domEvent = new Event(name, { bubbles: true, cancelable: true })
  const target = event.target ?? null
  Object.defineProperties(domEvent, {
    target: { configurable: true, value: target },
    currentTarget: { configurable: true, value: currentTarget },
    clientX: { configurable: true, value: event.clientX ?? 0 },
    clientY: { configurable: true, value: event.clientY ?? 0 },
    pointerId: { configurable: true, value: event.pointerId ?? POINTER_ID },
    pointerType: { configurable: true, value: event.pointerType ?? "mouse" },
    button: { configurable: true, value: event.button ?? 0 },
    shiftKey: { configurable: true, value: event.shiftKey ?? false },
    metaKey: { configurable: true, value: event.metaKey ?? false },
    altKey: { configurable: true, value: event.altKey ?? false },
    ctrlKey: { configurable: true, value: event.ctrlKey ?? false },
    composedPath: {
      configurable: true,
      value: () => target ? [target, currentTarget] : [currentTarget],
    },
  })
  return domEvent
}

function globalEventName(eventType: string): string | undefined {
  if (eventType === "pointerMove") return "pointermove"
  if (eventType === "pointerUp") return "pointerup"
  if (eventType === "pointerDown") return "pointerdown"
  if (eventType === "pointerCancel") return "pointercancel"
  if (eventType === "click") return "click"
  if (eventType === "dblClick") return "dblclick"
  if (eventType === "contextMenu") return "contextmenu"
  return undefined
}

function dispatchGlobalEvent(eventType: string, event: EventPayload): void {
  const name = globalEventName(eventType)
  if (!name) return
  for (const handler of globalListeners.get(name) ?? []) handler(event)
  globalThis.document.dispatchEvent(createGlobalDomEvent(name, event, globalThis.document))
  globalThis.window.dispatchEvent(createGlobalDomEvent(name, event, globalThis.window))
}

function installNativeDomGlobals(): void {
  if (!Object.hasOwn(globalThis, "window")) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: {
        devicePixelRatio: 1,
        addEventListener(type: string, handler: GlobalEventHandler) {
          const handlers = globalListeners.get(type) ?? new Set<GlobalEventHandler>()
          handlers.add(handler)
          globalListeners.set(type, handlers)
        },
        removeEventListener(type: string, handler: GlobalEventHandler) {
          const handlers = globalListeners.get(type)
          handlers?.delete(handler)
          if (handlers?.size === 0) globalListeners.delete(type)
        },
        dispatchEvent: () => true,
      },
    })
  }

  if (!Object.hasOwn(globalThis, "document")) {
    const classList = {
      add: (..._tokens: string[]): void => undefined,
      remove: (..._tokens: string[]): void => undefined,
    }
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: { body: { classList }, dispatchEvent: () => true },
    })
  }
}

type LastClick = {
  elementId: number
  button: number
  x: number
  y: number
  at: number
}

export class EventRegistry {
  readonly #handlers = new Map<number, Map<string, HostEventHandler>>()
  readonly #live = new Set<number>()
  readonly #targets = new Map<number, DomCompatTarget>()
  readonly #nativePointerDown = new Set<number>()
  readonly #activePointers = new Set<number>()
  readonly #pointerCapture = new Map<number, number>()
  readonly #lastPointerEvent = new Map<number, NativeEventPayload>()
  #lastClick: LastClick | undefined

  activate(id: number): void {
    this.#live.add(id)
  }

  setTarget(id: number, target: DomCompatTarget): void {
    this.#targets.set(id, target)
  }

  deactivate(id: number): void {
    for (const [pointerId, ownerId] of this.#pointerCapture) {
      if (ownerId !== id) continue
      this.#dispatchSynthetic(ownerId, "pointerCancel", pointerId)
      this.#releasePointerCapture(ownerId, pointerId)
    }
    this.#live.delete(id)
    this.#handlers.delete(id)
    this.#targets.delete(id)
    this.#nativePointerDown.delete(id)
  }

  set(id: number, eventType: string, handler: HostEventHandler): void {
    const handlers = this.#handlers.get(id) ?? new Map<string, HostEventHandler>()
    handlers.set(eventType, handler)
    this.#handlers.set(id, handlers)
  }

  delete(id: number, eventType: string): void {
    const handlers = this.#handlers.get(id)
    if (!handlers) return
    handlers.delete(eventType)
    if (handlers.size === 0) this.#handlers.delete(id)
  }

  deleteDestroyed(id: number): void {
    if (!this.#live.has(id)) {
      this.#handlers.delete(id)
      this.#targets.delete(id)
      this.#nativePointerDown.delete(id)
    }
  }

  clear(): void {
    this.#handlers.clear()
    this.#live.clear()
    this.#targets.clear()
    this.#nativePointerDown.clear()
    this.#activePointers.clear()
    this.#pointerCapture.clear()
    this.#lastPointerEvent.clear()
    this.#lastClick = undefined
  }

  has(id: number, eventType: string): boolean {
    return this.#handlers.get(id)?.has(eventType) ?? false
  }

  setPointerCapture(id: number, pointerId: number): void {
    if (!this.#live.has(id)) throw new DOMException("Pointer capture target is not connected", "InvalidStateError")
    if (!this.#activePointers.has(pointerId)) throw new DOMException(`Pointer ${pointerId} is not active`, "NotFoundError")
    const previousOwner = this.#pointerCapture.get(pointerId)
    if (previousOwner === id) return
    if (previousOwner !== undefined) this.#releasePointerCapture(previousOwner, pointerId)
    this.#pointerCapture.set(pointerId, id)
  }

  releasePointerCapture(id: number, pointerId: number): void {
    if (this.#pointerCapture.get(pointerId) !== id) return
    this.#releasePointerCapture(id, pointerId)
  }

  hasPointerCapture(id: number, pointerId: number): boolean {
    return this.#pointerCapture.get(pointerId) === id
  }

  dispatch(event: NativeEventPayload): void {
    if (!this.#live.has(event.elementId)) return
    switch (event.eventType) {
      case "mouseDown": {
        this.#activePointers.add(POINTER_ID)
        this.#lastPointerEvent.set(POINTER_ID, event)
        this.#nativePointerDown.add(event.elementId)
        queueMicrotask(() => this.#nativePointerDown.delete(event.elementId))
        this.#dispatchDom(event.elementId, "pointerDown", event)
        this.#dispatchDom(event.elementId, "mouseDown", event)
        return
      }
      case "mouseMove": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const capturedId = this.#pointerCapture.get(POINTER_ID)
        this.#dispatchDom(capturedId ?? event.elementId, "pointerMove", event)
        this.#dispatchDom(event.elementId, "mouseMove", event)
        return
      }
      case "mouseUp": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const capturedId = this.#pointerCapture.get(POINTER_ID)
        this.#dispatchDom(capturedId ?? event.elementId, "pointerUp", event)
        this.#dispatchDom(event.elementId, "mouseUp", event)
        if (event.button === 2) this.#dispatchDom(event.elementId, "contextMenu", event)
        this.#activePointers.delete(POINTER_ID)
        if (capturedId !== undefined) this.#releasePointerCapture(capturedId, POINTER_ID)
        return
      }
      case "click": {
        if (!this.#nativePointerDown.has(event.elementId)) {
          this.#dispatchDom(event.elementId, "pointerDown", event, true)
        }
        this.#dispatchDom(event.elementId, "click", event)
        this.#maybeDispatchDoubleClick(event)
        return
      }
      case "mouseEnter": {
        this.#dispatchDom(event.elementId, "pointerEnter", event)
        this.#dispatchDom(event.elementId, "mouseEnter", event)
        this.#dispatchDom(event.elementId, "mouseOver", event)
        return
      }
      case "mouseLeave": {
        this.#dispatchDom(event.elementId, "pointerLeave", event)
        this.#dispatchDom(event.elementId, "mouseLeave", event)
        this.#dispatchDom(event.elementId, "mouseOut", event)
        return
      }
      default:
        for (const domEventType of DOM_EVENTS_BY_NATIVE.get(event.eventType) ?? []) {
          this.#dispatchDom(event.elementId, domEventType, event)
        }
    }
  }

  #dispatchDom(
    elementId: number,
    eventType: string,
    nativeEvent: NativeEventPayload,
    globalOnly = false,
  ): EventPayload | undefined {
    if (!this.#live.has(elementId)) return undefined
    const target = this.#targets.get(elementId)
    const event = domCompatibleEvent({ ...nativeEvent, elementId }, target, eventType)
    if (!globalOnly) {
      this.#handlers.get(elementId)?.get(eventType)?.(event)
      if (target) target.dispatchEvent(createTargetEvent(eventType, event, target))
    }
    dispatchGlobalEvent(eventType, event)
    return event
  }

  #dispatchSynthetic(elementId: number, eventType: string, pointerId: number): void {
    const previous = this.#lastPointerEvent.get(pointerId)
    const fallbackSynthetic = {
      elementId,
      eventType: "mouseMove",
      x: 0,
      y: 0,
    } satisfies NativeEventPayload
    const synthetic = previous
      ? { ...previous, elementId }
      : fallbackSynthetic
    this.#dispatchDom(elementId, eventType, synthetic)
  }

  #releasePointerCapture(id: number, pointerId: number): void {
    if (this.#pointerCapture.get(pointerId) !== id) return
    this.#pointerCapture.delete(pointerId)
    this.#dispatchSynthetic(id, "lostPointerCapture", pointerId)
  }

  #maybeDispatchDoubleClick(event: NativeEventPayload): void {
    const next: LastClick = {
      elementId: event.elementId,
      button: event.button ?? 0,
      x: event.x ?? 0,
      y: event.y ?? 0,
      at: Date.now(),
    }
    const previous = this.#lastClick
    this.#lastClick = next
    if (!previous) return
    if (previous.elementId !== next.elementId || previous.button !== next.button) return
    if (next.at - previous.at > DOUBLE_CLICK_MS) return
    if (Math.hypot(next.x - previous.x, next.y - previous.y) > DOUBLE_CLICK_DISTANCE_PX) return
    this.#lastClick = undefined
    this.#dispatchDom(event.elementId, "dblClick", event)
  }
}
