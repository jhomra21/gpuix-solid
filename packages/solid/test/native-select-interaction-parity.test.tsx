import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { createTestApp } from "../src/automation.js"
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
      return (
        <Select value={value()} onValueChange={setValue}>
          <SelectTrigger testId="select-trigger">
            <text>{value()}</text>
          </SelectTrigger>
          <SelectContent side="bottom">
            <SelectItem value="alpha" textValue="Alpha">
              <div testId="alpha-content" style={{ width: "100%", padding: 8 }}>
                <text>Alpha</text>
              </div>
            </SelectItem>
            <SelectItem value="beta" textValue="Beta">
              <div testId="beta-content" style={{ width: "100%", padding: 8 }}>
                <text>Beta</text>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      )
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
