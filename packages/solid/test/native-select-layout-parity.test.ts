import { createComponent, type Element as SolidElement } from "solid-js"
import { describe, expect, it } from "vitest"
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "../src/components/select.js"
import type { HostElementNode, HostNode } from "../src/host/nodes.js"
import type { StyleDesc } from "../src/host/types.js"
import { createElement, insert, insertNode, setProp } from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

function element(type: string): HostElementNode {
  const node = createElement(type)
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

function div(style: StyleDesc, children: HostNode[] = []): HostElementNode {
  const node = element("div")
  setProp(node, "style", style)
  for (const child of children) insertNode(node, child)
  return node
}

function text(value: string, style: StyleDesc = {}): HostElementNode {
  const node = element("text")
  if (Object.keys(style).length > 0) setProp(node, "style", style)
  insert(node, value)
  return node
}

function hostElement(value: SolidElement): HostElementNode {
  if (!(value instanceof Object) || !("kind" in value) || value.kind !== "element") {
    throw new TypeError("Expected component to return a GPUIX host element")
  }
  // SAFETY: the runtime guard above proves this component result is a GPUIX host element.
  return value as HostElementNode
}

describe("native Select layout parity", () => {
  nativeIt("preserves flex sizing under inherited native styles", () => {
    const testRoot = createTestRoot()
    let selectNode: HostElementNode | undefined
    let triggerNode: HostElementNode | undefined

    testRoot.render(() => {
      const select = hostElement(createComponent(Select, {
        defaultValue: "name",
        style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
        get children() {
          const trigger = hostElement(createComponent(SelectTrigger, {
            style: {
              width: "100%",
              minHeight: 32,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            },
            get children() {
              return createComponent(SelectValue, { children: "name" })
            },
          }))
          triggerNode = trigger
          return trigger
        },
      }))
      selectNode = select

      const toolbar = div(
        {
          width: 310,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingLeft: 12,
          paddingRight: 12,
        },
        [text("Sort By:", { fontSize: 11 }), select],
      )

      return div(
        {
          width: 800,
          height: 200,
          display: "flex",
          flexDirection: "column",
          color: "#111827",
          fontFamily: "system-ui",
        },
        [toolbar],
      )
    })

    expect(selectNode).toBeDefined()
    expect(triggerNode).toBeDefined()
    testRoot.renderer.flush()

    expect(selectNode?.style.flexGrow).toBe(1)
    expect(selectNode?.style.flexShrink).toBe(1)
    expect(selectNode?.style.flexBasis).toBe(0)
    expect(selectNode?.style.minWidth).toBe(0)
    expect(selectNode?.style.color).toBe("#111827")
    expect(selectNode?.style.fontFamily).toBe("system-ui")

    expect(triggerNode?.style.width).toBe("100%")
    expect(triggerNode?.style.minHeight).toBe(32)
    expect(triggerNode?.style.display).toBe("flex")
    expect(triggerNode?.style.flexDirection).toBe("row")
    expect(triggerNode?.style.alignItems).toBe("center")
    expect(triggerNode?.style.color).toBe("#111827")
    expect(triggerNode?.style.fontFamily).toBe("system-ui")
  })
})
