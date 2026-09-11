export interface NativeElementBoundsObject {
  x: number
  y: number
  width: number
  height: number
}

export type NativeElementBoundsValue = number[] | NativeElementBoundsObject | null

export function normalizeNativeElementBounds(bounds: NativeElementBoundsValue): number[] | null {
  if (bounds === null) return null
  if (Array.isArray(bounds)) {
    if (bounds.length < 4) {
      throw new Error("Native element bounds did not contain four coordinates")
    }
    return bounds
  }
  return [bounds.x, bounds.y, bounds.width, bounds.height]
}

type ElementBoundsRenderer = {
  getElementBounds(elementId: number): NativeElementBoundsValue
}

type NativePointerTraceEvent = {
  eventType?: string
  elementId?: number
  x?: number
  y?: number
}

type EventDrainRenderer = {
  drainEvents?: () => NativePointerTraceEvent[]
}

export type LegacyElementBoundsRenderer<Renderer extends ElementBoundsRenderer> =
  Omit<Renderer, "getElementBounds"> & {
    getElementBounds(elementId: number): number[] | null
  }

/**
 * Normalize GPUIX's live bounds API at the native boundary.
 *
 * Published 0.7.0 returns `[x, y, width, height]`; current source returns an
 * `{ x, y, width, height }` object. Solid 1 keeps the legacy wire shape
 * internally so its runtime and test helpers do not need version branches.
 */
export function withLegacyElementBounds<Renderer extends ElementBoundsRenderer>(
  renderer: Renderer,
): LegacyElementBoundsRenderer<Renderer> {
  const getElementBounds = renderer.getElementBounds.bind(renderer)
  Object.defineProperty(renderer, "getElementBounds", {
    configurable: true,
    value(elementId: number) {
      return normalizeNativeElementBounds(getElementBounds(elementId))
    },
  })

  // TEMPORARY DIAGNOSTIC: prove whether GPUIX emits the DAW clip release before
  // Solid's live-element guard and pointer relay see the raw native event.
  // SAFETY: this optional structural view is used only to wrap an existing
  // method in place; renderers without drainEvents are left unchanged.
  const eventRenderer = renderer as Renderer & EventDrainRenderer
  if (eventRenderer.drainEvents) {
    const drainEvents = eventRenderer.drainEvents.bind(renderer)
    Object.defineProperty(renderer, "drainEvents", {
      configurable: true,
      value() {
        const events = drainEvents()
        for (const event of events) {
          const x = event.x
          const y = event.y
          if (
            (event.eventType === "mouseDown" || event.eventType === "mouseUp")
            && x !== undefined
            && y !== undefined
            && Math.abs(x - 460) <= 2
            && Math.abs(y - 156.5) <= 2
          ) {
            console.log(`[native-drain-trace] ${event.eventType}:raw=${event.elementId ?? "none"}:${x},${y}`)
          }
        }
        return events
      },
    })
  }

  // SAFETY: the method was replaced above with the exact legacy return contract;
  // every other property remains on the same renderer object unchanged.
  return renderer as LegacyElementBoundsRenderer<Renderer>
}