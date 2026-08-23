import type { NativeRenderer } from "./types.js"
import type { EventRegistry } from "./events.js"

export type MutationValue = string | number | boolean | object | null
export type Mutation = readonly [name: string, ...args: MutationValue[]]

const APPLY_BATCH_CUSTOM_PROP = "setCustomPropValue"

export class MutationDriver {
  readonly #renderer: NativeRenderer
  readonly #events: EventRegistry
  #queue: Mutation[] = []
  #scheduled = false
  #disposed = false

  constructor(renderer: NativeRenderer, events: EventRegistry) {
    this.#renderer = renderer
    this.#events = events
  }

  get renderer(): NativeRenderer {
    return this.#renderer
  }

  get pending(): number {
    return this.#queue.length
  }

  enqueue(name: string, ...args: MutationValue[]): void {
    if (this.#disposed) throw new Error("GPUix Solid mutation driver is disposed")
    this.#queue.push([name, ...args])
    this.#schedule()
  }

  flush(): void {
    if (this.#queue.length === 0) return
    const queue = this.#queue

    try {
      if (this.#renderer.applyBatch) {
        const destroyed = this.#renderer.applyBatch(JSON.stringify(queue))
        this.#queue = []
        this.#scheduled = false
        for (const id of destroyed) this.#events.deleteElement(id)
        return
      }

      const destroyed: number[] = []
      for (const [name, ...args] of queue) {
        if (name === "destroyElement") {
          destroyed.push(...this.#renderer.destroyElement(numberArg(args, 0)))
          continue
        }
        if (name === APPLY_BATCH_CUSTOM_PROP) {
          this.#renderer.setCustomProp(
            numberArg(args, 0),
            stringArg(args, 1),
            JSON.stringify(args[2] ?? null),
          )
          continue
        }
        callMutation(this.#renderer, name, args)
      }
      this.#renderer.commitMutations()
      this.#queue = []
      this.#scheduled = false
      for (const id of destroyed) this.#events.deleteElement(id)
    } catch (error) {
      // Keep the queue intact. A failed native batch must never be silently lost.
      this.#scheduled = false
      throw error
    }
  }

  dispose(): void {
    this.flush()
    this.#disposed = true
  }

  #schedule(): void {
    if (this.#scheduled) return
    this.#scheduled = true
    queueMicrotask(() => {
      if (!this.#scheduled || this.#disposed) return
      this.#scheduled = false
      try {
        this.flush()
      } catch (error) {
        // Automatic flushes cannot throw back into the originating signal write.
        // Keep the queue for an explicit retry and make the failure visible.
        console.error("[gpuix-solid] automatic native mutation flush failed", error)
      }
    })
  }
}

function callMutation(renderer: NativeRenderer, name: string, args: MutationValue[]): void {
  switch (name) {
    case "createElement":
      renderer.createElement(numberArg(args, 0), stringArg(args, 1))
      return
    case "appendChild":
      renderer.appendChild(numberArg(args, 0), numberArg(args, 1))
      return
    case "removeChild":
      renderer.removeChild(numberArg(args, 0), numberArg(args, 1))
      return
    case "insertBefore":
      renderer.insertBefore(numberArg(args, 0), numberArg(args, 1), numberArg(args, 2))
      return
    case "setStyle":
      renderer.setStyle(numberArg(args, 0), jsonArg(args, 1))
      return
    case "setText":
      renderer.setText(numberArg(args, 0), stringArg(args, 1))
      return
    case "setEventListener":
      renderer.setEventListener(numberArg(args, 0), stringArg(args, 1), booleanArg(args, 2))
      return
    case "setRoot":
      renderer.setRoot(numberArg(args, 0))
      return
    default:
      throw new Error(`Unsupported GPUIX mutation: ${name}`)
  }
}

function numberArg(args: MutationValue[], index: number): number {
  const value = args[index]
  if (typeof value !== "number") throw new TypeError(`Expected numeric mutation arg ${index}`)
  return value
}

function stringArg(args: MutationValue[], index: number): string {
  const value = args[index]
  if (typeof value !== "string") throw new TypeError(`Expected string mutation arg ${index}`)
  return value
}

function booleanArg(args: MutationValue[], index: number): boolean {
  const value = args[index]
  if (typeof value !== "boolean") throw new TypeError(`Expected boolean mutation arg ${index}`)
  return value
}

function jsonArg(args: MutationValue[], index: number): string {
  const value = args[index]
  if (typeof value === "string") return value
  if (value && typeof value === "object") return JSON.stringify(value)
  throw new TypeError(`Expected object/string mutation arg ${index}`)
}
