import type { EventRegistry } from "./events.js"
import { MutationDriver, type MutationValue } from "./mutations.js"
import type { NativeRenderer } from "./types.js"

function isNumberValue<T>(value: T): value is T & number {
  return typeof value === "number"
}

function numberArg(args: MutationValue[], index: number): number {
  const value = args[index]
  if (!isNumberValue(value)) throw new TypeError(`Expected numeric mutation arg ${index}`)
  return value
}

/**
 * Browser window listeners observe pointer movement/release even when the exact
 * hit child has no local move/up handler. GPUIX exposes those events through
 * retained bubble listeners, so keep mouseMove/mouseUp subscribed on the mounted
 * app root and let EventRegistry forward them to window-level pointer listeners.
 */
export class BrowserPointerMutationDriver extends MutationDriver {
  #rootId: number | undefined

  constructor(renderer: NativeRenderer, events: EventRegistry) {
    super(renderer, events)
  }

  override enqueue(name: string, ...args: MutationValue[]): void {
    if (name === "setRoot") {
      const id = numberArg(args, 0)
      super.enqueue(name, ...args)
      this.#rootId = id
      super.enqueue("setEventListener", id, "mouseMove", true)
      super.enqueue("setEventListener", id, "mouseUp", true)
      return
    }

    if (name === "setEventListener" && numberArg(args, 0) === this.#rootId) {
      const eventType = args[1]
      if (eventType === "mouseMove" || eventType === "mouseUp") {
        // The root relay stays native even when the root has no authored local
        // handler. EventRegistry still controls whether any local DOM callback
        // runs, so retaining this subscription cannot resurrect removed handlers.
        return
      }
    }

    if (name === "destroyElement" && numberArg(args, 0) === this.#rootId) {
      this.#rootId = undefined
    }
    super.enqueue(name, ...args)
  }
}
