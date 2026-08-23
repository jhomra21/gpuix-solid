import { createComponent, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { animate } from "../src/components/animate.js"
import { createTestRoot, hasNativeTestRenderer, type TestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

function elementWidth(renderer: TestRenderer, elementId: number): number {
  const bounds = renderer.getElementBounds(elementId)
  const width = bounds?.[2]
  if (width === undefined) {
    throw new Error(`Native element ${elementId} did not expose painted bounds`)
  }
  return width
}

describe("native deterministic animation parity", () => {
  nativeIt("interpolates linearly and retargets from the visible midpoint", () => {
    const testRoot = createTestRoot()
    const [targetWidth, setTargetWidth] = createSignal(140)
    testRoot.renderer.clockPause()

    testRoot.render(() => createComponent(animate.div, {
      initial: { width: 40 },
      get to() {
        return { width: targetWidth() }
      },
      transition: { duration: 1, ease: "linear" },
      style: { height: 40 },
    }))

    const animated = testRoot.renderer.findByType("div")[0]
    expect(animated).toBeDefined()
    const id = animated?.id ?? 0

    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(40, 1)

    testRoot.renderer.clockFastForward(500)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(90, 1)

    testRoot.root.flushSync(() => setTargetWidth(240))
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(90, 1)

    testRoot.renderer.clockFastForward(500)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(165, 1)

    testRoot.renderer.clockFastForward(500)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(240, 1)

    testRoot.renderer.clockResume()
    testRoot.unmount()
  })

  nativeIt("starts at the target when initial is false", () => {
    const testRoot = createTestRoot()
    testRoot.renderer.clockPause()

    testRoot.render(() => createComponent(animate.div, {
      initial: false,
      to: { width: 180 },
      transition: { duration: 1, ease: "linear" },
      style: { height: 40 },
    }))

    const animated = testRoot.renderer.findByType("div")[0]
    expect(animated).toBeDefined()
    const id = animated?.id ?? 0

    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(180, 1)
    testRoot.renderer.clockFastForward(500)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(180, 1)

    testRoot.renderer.clockResume()
    testRoot.unmount()
  })

  nativeIt("holds the initial frame through delay before interpolation", () => {
    const testRoot = createTestRoot()
    testRoot.renderer.clockPause()

    testRoot.render(() => createComponent(animate.div, {
      initial: { width: 40 },
      to: { width: 140 },
      transition: { duration: 1, delay: 0.5, ease: "linear" },
      style: { height: 40 },
    }))

    const animated = testRoot.renderer.findByType("div")[0]
    expect(animated).toBeDefined()
    const id = animated?.id ?? 0

    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(40, 1)

    testRoot.renderer.clockFastForward(250)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(40, 1)

    testRoot.renderer.clockFastForward(500)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(65, 1)

    testRoot.renderer.clockFastForward(750)
    expect(elementWidth(testRoot.renderer, id)).toBeCloseTo(140, 1)

    testRoot.renderer.clockResume()
    testRoot.unmount()
  })
})
