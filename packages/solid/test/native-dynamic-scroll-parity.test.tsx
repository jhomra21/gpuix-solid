import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { createTestApp } from "../src/automation.js"
import {
  createElement,
  insert,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native dynamic scroll parity", () => {
  nativeIt("extends wheel range when reconciled content grows at the old bottom", async () => {
    const testRoot = createTestRoot(320, 220)
    let growContent: (() => void) | undefined

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

      const inserted = createElement("div")
      setProp(inserted, "testId", "inserted")
      setProp(inserted, "style", { height: 80 })

      const tail = createElement("div")
      setProp(tail, "style", { height: 300 })
      const [items, setItems] = createSignal([tail])
      growContent = () => setItems([inserted, tail])
      insert(scroller, items)

      return scroller
    })

    const app = createTestApp(testRoot.renderer)

    try {
      const scroller = app.getByTestId("scroller")
      const scrollerElement = await scroller.element()
      testRoot.renderer.scrollTo(scrollerElement.id, 0, -10_000)

      const oldBottom = testRoot.renderer.getScrollOffset(scrollerElement.id)?.[1] ?? 0
      expect(oldBottom).toBeLessThan(0)

      if (!growContent) throw new Error("dynamic scroll fixture did not initialize")
      growContent()
      testRoot.renderer.flush()
      expect(await app.getByTestId("inserted").count()).toBe(1)

      const bounds = await scroller.bounds()
      const offset = testRoot.renderer.getScrollOffset(scrollerElement.id) ?? [0, 0]
      const wheelPoint = {
        x: bounds.x - offset[0] + bounds.width - 4,
        y: bounds.y - offset[1] + bounds.height / 2,
      }

      await app.mouse.wheel(wheelPoint, 0, -80)

      const grownBottom = testRoot.renderer.getScrollOffset(scrollerElement.id)?.[1] ?? 0
      expect(grownBottom).toBeLessThan(oldBottom)
    } finally {
      await app.close()
      testRoot.unmount()
    }
  })
})
