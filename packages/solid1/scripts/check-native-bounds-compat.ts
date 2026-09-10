import assert from "node:assert/strict"
import {
  normalizeNativeElementBounds,
  withLegacyElementBounds,
} from "../src/native-bounds.js"

const legacy = [1, 2, 30, 40]
assert.equal(normalizeNativeElementBounds(legacy), legacy)
assert.deepEqual(
  normalizeNativeElementBounds({ x: 5, y: 6, width: 70, height: 80 }),
  [5, 6, 70, 80],
)
assert.equal(normalizeNativeElementBounds(null), null)
assert.throws(
  () => normalizeNativeElementBounds([1, 2, 3]),
  /four coordinates/,
)

const renderer = {
  marker: "solid1-bounds-compat",
  getElementBounds() {
    return { x: 9, y: 10, width: 110, height: 120 }
  },
}
const compatibilityRenderer = withLegacyElementBounds(renderer)
assert.deepEqual(compatibilityRenderer.getElementBounds(1), [9, 10, 110, 120])
assert.equal(compatibilityRenderer.marker, "solid1-bounds-compat")

console.log("solid1 native bounds compatibility: passed")
