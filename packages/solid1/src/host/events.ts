import type { EventPayload } from "@gpuix/native"
import type { HostEventHandler } from "./types.js"

export const EVENT_PROPS = [
  ["onToggleFile", "toggleFile"],
  ["onShowMore", "showMore"],
  ["onLineClick", "lineClick"],
  ["onLinkClick", "linkClick"],
  ["onChange", "change"],
  ["onSubmit", "submit"],
  ["onClick", "click"],
  ["onMouseDown", "mouseDown"],
  ["onMouseUp", "mouseUp"],
  ["onMouseEnter", "mouseEnter"],
  ["onMouseLeave", "mouseLeave"],
  ["onMouseMove", "mouseMove"],
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

export class EventRegistry {
  readonly #handlers = new Map<number, Map<string, HostEventHandler>>()
  readonly #live = new Set<number>()

  activate(id: number): void {
    this.#live.add(id)
  }

  deactivate(id: number): void {
    this.#live.delete(id)
    this.#handlers.delete(id)
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
    if (!this.#live.has(id)) this.#handlers.delete(id)
  }

  clear(): void {
    this.#handlers.clear()
    this.#live.clear()
  }

  has(id: number, eventType: string): boolean {
    return this.#handlers.get(id)?.has(eventType) ?? false
  }

  dispatch(event: EventPayload): void {
    if (!this.#live.has(event.elementId)) return
    this.#handlers.get(event.elementId)?.get(event.eventType)?.(event)
  }
}
