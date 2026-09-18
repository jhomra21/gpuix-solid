import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import type { DomCompatTarget, DragData, EventPayload, HostEventHandler } from "./types.js"

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
  ["onFileDrop", "fileDrop", "fileDrop"],
  ["onDragStart", "dragStart", null],
  ["onDragOver", "dragOver", null],
  ["onDrop", "drop", null],
  ["onDragEnd", "dragEnd", null],
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
const PERSISTENT_DEVICE_ID = 0
const DOUBLE_CLICK_MS = 500
const DOUBLE_CLICK_DISTANCE_PX = 4
const NATIVE_CLICK_RELAY_MS = 250
const DRAG_START_DISTANCE_PX = 4

installNativeDomGlobals()

function fallbackTarget(event: NativeEventPayload): DomCompatTarget {
  const x = event.x ?? 0
  const y = event.y ?? 0
  return {
    value: event.value ?? "",
    checked: false,
    getAttribute: () => null,
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
    persistentDeviceId: PERSISTENT_DEVICE_ID,
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
    persistentDeviceId: { configurable: true, value: event.persistentDeviceId ?? PERSISTENT_DEVICE_ID },
    button: { configurable: true, value: event.button ?? 0 },
    shiftKey: { configurable: true, value: event.shiftKey ?? false },
    metaKey: { configurable: true, value: event.metaKey ?? false },
    altKey: { configurable: true, value: event.altKey ?? false },
    ctrlKey: { configurable: true, value: event.ctrlKey ?? false },
    dragData: { configurable: true, value: event.dragData },
    dragSourceId: { configurable: true, value: event.dragSourceId },
    dropTargetId: { configurable: true, value: event.dropTargetId },
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
    persistentDeviceId: { configurable: true, value: event.persistentDeviceId ?? PERSISTENT_DEVICE_ID },
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

type ActivationBurst = {
  elementId: number
  sourceKeys: Set<string>
  source: "mouseUp" | "click"
  button: number
  clickCount: number
  x: number
  y: number
  at: number
}

type NativeClickBubble = {
  ancestors: ReadonlySet<number>
  button: number
  clickCount: number
  x: number
  y: number
}

type DragSession = {
  sourceId: number
  data: DragData
  startX: number
  startY: number
  started: boolean
}

function finiteRangeNumber(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRangeNumber(value: number, stepAttribute: string | null | undefined): number {
  if (!stepAttribute || stepAttribute.toLowerCase() === "any") return Number(value.toFixed(6))
  const decimal = stepAttribute.includes(".") ? stepAttribute.split(".")[1]?.length ?? 0 : 0
  return Number(value.toFixed(Math.min(12, decimal)))
}

export class EventRegistry {
  readonly #handlers = new Map<number, Map<string, HostEventHandler>>()
  readonly #live = new Set<number>()
  readonly #targets = new Map<number, DomCompatTarget>()
  readonly #parents = new Map<number, number | null>()
  readonly #nativePointerDown = new Set<number>()
  readonly #activePointers = new Set<number>()
  readonly #pointerCapture = new Map<number, number>()
  readonly #lastPointerEvent = new Map<number, NativeEventPayload>()
  readonly #primaryClickBursts = new Map<number, ActivationBurst>()
  readonly #dragData = new Map<number, DragData>()
  #dragSession: DragSession | undefined
  #nativeClickBubble: NativeClickBubble | undefined
  #activeRangeId: number | undefined
  #lastClick: LastClick | undefined

  activate(id: number): void {
    this.#live.add(id)
  }

  setTarget(id: number, target: DomCompatTarget): void {
    this.#targets.set(id, target)
  }

  setDragData(id: number, data: DragData | undefined): void {
    if (data === undefined) this.#dragData.delete(id)
    else this.#dragData.set(id, data)
  }

  setParent(id: number, parentId: number | null): void {
    this.#parents.set(id, parentId)
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
    this.#parents.delete(id)
    this.#dragData.delete(id)
    if (this.#dragSession?.sourceId === id) this.#dragSession = undefined
    this.#nativePointerDown.delete(id)
    this.#primaryClickBursts.delete(id)
    if (this.#activeRangeId === id) this.#activeRangeId = undefined
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
      this.#parents.delete(id)
      this.#nativePointerDown.delete(id)
      this.#primaryClickBursts.delete(id)
    }
  }

  clear(): void {
    this.#handlers.clear()
    this.#live.clear()
    this.#targets.clear()
    this.#parents.clear()
    this.#dragData.clear()
    this.#dragSession = undefined
    this.#nativePointerDown.clear()
    this.#activePointers.clear()
    this.#pointerCapture.clear()
    this.#lastPointerEvent.clear()
    this.#primaryClickBursts.clear()
    this.#nativeClickBubble = undefined
    this.#activeRangeId = undefined
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
        if ((event.button ?? 0) === 0) {
          const sourceId = this.#dragSourceOwner(event.elementId)
          const data = sourceId === undefined ? undefined : this.#dragData.get(sourceId)
          this.#dragSession = sourceId === undefined || data === undefined
            ? undefined
            : {
                sourceId,
                data,
                startX: event.x ?? 0,
                startY: event.y ?? 0,
                started: false,
              }
        }
        // A real mouse-down is the authoritative boundary between physical
        // activations. It clears any delayed semantic-click carrier from the
        // previous release before this activation starts.
        this.#primaryClickBursts.clear()
        this.#activePointers.add(POINTER_ID)
        this.#lastPointerEvent.set(POINTER_ID, event)
        if ((event.button ?? 0) === 0 && this.#isRangeTarget(event.elementId)) {
          this.#activeRangeId = event.elementId
          if (this.#updateRangeValue(event.elementId, event)) this.#dispatchDom(event.elementId, "input", event)
        }
        this.#nativePointerDown.add(event.elementId)
        queueMicrotask(() => this.#nativePointerDown.delete(event.elementId))
        this.#dispatchDom(event.elementId, "pointerDown", event)
        this.#dispatchDom(event.elementId, "mouseDown", event)
        return
      }
      case "mouseMove": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        this.#advanceDrag(event.elementId, event)
        const activeRangeId = this.#activeRangeId
        if (activeRangeId !== undefined && this.#updateRangeValue(activeRangeId, event)) {
          this.#dispatchDom(activeRangeId, "input", { ...event, elementId: activeRangeId })
        }
        const capturedId = this.#pointerCapture.get(POINTER_ID)
        this.#dispatchDom(capturedId ?? event.elementId, "pointerMove", event)
        this.#dispatchDom(event.elementId, "mouseMove", event)
        return
      }
      case "mouseUp": {
        this.#lastPointerEvent.set(POINTER_ID, event)
        const completedDrag = this.#finishDrag(event.elementId, event)
        const activeRangeId = this.#activeRangeId
        if (activeRangeId !== undefined) {
          const rangeEvent = { ...event, elementId: activeRangeId }
          if (this.#updateRangeValue(activeRangeId, rangeEvent)) this.#dispatchDom(activeRangeId, "input", rangeEvent)
          this.#dispatchDom(activeRangeId, "change", rangeEvent)
          this.#activeRangeId = undefined
        }
        const capturedId = this.#pointerCapture.get(POINTER_ID)
        this.#dispatchDom(capturedId ?? event.elementId, "pointerUp", event)
        this.#dispatchDom(event.elementId, "mouseUp", event)
        const sourceElementId = event.elementId
        const clickOwner = (event.button ?? 0) === 0 ? this.#primaryClickOwner(sourceElementId) : undefined
        if (!completedDrag && clickOwner !== undefined) {
          const clickEvent = { ...event, elementId: clickOwner, eventType: "click", button: 0 } satisfies NativeEventPayload
          if (this.#shouldDispatchPrimaryClick(clickEvent, `mouseUp:${sourceElementId}`)) this.#dispatchPrimaryClick(clickEvent)
        }
        if (event.button === 2) this.#dispatchDom(event.elementId, "contextMenu", event)
        this.#activePointers.delete(POINTER_ID)
        if (capturedId !== undefined) this.#releasePointerCapture(capturedId, POINTER_ID)
        return
      }
      case "click": {
        if (this.#isBubbledNativeClick(event)) return
        const sourceElementId = event.elementId
        const clickOwner = this.#primaryClickOwner(sourceElementId)
        const clickEvent = clickOwner === undefined || clickOwner === sourceElementId
          ? event
          : { ...event, elementId: clickOwner }
        if (this.#shouldDispatchPrimaryClick(clickEvent, `click:${sourceElementId}`)) this.#dispatchPrimaryClick(clickEvent)
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

  #dragSourceOwner(elementId: number): number | undefined {
    let current: number | null | undefined = elementId
    while (current !== undefined && current !== null && this.#live.has(current)) {
      if (this.#dragData.has(current)) return current
      current = this.#parents.get(current)
    }
    return undefined
  }

  #dragEventOwner(elementId: number, eventType: "dragOver" | "drop"): number | undefined {
    let current: number | null | undefined = elementId
    while (current !== undefined && current !== null && this.#live.has(current)) {
      if (this.#handlers.get(current)?.has(eventType)) return current
      current = this.#parents.get(current)
    }
    return undefined
  }

  #advanceDrag(nativeTargetId: number, event: NativeEventPayload): void {
    const session = this.#dragSession
    if (!session) return
    if (!session.started) {
      const distance = Math.hypot((event.x ?? 0) - session.startX, (event.y ?? 0) - session.startY)
      if (distance < DRAG_START_DISTANCE_PX) return
      session.started = true
      this.#dispatchDom(
        session.sourceId,
        "dragStart",
        { ...event, elementId: session.sourceId },
        false,
        { dragData: session.data, dragSourceId: session.sourceId },
      )
    }

    const overId = this.#dragEventOwner(nativeTargetId, "dragOver")
    if (overId === undefined) return
    this.#dispatchDom(
      overId,
      "dragOver",
      { ...event, elementId: overId },
      false,
      { dragData: session.data, dragSourceId: session.sourceId, dropTargetId: overId },
    )
  }

  #finishDrag(nativeTargetId: number, event: NativeEventPayload): boolean {
    const session = this.#dragSession
    this.#dragSession = undefined
    if (!session?.started) return false

    const dropTargetId = this.#dragEventOwner(nativeTargetId, "drop")
    if (dropTargetId !== undefined) {
      this.#dispatchDom(
        dropTargetId,
        "drop",
        { ...event, elementId: dropTargetId },
        false,
        { dragData: session.data, dragSourceId: session.sourceId, dropTargetId },
      )
    }
    this.#dispatchDom(
      session.sourceId,
      "dragEnd",
      { ...event, elementId: session.sourceId },
      false,
      { dragData: session.data, dragSourceId: session.sourceId, dropTargetId },
    )
    return true
  }

  #isRangeTarget(elementId: number): boolean {
    return this.#targets.get(elementId)?.getAttribute("type")?.toLowerCase() === "range"
  }

  #isCheckboxTarget(elementId: number): boolean {
    return this.#targets.get(elementId)?.getAttribute("type")?.toLowerCase() === "checkbox"
  }

  #primaryClickOwner(elementId: number): number | undefined {
    if (this.#isCheckboxTarget(elementId)) return elementId
    let current: number | null | undefined = elementId
    while (current !== undefined && current !== null && this.#live.has(current)) {
      const handlers = this.#handlers.get(current)
      if (handlers?.has("click") || handlers?.has("dblClick")) return current
      current = this.#parents.get(current)
    }
    return undefined
  }

  #isBubbledNativeClick(event: NativeEventPayload): boolean {
    const button = event.button ?? 0
    const clickCount = event.clickCount ?? 1
    const x = event.x ?? 0
    const y = event.y ?? 0
    const previous = this.#nativeClickBubble
    if (
      previous
      && previous.ancestors.has(event.elementId)
      && previous.button === button
      && previous.clickCount === clickCount
      && previous.x === x
      && previous.y === y
    ) {
      return true
    }

    const ancestors = new Set<number>()
    let current = this.#parents.get(event.elementId)
    while (current !== undefined && current !== null) {
      ancestors.add(current)
      current = this.#parents.get(current)
    }
    const next: NativeClickBubble = { ancestors, button, clickCount, x, y }
    this.#nativeClickBubble = next
    queueMicrotask(() => {
      if (this.#nativeClickBubble === next) this.#nativeClickBubble = undefined
    })
    return false
  }

  #updateRangeValue(elementId: number, event: NativeEventPayload): boolean {
    const target = this.#targets.get(elementId)
    if (!target || target.getAttribute("type")?.toLowerCase() !== "range") return false
    const bounds = target.getBoundingClientRect()
    if (!(bounds.width > 0)) return false
    const min = finiteRangeNumber(target.getAttribute("min"), 0)
    const max = finiteRangeNumber(target.getAttribute("max"), 100)
    const low = Math.min(min, max)
    const high = Math.max(min, max)
    const ratio = Math.max(0, Math.min(1, ((event.x ?? bounds.left) - bounds.left) / bounds.width))
    const raw = low + (high - low) * ratio
    const stepAttribute = target.getAttribute("step")
    const step = stepAttribute?.toLowerCase() === "any" ? undefined : finiteRangeNumber(stepAttribute, 1)
    const quantized = step && step > 0 ? low + Math.round((raw - low) / step) * step : raw
    const next = String(normalizeRangeNumber(Math.max(low, Math.min(high, quantized)), stepAttribute))
    if (target.value === next) return false
    target.value = next
    return true
  }

  #dispatchPrimaryClick(event: NativeEventPayload): void {
    if (!this.#nativePointerDown.has(event.elementId)) {
      this.#dispatchDom(event.elementId, "pointerDown", event)
    }
    const target = this.#targets.get(event.elementId)
    const checkbox = target?.getAttribute("type")?.toLowerCase() === "checkbox" ? target : undefined
    const previousChecked = checkbox?.checked
    if (checkbox) checkbox.checked = !checkbox.checked
    const clickEvent = this.#dispatchDom(event.elementId, "click", event)
    if (checkbox && previousChecked !== undefined) {
      if (clickEvent?.defaultPrevented) {
        checkbox.checked = previousChecked
      } else {
        this.#dispatchDom(event.elementId, "input", event)
        this.#dispatchDom(event.elementId, "change", event)
      }
    }
    this.#maybeDispatchDoubleClick(event)
  }

  #shouldDispatchPrimaryClick(event: NativeEventPayload, sourceKey: string): boolean {
    const button = event.button ?? 0
    const clickCount = event.clickCount ?? 1
    const x = event.x ?? 0
    const y = event.y ?? 0
    const now = Date.now()
    const source: ActivationBurst["source"] = sourceKey.startsWith("mouseUp:") ? "mouseUp" : "click"
    const previous = this.#primaryClickBursts.get(event.elementId)
    const samePhysicalActivation = previous !== undefined
      && now - previous.at <= NATIVE_CLICK_RELAY_MS
      && previous.button === button
      && previous.clickCount === clickCount
      && Math.hypot(previous.x - x, previous.y - y) <= DOUBLE_CLICK_DISTANCE_PX

    if (samePhysicalActivation) {
      if (previous.source === "mouseUp" && source === "click") {
        previous.sourceKeys.add(sourceKey)
        return false
      }
      if (source === "click" && previous.source === "click" && previous.sourceKeys.has(sourceKey)) return false
      if (!previous.sourceKeys.has(sourceKey)) {
        previous.sourceKeys.add(sourceKey)
        return false
      }
    }

    const next: ActivationBurst = {
      elementId: event.elementId,
      sourceKeys: new Set([sourceKey]),
      source,
      button,
      clickCount,
      x,
      y,
      at: now,
    }
    this.#primaryClickBursts.set(event.elementId, next)
    // GPUIX may report one physical release through a retained mouse-up carrier and
    // then deliver the matching semantic click on a later host turn. The next real
    // mouse-down is the primary ownership boundary; the short time bound only keeps
    // a stale release from consuming an unrelated semantic-only activation when no
    // new pointer sequence occurs. Semantic-only bursts still clear in a microtask.
    if (source === "click") {
      queueMicrotask(() => {
        if (this.#primaryClickBursts.get(event.elementId) === next) this.#primaryClickBursts.delete(event.elementId)
      })
    }
    return true
  }

  #dispatchDom(
    elementId: number,
    eventType: string,
    nativeEvent: NativeEventPayload,
    globalOnly = false,
    extras?: {
      dragData?: DragData
      dragSourceId?: number | undefined
      dropTargetId?: number | undefined
    },
  ): EventPayload | undefined {
    if (!this.#live.has(elementId)) return undefined
    const target = this.#targets.get(elementId)
    const event = domCompatibleEvent({ ...nativeEvent, elementId }, target, eventType)
    if (extras) Object.assign(event, extras)
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
