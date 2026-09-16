import { describe, expect, it } from "vitest"
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

describe("GPUIX 0.9 selection events", () => {
  nativeIt("fires once per real selection change including clear", () => {
    const values: Array<string | null> = []
    const testRoot = createTestRoot(undefined, undefined, {
      onSelectionChange: (event) => values.push(event.value ?? null),
    })
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [text("hello world", { fontSize: 20 })],
    ))

    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("hello world")
    expect(values).toEqual(["hello world"])

    testRoot.renderer.flush()
    testRoot.renderer.dispatchNativeEvents()
    expect(values).toEqual(["hello world"])

    testRoot.renderer.clearSelection()
    expect(values).toEqual(["hello world", null])
  })

  nativeIt("survives a native click while the root view is leased", () => {
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [text("just a click", { fontSize: 20 })],
    ))

    testRoot.renderer.nativeSimulateClick(40, 30)
    expect(testRoot.renderer.getSelectedText()).toBeNull()
  })
})
