import type { EventPayload } from "@gpuix/native"
import type { EventRegistry } from "./events.js"
import { MutationDriver, type MutationValue } from "./mutations.js"
import type { NativeRenderer } from "./types.js"

type PointerLifecycleEvent = "mouseDown" | "mouseMove" | "mouseUp"
interface PointerLifecycleState {
  mouseDown: boolean
  mouseMove: boolean
  mouseUp: boolean
}

type PointerReleaseBurst = {
  x: number
  y: number
  button: number
}

function emptyPointerLifecycleState() {
  return { mouseDown: false, mouseMove: false, mouseUp: false } satisfies PointerLifecycleState
}

function isNumberValue<T>(value: T): value is T & number {
  return typeof value === "number"
}

function numberArg(args: MutationValue[], index: number): number {
  const value = args[index]
  if (!isNumberValue(value)) throw new TypeError(`Expected numeric mutation arg ${index}`)
  return value
}

function booleanArg(args: MutationValue[], index: number): boolean {
  const value = args[index]
  if (value === true) return true
  if (value === false) return false
  throw new TypeError(`Expected boolean mutation arg ${index}`)
}

function pointerLifecycleEvent(value: MutationValue | undefined): PointerLifecycleEvent | undefined {
  if (value === "mouseDown" || value === "mouseMove" || value === "mouseUp") return value
  return undefined
}

function releaseBurst(event: EventPayload): PointerReleaseBurst {
  return { x: event.x ?? 0, y: event.y ?? 0, button: event.button ?? 0 }
}

function sameReleaseBurst(left: PointerReleaseBurst, right: PointerReleaseBurst): boolean {
  return left.x === right.x && left.y === right.y && left.button === right.button
}

/**
 * The mounted root carries synthetic mouse-up subscription as a browser-window
 * relay. Native pointer capture can outlive a retained node replacement on some
 * platforms, so a later stationary click can surface only through that root
 * relay even though its pressed target is still mounted under the pointer.
 *
 * Native hit paths can report more than one subscribed non-root node for one
 * physical press. Keep refining the pressed owner as those reports arrive so
 * the local/deepest listener remains the release fallback. A mouse-up reported
 * for a different non-root subscription must not consume that fallback. A
 * direct release on the remembered owner wins; if only the root gets the
 * release, route it back to the still-live target inside its painted bounds.
 */
export class BrowserPointerReleaseRelay {
  #pressedElementId: number | undefined
  #rootFallback: { elementId: number; burst: PointerReleaseBurst } | undefined

  route(
    event: EventPayload,
    rootId: number | undefined,
    canRouteRootRelease: (elementId: number, event: EventPayload) => boolean,
  ): EventPayload | undefined {
    if (event.eventType === "mouseDown") {
      if (event.elementId !== rootId) this.#pressedElementId = event.elementId
      return event
    }

    if (event.eventType !== "mouseUp") return event
    const burst = releaseBurst(event)

    if (event.elementId !== rootId) {
      const fallback = this.#rootFallback
      if (fallback && fallback.elementId === event.elementId && sameReleaseBurst(fallback.burst, burst)) {
        this.#rootFallback = undefined
        return undefined
      }
      if (event.elementId === this.#pressedElementId) this.#pressedElementId = undefined
      return event
    }

    const pressedElementId = this.#pressedElementId
    this.#pressedElementId = undefined
    if (
      pressedElementId === undefined
      || pressedElementId === rootId
      || !canRouteRootRelease(pressedElementId, event)
    ) {
      return event
    }

    const fallback = { elementId: pressedElementId, burst }
    this.#rootFallback = fallback
    queueMicrotask(() => {
      if (this.#rootFallback === fallback) this.#rootFallback = undefined
    })
    return { ...event, elementId: pressedElementId }
  }

  clear(): void {
    this.#pressedElementId = undefined
    this.#rootFallback = undefined
  }
}

/**
 * GPUIX captures a pointer when the same retained node subscribes to both
 * mouseDown and mouseMove. Browser code commonly starts a gesture locally and
 * then listens on window for pointermove/pointerup, so a mouse-down owner needs
 * native move/up channels even when it has no authored local handlers for them.
 *
 * A drag can also replace its pressed retained node during pointermove. Keep
 * move/up subscribed on the mounted app root as a stable browser-window relay
 * so the release can still reach global listeners after that replacement.
 * EventRegistry remains authoritative for authored local handlers.
 */
export class BrowserPointerMutationDriver extends MutationDriver {
  readonly #authored = new Map<number, PointerLifecycleState>()
  readonly #applied = new Map<number, PointerLifecycleState>()
  #rootId: number | undefined

  constructor(renderer: NativeRenderer, events: EventRegistry) {
    super(renderer, events)
  }

  override enqueue(name: string, ...args: MutationValue[]): void {
    if (name === "setRoot") {
      const id = numberArg(args, 0)
      super.enqueue(name, ...args)
      this.#rootId = id
      this.#syncPointerLifecycle(id)
      return
    }

    if (name === "setEventListener") {
      const eventType = pointerLifecycleEvent(args[1])
      if (eventType) {
        const id = numberArg(args, 0)
        const state = this.#authored.get(id) ?? emptyPointerLifecycleState()
        state[eventType] = booleanArg(args, 2)
        this.#authored.set(id, state)
        this.#syncPointerLifecycle(id)
        return
      }
    }

    if (name === "destroyElement") {
      const id = numberArg(args, 0)
      this.#authored.delete(id)
      this.#applied.delete(id)
      if (this.#rootId === id) this.#rootId = undefined
    }
    super.enqueue(name, ...args)
  }

  #syncPointerLifecycle(id: number): void {
    const authored = this.#authored.get(id) ?? emptyPointerLifecycleState()
    const isRootRelay = id === this.#rootId
    const desired = {
      mouseDown: authored.mouseDown,
      mouseMove: authored.mouseMove || authored.mouseDown || isRootRelay,
      mouseUp: authored.mouseUp || authored.mouseDown || isRootRelay,
    } satisfies PointerLifecycleState
    const applied = this.#applied.get(id) ?? emptyPointerLifecycleState()

    for (const eventType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      if (applied[eventType] === desired[eventType]) continue
      super.enqueue("setEventListener", id, eventType, desired[eventType])
      applied[eventType] = desired[eventType]
    }
    this.#applied.set(id, applied)
  }
}
