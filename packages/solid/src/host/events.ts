import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import type { DomCompatTarget, EventPayload, HostEventHandler } from "./types.js"

export type { DomCompatTarget } from "./types.js"

export const EVENT_PROPS = [
  ["onToggleFile", "toggleFile"],
  ["onShowMore", "showMore"],
  ["onLineClick", "lineClick"],
  ["onLinkClick", "linkClick"],
  ["onVisibleRange", "visibleRange"],
  ["onChange", "change"],
  ["onInput", "change"],
  ["onSubmit", "submit"],
  ["onClick", "click"],
  ["onContextMenu", "contextMenu"],
  ["onMouseDown", "mouseDown"],
  ["onPointerDown", "mouseDown"],
  ["onMouseUp", "mouseUp"],
  ["onPointerUp", "mouseUp"],
  ["onPointerCancel", "mouseUp"],
  ["onLostPointerCapture", "mouseUp"],
  ["onMouseEnter", "mouseEnter"],
  ["onPointerEnter", "mouseEnter"],
  ["onMouseLeave", "mouseLeave"],
  ["onPointerLeave", "mouseLeave"],
  ["onMouseMove", "mouseMove"],
  ["onPointerMove", "mouseMove"],
  ["onMouseDownOutside", "mouseDownOutside"],
  ["onKeyDown", "keyDown"],
  ["onKeyUp", "keyUp"],
  ["onFocus", "focus"],
  ["onBlur", "blur"],
  ["onScroll", "scroll"],
] as const

export type EventPropName = (typeof EVENT_PROPS)[number][0]
export type NativeEventType = (typeof EVENT_PROPS)[number][1]

export const EVENT_PROP_TO_TYPE = new Map<string, NativeEventType>(EVENT_PROPS)

type GlobalEventHandler = (event: EventPayload) => void
const globalListeners = new Map<string, Set<GlobalEventHandler>>()

installNativeDomGlobals()

function fallbackTarget(event: NativeEventPayload): DomCompatTarget {
  const x = event.x ?? 0
  const y = event.y ?? 0
  return {
    value: event.value ?? "",
    scrollTop: 0,
    scrollLeft: 0,
    style: {},
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

function pointerCompatibleTarget(target: DomCompatTarget): DomCompatTarget & EventTarget {
  if (!("dataset" in target)) {
    Object.defineProperty(target, "dataset", {
      configurable: true,
      enumerable: true,
      writable: false,
      value: {},
    })
  }
  if (!("addEventListener" in target)) {
    Object.defineProperty(target, "addEventListener", {
      configurable: true,
      enumerable: true,
      value: () => undefined,
    })
  }
  if (!("removeEventListener" in target)) {
    Object.defineProperty(target, "removeEventListener", {
      configurable: true,
      enumerable: true,
      value: () => undefined,
    })
  }
  if (!("dispatchEvent" in target)) {
    Object.defineProperty(target, "dispatchEvent", {
      configurable: true,
      enumerable: true,
      value: () => true,
    })
  }
  // SAFETY: the three EventTarget methods are either preserved from the host element or installed above before this value is returned.
  return target as DomCompatTarget & EventTarget
}

function domCompatibleEvent(event: NativeEventPayload, target: DomCompatTarget | undefined): EventPayload {
  const x = event.x ?? 0
  const y = event.y ?? 0
  const currentTarget = pointerCompatibleTarget(target ?? fallbackTarget(event))
  if (event.value !== undefined) currentTarget.value = event.value

  return Object.assign({}, event, {
    currentTarget,
    target: currentTarget,
    clientX: x,
    clientY: y,
    pointerId: 0,
    pointerType: "mouse",
    shiftKey: event.modifiers?.shift ?? false,
    metaKey: event.modifiers?.cmd ?? false,
    altKey: event.modifiers?.alt ?? false,
    ctrlKey: event.modifiers?.ctrl ?? false,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  })
}

function pointerDownFromClick(event: EventPayload): EventPayload {
  return { ...event, eventType: "mouseDown" }
}

function contextMenuEvent(event: EventPayload): EventPayload {
  return {
    ...event,
    eventType: "contextMenu",
    button: 2,
    isRightClick: true,
  }
}

function globalEventName(eventType: string): string | undefined {
  if (eventType === "mouseMove") return "pointermove"
  if (eventType === "mouseUp") return "pointerup"
  if (eventType === "mouseDown") return "pointerdown"
  if (eventType === "click") return "click"
  return undefined
}

function createGlobalDomEvent(name: string, event: EventPayload, currentTarget: EventTarget): Event {
  const domEvent = new Event(name, { bubbles: true, cancelable: true })
  const target = event.target ?? null
  Object.defineProperties(domEvent, {
    target: { configurable: true, value: target },
    currentTarget: { configurable: true, value: currentTarget },
    clientX: { configurable: true, value: event.clientX ?? 0 },
    clientY: { configurable: true, value: event.clientY ?? 0 },
    pointerId: { configurable: true, value: event.pointerId ?? 0 },
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

function dispatchGlobalEvent(event: EventPayload): void {
  const name = globalEventName(event.eventType)
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

export class EventRegistry {
  readonly #handlers = new Map<number, Map<string, HostEventHandler>>()
  readonly #live = new Set<number>()
  readonly #targets = new Map<number, DomCompatTarget>()
  readonly #nativePointerDown = new Set<number>()

  activate(id: number): void {
    this.#live.add(id)
  }

  setTarget(id: number, target: DomCompatTarget): void {
    this.#targets.set(id, target)
  }

  deactivate(id: number): void {
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
    // A node can be destroyed and recreated with the same root-scoped ID in
    // one native batch. Preserve handlers if the JS host node is live again.
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
  }

  has(id: number, eventType: string): boolean {
    return this.#handlers.get(id)?.has(eventType) ?? false
  }

  dispatch(event: NativeEventPayload): void {
    if (!this.#live.has(event.elementId)) return
    const domEvent = domCompatibleEvent(event, this.#targets.get(event.elementId))
    const handlers = this.#handlers.get(event.elementId)

    if (event.eventType === "mouseDown") {
      this.#nativePointerDown.add(event.elementId)
      queueMicrotask(() => this.#nativePointerDown.delete(event.elementId))
    } else if (event.eventType === "click" && !this.#nativePointerDown.has(event.elementId)) {
      dispatchGlobalEvent(pointerDownFromClick(domEvent))
    }

    handlers?.get(event.eventType)?.(domEvent)
    if (event.eventType === "mouseUp" && event.button === 2) {
      handlers?.get("contextMenu")?.(contextMenuEvent(domEvent))
    }
    dispatchGlobalEvent(domEvent)
  }
}
