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
  ["onMouseDown", "mouseDown"],
  ["onPointerDown", "mouseDown"],
  ["onMouseUp", "mouseUp"],
  ["onPointerUp", "mouseUp"],
  ["onPointerCancel", "mouseUp"],
  ["onLostPointerCapture", "mouseUp"],
  ["onMouseEnter", "mouseEnter"],
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
  if (!Object.hasOwn(target, "dataset")) {
    Object.defineProperty(target, "dataset", {
      configurable: true,
      enumerable: true,
      writable: false,
      value: {},
    })
  }
  if (!Object.hasOwn(target, "addEventListener")) {
    Object.defineProperty(target, "addEventListener", {
      configurable: true,
      enumerable: true,
      value: () => undefined,
    })
  }
  if (!Object.hasOwn(target, "removeEventListener")) {
    Object.defineProperty(target, "removeEventListener", {
      configurable: true,
      enumerable: true,
      value: () => undefined,
    })
  }
  if (!Object.hasOwn(target, "dispatchEvent")) {
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

function globalEventName(eventType: string): string | undefined {
  if (eventType === "mouseMove") return "pointermove"
  if (eventType === "mouseUp") return "pointerup"
  if (eventType === "mouseDown") return "pointerdown"
  return undefined
}

function dispatchGlobalEvent(event: EventPayload): void {
  const name = globalEventName(event.eventType)
  if (!name) return
  for (const handler of globalListeners.get(name) ?? []) handler(event)
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
      value: { body: { classList } },
    })
  }
}

export class EventRegistry {
  readonly #handlers = new Map<number, Map<string, HostEventHandler>>()
  readonly #live = new Set<number>()
  readonly #targets = new Map<number, DomCompatTarget>()

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
    }
  }

  clear(): void {
    this.#handlers.clear()
    this.#live.clear()
    this.#targets.clear()
  }

  has(id: number, eventType: string): boolean {
    return this.#handlers.get(id)?.has(eventType) ?? false
  }

  dispatch(event: NativeEventPayload): void {
    if (!this.#live.has(event.elementId)) return
    const domEvent = domCompatibleEvent(event, this.#targets.get(event.elementId))
    this.#handlers.get(event.elementId)?.get(event.eventType)?.(domEvent)
    dispatchGlobalEvent(domEvent)
  }
}
