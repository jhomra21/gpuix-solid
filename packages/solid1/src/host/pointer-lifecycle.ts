import type { EventRegistry } from "./events.js"
import { MutationDriver, type MutationValue } from "./mutations.js"
import type { NativeRenderer } from "./types.js"

type PointerLifecycleEvent = "mouseDown" | "mouseMove" | "mouseUp"
interface PointerLifecycleState {
  mouseDown: boolean
  mouseMove: boolean
  mouseUp: boolean
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
