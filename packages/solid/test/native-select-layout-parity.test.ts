import { createRoot } from "solid-js"
import { describe, expect, it } from "vitest"
import { renderDiv } from "../src/components/floating.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createElement, insertNode, setProp } from "../src/host/universal.js"

function element(type: string): HostElementNode {
  const node = createElement(type)
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("native Select layout parity", () => {
  it("preserves floating-host inline layout while inherited styles recompose", () => {
    createRoot((dispose) => {
      try {
        const trigger = renderDiv({
          style: {
            width: "100%",
            minHeight: 32,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        })
        const select = renderDiv({
          style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
          children: trigger,
        })
        const toolbar = element("div")
        setProp(toolbar, "style", {
          width: 310,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          color: "#111827",
          fontFamily: "system-ui",
        })

        insertNode(toolbar, select)

        expect(select.style.flexGrow).toBe(1)
        expect(select.style.flexShrink).toBe(1)
        expect(select.style.flexBasis).toBe(0)
        expect(select.style.minWidth).toBe(0)
        expect(select.style.color).toBe("#111827")
        expect(select.style.fontFamily).toBe("system-ui")

        expect(trigger.style.width).toBe("100%")
        expect(trigger.style.minHeight).toBe(32)
        expect(trigger.style.display).toBe("flex")
        expect(trigger.style.flexDirection).toBe("row")
        expect(trigger.style.alignItems).toBe("center")
        expect(trigger.style.color).toBe("#111827")
        expect(trigger.style.fontFamily).toBe("system-ui")
      } finally {
        dispose()
      }
    })
  })
})
