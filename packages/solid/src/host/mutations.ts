import type { DimensionValue, NativeRenderer, StyleDesc } from "./types.js"
import type { EventRegistry } from "./events.js"

export type MutationValue = string | number | boolean | object | null
export type Mutation = readonly [name: string, ...args: MutationValue[]]

const APPLY_BATCH_CUSTOM_PROP = "setCustomProp"

type DimensionStyleKey =
  | "width"
  | "height"
  | "minWidth"
  | "minHeight"
  | "maxWidth"
  | "maxHeight"

type NumberStyleKey =
  | "flexGrow"
  | "flexShrink"
  | "flexBasis"
  | "gap"
  | "rowGap"
  | "columnGap"
  | "gridTemplateColumns"
  | "gridTemplateRows"
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "margin"
  | "marginTop"
  | "marginRight"
  | "marginBottom"
  | "marginLeft"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "opacity"
  | "borderWidth"
  | "borderTopWidth"
  | "borderRightWidth"
  | "borderBottomWidth"
  | "borderLeftWidth"
  | "borderRadius"
  | "borderTopLeftRadius"
  | "borderTopRightRadius"
  | "borderBottomLeftRadius"
  | "borderBottomRightRadius"
  | "fontSize"
  | "lineHeight"
  | "lineClamp"

type StyleMutationInput = Omit<StyleDesc, DimensionStyleKey | NumberStyleKey | "hover" | "active"> &
  { [K in DimensionStyleKey]?: DimensionValue } &
  { [K in NumberStyleKey]?: number | string } & {
    hover?: StyleMutationInput
    active?: StyleMutationInput
  }

type BoxShorthand = {
  value?: number
  top?: number
  right?: number
  bottom?: number
  left?: number
}

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
      // SAFETY: setStyle is only enqueued with the renderer-owned StyleDesc object; this boundary widens numeric fields solely to accept CSS unit strings before native serialization.
      const style = args[1] as StyleMutationInput
      args[1] = normalizeStyleMutation(style)
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

function normalizeStyleMutation(style: StyleMutationInput): StyleDesc {
  const padding = normalizeBoxShorthand(style.padding, "padding")
  const margin = normalizeBoxShorthand(style.margin, "margin")
  const fontSize = normalizeNumberStyle(style.fontSize, "fontSize")
  const normalized = {
    ...style,
    flexGrow: normalizeNumberStyle(style.flexGrow, "flexGrow"),
    flexShrink: normalizeNumberStyle(style.flexShrink, "flexShrink"),
    flexBasis: normalizeNumberStyle(style.flexBasis, "flexBasis"),
    gap: normalizeNumberStyle(style.gap, "gap"),
    rowGap: normalizeNumberStyle(style.rowGap, "rowGap"),
    columnGap: normalizeNumberStyle(style.columnGap, "columnGap"),
    gridTemplateColumns: normalizeNumberStyle(style.gridTemplateColumns, "gridTemplateColumns"),
    gridTemplateRows: normalizeNumberStyle(style.gridTemplateRows, "gridTemplateRows"),
    width: normalizeDimensionStyle(style.width, fontSize ?? 16),
    height: normalizeDimensionStyle(style.height, fontSize ?? 16),
    minWidth: normalizeDimensionStyle(style.minWidth, fontSize ?? 16),
    minHeight: normalizeDimensionStyle(style.minHeight, fontSize ?? 16),
    maxWidth: normalizeDimensionStyle(style.maxWidth, fontSize ?? 16),
    maxHeight: normalizeDimensionStyle(style.maxHeight, fontSize ?? 16),
    padding: padding.value,
    paddingTop: normalizeNumberStyle(style.paddingTop, "paddingTop") ?? padding.top,
    paddingRight: normalizeNumberStyle(style.paddingRight, "paddingRight") ?? padding.right,
    paddingBottom: normalizeNumberStyle(style.paddingBottom, "paddingBottom") ?? padding.bottom,
    paddingLeft: normalizeNumberStyle(style.paddingLeft, "paddingLeft") ?? padding.left,
    margin: margin.value,
    marginTop: normalizeNumberStyle(style.marginTop, "marginTop") ?? margin.top,
    marginRight: normalizeNumberStyle(style.marginRight, "marginRight") ?? margin.right,
    marginBottom: normalizeNumberStyle(style.marginBottom, "marginBottom") ?? margin.bottom,
    marginLeft: normalizeNumberStyle(style.marginLeft, "marginLeft") ?? margin.left,
    top: normalizeNumberStyle(style.top, "top"),
    right: normalizeNumberStyle(style.right, "right"),
    bottom: normalizeNumberStyle(style.bottom, "bottom"),
    left: normalizeNumberStyle(style.left, "left"),
    opacity: normalizeNumberStyle(style.opacity, "opacity"),
    borderWidth: normalizeNumberStyle(style.borderWidth, "borderWidth"),
    borderTopWidth: normalizeNumberStyle(style.borderTopWidth, "borderTopWidth"),
    borderRightWidth: normalizeNumberStyle(style.borderRightWidth, "borderRightWidth"),
    borderBottomWidth: normalizeNumberStyle(style.borderBottomWidth, "borderBottomWidth"),
    borderLeftWidth: normalizeNumberStyle(style.borderLeftWidth, "borderLeftWidth"),
    borderRadius: normalizeNumberStyle(style.borderRadius, "borderRadius"),
    borderTopLeftRadius: normalizeNumberStyle(style.borderTopLeftRadius, "borderTopLeftRadius"),
    borderTopRightRadius: normalizeNumberStyle(style.borderTopRightRadius, "borderTopRightRadius"),
    borderBottomLeftRadius: normalizeNumberStyle(style.borderBottomLeftRadius, "borderBottomLeftRadius"),
    borderBottomRightRadius: normalizeNumberStyle(style.borderBottomRightRadius, "borderBottomRightRadius"),
    fontSize,
    lineHeight: normalizeNumberStyle(style.lineHeight, "lineHeight"),
    lineClamp: normalizeNumberStyle(style.lineClamp, "lineClamp"),
    overflow: normalizeOverflowStyle(style.overflow),
    overflowX: normalizeOverflowStyle(style.overflowX),
    overflowY: normalizeOverflowStyle(style.overflowY),
    hover: style.hover ? normalizeStyleMutation(style.hover) : undefined,
    active: style.active ? normalizeStyleMutation(style.active) : undefined,
  }
  // SAFETY: every widened numeric StyleMutationInput field above is converted to the corresponding StyleDesc number contract before this object crosses the native boundary; undefined optional fields are omitted by JSON serialization.
  return normalized as StyleDesc
}

