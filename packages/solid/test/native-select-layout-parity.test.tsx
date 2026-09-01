import { describe, expect, it } from "vitest"
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "../src/components/select.js"
import type { PublicInstance } from "../src/host/types.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native Select layout parity", () => {
  nativeIt("preserves flex sizing under inherited native styles", () => {
    const testRoot = createTestRoot()
    let selectRoot: PublicInstance | undefined
    let trigger: PublicInstance | undefined

    testRoot.render(() => (
      <div
        style={{
          width: 800,
          height: 200,
          display: "flex",
          flexDirection: "column",
          color: "#111827",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            width: 310,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <text style={{ fontSize: 11 }}>Sort By:</text>
          <Select
            ref={(instance) => {
              selectRoot = instance
            }}
            defaultValue="name"
            style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }}
          >
            <SelectTrigger
              ref={(instance) => {
                trigger = instance
              }}
              style={{
                width: "100%",
                minHeight: 32,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <SelectValue>name</SelectValue>
            </SelectTrigger>
          </Select>
        </div>
      </div>
    ))

    expect(selectRoot).toBeDefined()
    expect(trigger).toBeDefined()
    testRoot.renderer.flush()

    const selectBounds = testRoot.renderer.getElementBounds(selectRoot?.id ?? 0)
    const triggerBounds = testRoot.renderer.getElementBounds(trigger?.id ?? 0)
    expect(selectBounds?.[2]).toBeGreaterThanOrEqual(140)
    expect(triggerBounds?.[2]).toBeGreaterThanOrEqual(140)
  })
})
