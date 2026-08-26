import type { EventPayload } from "@gpuix/native"
import type { HostEventHandler } from "./types.js"

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

export type DomCompatTarget = {
  value: string
  scrollTop: number
  scrollLeft: number
  style: Record<string, unknown>
  classList: {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
  }
  focus: () => void
  blur: () => void
  select: () => void
  setPointerCapture: (pointerId: number) => void
  releasePointerCapture: (pointerId: number) => void
  hasPointerCapture: (pointerId: number) => boolean
  getBoundingClientRect: () => {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }
}

type DomCompatEvent = EventPayload & {
  currentTarget: DomCompatTarget
  target: DomCompatTarget
  clientX: number
  clientY: number
  pointerId: number
  shiftKey: boolean
  metaKey: boolean
  altKey: boolean
  ctrlKey: boolean
  preventDefault: () => void
  stopPropagation: () => void
}

function fallbackTarget(event: EventPayload): DomCompatTarget {
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

function domCompatibleEvent(event: EventPayload, target: DomCompatTarget | undefined): DomCompatEvent {
  const x = event.x ?? 0
  const y = event.y ?? 0
  const currentTarget = target ?? fallbackTarget(event)

  return Object.assign({}, event, {
    currentTarget,
    target: currentTarget,
    clientX: x,
    clientY: y,
    pointerId: 0,
    shiftKey: false,
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  })
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

  dispatch(event: EventPayload): void {
    if (!this.#live.has(event.elementId)) return
    this.#handlers.get(event.elementId)?.get(event.eventType)?.(
      domCompatibleEvent(event, this.#targets.get(event.elementId)),
    )
  }
}