function normalizeBoxShorthand(
  value: number | string | undefined,
  property: "padding" | "margin",
): BoxShorthand {
  if (value === undefined) return {}
  if (isNumberValue(value)) return { value }

  const scalar = parseNumericCssValue(value)
  if (scalar !== undefined) return { value: scalar }

  const parts = value.trim().split(/\s+/)
  if (parts.length < 2 || parts.length > 4) {
    throw new TypeError(`Unsupported numeric inline style ${property}: ${JSON.stringify(value)}`)
  }

  const values = parts.map(parseNumericCssValue)
  if (values.some((part) => part === undefined)) {
    throw new TypeError(`Unsupported numeric inline style ${property}: ${JSON.stringify(value)}`)
  }

  const top = values[0]!
  const right = values[1]!
  const bottom = values.length >= 3 ? values[2]! : top
  const left = values.length === 4 ? values[3]! : right
  return { top, right, bottom, left }
}

function normalizeNumberStyle(value: number | string | undefined, property: NumberStyleKey): number | undefined {
  if (value === undefined) return undefined
  if (isNumberValue(value)) return value
  const normalized = parseNumericCssValue(value)
  if (normalized !== undefined) return normalized
  throw new TypeError(`Unsupported numeric inline style ${property}: ${JSON.stringify(value)}`)
}

function normalizeDimensionStyle(
  value: DimensionValue | undefined,
  fontSize: number,
): DimensionValue | undefined {
  if (value === undefined || isNumberValue(value)) return value
  const trimmed = value.trim()
  if (isIntrinsicCssDimension(trimmed)) return "auto"
  const em = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))em$/i)
  if (em) return Number(em[1]) * fontSize
  return parseNumericCssValue(trimmed) ?? value
}

function isIntrinsicCssDimension(value: string): boolean {
  return value === "max-content"
    || value === "min-content"
    || value === "fit-content"
    || value.startsWith("fit-content(")
}

function normalizeOverflowStyle(value: string | undefined): string | undefined {
  return value === "auto" ? "scroll" : value
}

function parseNumericCssValue(value: string): number | undefined {
  const trimmed = value.trim()
  if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) return Number(trimmed)
  const pixel = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/i)
  if (pixel) return Number(pixel[1])
  const rem = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/i)
  if (rem) return Number(rem[1]) * 16
  return undefined
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
