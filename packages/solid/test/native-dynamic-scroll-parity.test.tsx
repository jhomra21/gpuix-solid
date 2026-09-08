import { describe, expect, it } from "vitest"
import { createTestApp } from "../src/automation.js"
import {
  createElement,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native dynamic scroll parity", () => {
  nativeIt("keeps wheel scrolling after a child is inserted while scrolled", async () => {
    const testRoot = createTestRoot(320, 220)

    testRoot.render(() => {
      const scroller = createElement("div")
      setProp(scroller, "testId", "scroller")
      setProp(scroller, "style", {
        width: 220,
        height: 120,
        overflowY: "scroll",
      })

      const spacer = createElement("div")
      setProp(spacer, "style", { height: 160 })
      insertNode(scroller, spacer)

      const toggle = createElement("div")
      setProp(toggle, "testId", "toggle")
      setProp(toggle, "style", { height: 40 })
      insertNode(scroller, toggle)

      const tail = createElement("div")
      setProp(tail, "style", { height: 300 })
      insertNode(scroller, tail)

      const inserted = createElement("div")
      setProp(inserted, "testId", "inserted")
      setProp(inserted, "style", { height: 80 })
      setProp(toggle, "onClick", () => {
        if (inserted.parent) return
        insertNode(scroller, inserted, tail)
      })

      return scroller
    })

    const app = createTestApp(testRoot.renderer)

    try {
      const scroller = app.getByTestId("scroller")
      const scrollerElement = await scroller.element()
      testRoot.renderer.scrollTo(scrollerElement.id, 0, -120)

      expect(testRoot.renderer.getScrollOffset(scrollerElement.id)?.[1]).toBe(-120)

      await app.getByTestId("toggle").click()
      expect(await app.getByTestId("inserted").count()).toBe(1)

      const bounds = await scroller.bounds()
      const offset = testRoot.renderer.getScrollOffset(scrollerElement.id) ?? [0, 0]
      const wheelPoint = {
        x: bounds.x - offset[0] + bounds.width - 4,
        y: bounds.y - offset[1] + bounds.height / 2,
      }
      const before = testRoot.renderer.getScrollOffset(scrollerElement.id)?.[1] ?? 0

      await app.mouse.wheel(wheelPoint, 0, -80)

      const after = testRoot.renderer.getScrollOffset(scrollerElement.id)?.[1] ?? 0
      expect(after).toBeLessThan(before)
    } finally {
      await app.close()
      testRoot.unmount()
    }
  })
})
