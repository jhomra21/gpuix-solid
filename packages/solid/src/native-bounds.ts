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

export type LegacyElementBoundsRenderer<Renderer extends ElementBoundsRenderer> =
  Omit<Renderer, "getElementBounds"> & {
    getElementBounds(elementId: number): number[] | null
  }

/**
 * Normalize GPUIX's live bounds API at the native boundary.
 *
 * Published 0.7.0 returns `[x, y, width, height]`; current source returns an
 * `{ x, y, width, height }` object. Solid keeps the legacy wire shape internally
 * so automation and the batch adapter do not need runtime-version branches.
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
  return renderer as LegacyElementBoundsRenderer<Renderer>
}
