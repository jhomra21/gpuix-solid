import type { NativeRenderer } from "./types.js"
import type { EventRegistry } from "./events.js"

export type MutationValue = string | number | boolean | object | null
export type Mutation = readonly [name: string, ...args: MutationValue[]]

const APPLY_BATCH_CUSTOM_PROP = "setCustomPropValue"
const NUMERIC_STYLE_PROPERTIES = new Set([
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "top",
  "right",
  "bottom",
  "left",
  "opacity",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "fontSize",
  "lineHeight",
  "lineClamp",
  "offsetX",
  "offsetY",
  "blurRadius",
  "spreadRadius",
])
const NESTED_STYLE_PROPERTIES = new Set(["hover", "active", "boxShadow"])

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
    if (name === "setStyle" && isObjectValue(args[1]) && !Array.isArray(args[1])) {
      args[1] = normalizeStyleObject(args[1])
    }
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
        for (const id of destroyed) this.#events.deleteDestroyed(id)
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
      for (const id of destroyed) this.#events.deleteDestroyed(id)
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

function normalizeStyleObject(style: object): object {
  const normalized: Record<string, unknown> = { ...style as Record<string, unknown> }
  for (const [property, value] of Object.entries(normalized)) {
    if (NESTED_STYLE_PROPERTIES.has(property) && isObjectValue(value) && !Array.isArray(value)) {
      normalized[property] = normalizeStyleObject(value)
      continue
    }
    if (NUMERIC_STYLE_PROPERTIES.has(property)) {
      normalized[property] = normalizeNumericStyleValue(value)
    }
  }
  return normalized
}

function normalizeNumericStyleValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  const numeric = trimmed.match(/^-?(?:\d+(?:\.\d+)?|\.\d+)$/)
  if (numeric) return Number(trimmed)
  const pixel = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/i)
  if (pixel) return Number(pixel[1])
  const rem = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/i)
  if (rem) return Number(rem[1]) * 16
  return value
}

function numberArg(args: MutationValue[], index: number): number {
  const value = args[index]
  if (!isNumberValue(value)) throw new TypeError(`Expected numeric mutation arg ${index}`)
  return value
}

function stringArg(args: MutationValue[], index: number): string {
  const value = args[index]
  if (!isStringValue(value)) throw new TypeError(`Expected string mutation arg ${index}`)
  return value
}

function booleanArg(args: MutationValue[], index: number): boolean {
  const value = args[index]
  if (!isBooleanValue(value)) throw new TypeError(`Expected boolean mutation arg ${index}`)
  return value
}

function jsonArg(args: MutationValue[], index: number): string {
  const value = args[index]
  if (isStringValue(value)) return value
  if (isObjectValue(value)) return JSON.stringify(value)
  throw new TypeError(`Expected object/string mutation arg ${index}`)
}

function isNumberValue<T>(value: T): value is T & number {
  return typeof value === "number"
}

function isStringValue<T>(value: T): value is T & string {
  return typeof value === "string"
}

function isBooleanValue<T>(value: T): value is T & boolean {
  return typeof value === "boolean"
}

function isObjectValue<T>(value: T): value is T & object {
  return value !== null && typeof value === "object"
}
