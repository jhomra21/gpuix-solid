import { createComponent, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { createTestApp } from "../src/automation.js"
import { renderDiv } from "../src/components/floating.js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../src/components/select.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native Select interaction parity", () => {
  nativeIt("selects an option when nested decorative content is clicked", async () => {
    const testRoot = createTestRoot(360, 240)

    testRoot.render(() => {
      const [value, setValue] = createSignal("alpha")
      return createComponent(Select, {
        get value() {
          return value()
        },
        onValueChange: setValue,
        get children() {
          return [
            createComponent(SelectTrigger, {
              testId: "select-trigger",
              get children() {
                return value()
              },
            }),
            createComponent(SelectContent, {
              side: "bottom",
              get children() {
                return [
                  createComponent(SelectItem, {
                    value: "alpha",
                    textValue: "Alpha",
                    children: renderDiv({
                      testId: "alpha-content",
                      style: { width: "100%", padding: 8 },
                      children: "Alpha",
                    }),
                  }),
                  createComponent(SelectItem, {
                    value: "beta",
                    textValue: "Beta",
                    children: renderDiv({
                      testId: "beta-content",
                      style: { width: "100%", padding: 8 },
                      children: "Beta",
                    }),
                  }),
                ]
              },
            }),
          ]
        },
      })
    })

    const app = createTestApp(testRoot.renderer)
    try {
      const trigger = app.getByTestId("select-trigger")
      expect(await trigger.textContent()).toBe("alpha")
      await trigger.click()
      expect(await app.getByTestId("beta-content").count()).toBe(1)
      await app.getByTestId("beta-content").click()
      expect(await trigger.textContent()).toBe("beta")
    } finally {
      await app.close()
      testRoot.unmount()
    }
  })
})
