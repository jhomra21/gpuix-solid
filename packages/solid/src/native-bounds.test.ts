import { describe, expect, it } from "vitest"
import {
  normalizeNativeElementBounds,
  withLegacyElementBounds,
} from "./native-bounds.js"

describe("native element bounds compatibility", () => {
  it("preserves the published 0.7 array shape", () => {
    const bounds = [1, 2, 300, 200]
    expect(normalizeNativeElementBounds(bounds)).toBe(bounds)
  })

  it("normalizes the current source object shape", () => {
    expect(normalizeNativeElementBounds({ x: 1, y: 2, width: 300, height: 200 })).toEqual([
      1,
      2,
      300,
      200,
    ])
  })

  it("preserves null bounds", () => {
    expect(normalizeNativeElementBounds(null)).toBeNull()
  })

  it("rejects malformed legacy arrays", () => {
    expect(() => normalizeNativeElementBounds([1, 2, 3])).toThrow(
      "Native element bounds did not contain four coordinates",
    )
  })

  it("normalizes a live renderer without changing its other methods", () => {
    const renderer = {
      tick: () => true,
      getElementBounds: (_elementId: number) => ({ x: 4, y: 5, width: 600, height: 400 }),
    }
    const compatible = withLegacyElementBounds(renderer)

    expect(compatible.getElementBounds(7)).toEqual([4, 5, 600, 400])
    expect(compatible.tick()).toBe(true)
  })
})
