import { createRenderEffect, createSignal } from "solid-js"
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

describe("native selection and layout parity", () => {
  nativeIt("selects text inside one element", () => {
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [text("hello world", { fontSize: 20 })],
    ))

    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("hello world")
  })

  nativeIt("selects across siblings in document order", () => {
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, gap: 8 },
      [
        text("first line", { fontSize: 20 }),
        text("second line", { fontSize: 20 }),
        text("third line", { fontSize: 20 }),
      ],
    ))

    expect(testRoot.renderer.dragSelect(21, 30, 900, 300)).toBe(
      "first line\nsecond line\nthird line",
    )
  })

  nativeIt("preserves partial and reversed selection semantics", () => {
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, gap: 8 },
      [
        text("aaaaaaaaaa", { fontSize: 20 }),
        text("bbbb", { fontSize: 20 }),
      ],
    ))

    expect(testRoot.renderer.dragSelect(21, 30, 900, 300)).toBe("aaaaaaaaaa\nbbbb")
    testRoot.renderer.clearSelection()

    const partial = testRoot.renderer.dragSelect(60, 30, 900, 300)
    expect(partial).not.toBeNull()
    expect(partial?.startsWith("aaaaaaaaaa")).toBe(false)
    expect(partial?.endsWith("\nbbbb")).toBe(true)

    testRoot.renderer.clearSelection()
    const downward = testRoot.renderer.dragSelect(21, 30, 900, 62)
    testRoot.renderer.clearSelection()
    const upward = testRoot.renderer.dragSelect(900, 62, 21, 30)
    expect(upward).toBe(downward)
  })

  nativeIt("keeps nested styled text selectable", () => {
    const nested = div(
      { display: "flex", backgroundColor: "#1e1e2e", padding: 4 },
      [text("nested text", { fontSize: 20, color: "#cdd6f4" })],
    )
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [nested],
    ))

    expect(testRoot.renderer.dragSelect(25, 34, 900, 34)).toBe("nested text")
  })

  nativeIt("honors userSelect inheritance and explicit re-enable", () => {
    const noneRoot = createTestRoot()
    noneRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [text("untouchable", { fontSize: 20, userSelect: "none" })],
    ))
    expect(noneRoot.renderer.dragSelect(21, 30, 900, 30)).toBeNull()

    const inheritedRoot = createTestRoot()
    inheritedRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, userSelect: "none" },
      [div({ display: "flex" }, [text("toolbar label", { fontSize: 20 })])],
    ))
    expect(inheritedRoot.renderer.dragSelect(21, 30, 900, 30)).toBeNull()

    const overrideRoot = createTestRoot()
    overrideRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, userSelect: "none" },
      [text("selectable again", { fontSize: 20, userSelect: "text" })],
    ))
    expect(overrideRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("selectable again")
  })

  nativeIt("clears selection and treats a click without movement as empty", () => {
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [text("clear me", { fontSize: 20 })],
    ))

    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("clear me")
    testRoot.renderer.clearSelection()
    expect(testRoot.renderer.getSelectedText()).toBeNull()

    const clickRoot = createTestRoot()
    clickRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20 },
      [text("just a click", { fontSize: 20 })],
    ))
    expect(clickRoot.renderer.dragSelect(40, 30, 40, 30)).toBeNull()
  })

  nativeIt("applies lineHeight to wrapped text layout", () => {
    const tightRoot = createTestRoot()
    tightRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, width: 200 },
      [text("one two three four five six seven eight nine ten", {
        fontSize: 16,
        lineHeight: 18,
      })],
    ))
    const tight = tightRoot.renderer.dragSelect(21, 26, 900, 60)

    const looseRoot = createTestRoot()
    looseRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, width: 200 },
      [text("one two three four five six seven eight nine ten", {
        fontSize: 16,
        lineHeight: 40,
      })],
    ))
    const loose = looseRoot.renderer.dragSelect(21, 26, 900, 60)

    expect(tight).not.toBeNull()
    expect(loose).not.toBeNull()
    expect(tight?.length ?? 0).toBeGreaterThan(loose?.length ?? 0)
  })

  nativeIt("selects text rendered directly as a div child", () => {
    const plain = element("div")
    insert(plain, "plain div text")
    const testRoot = createTestRoot()
    testRoot.render(() => div(
      { display: "flex", flexDirection: "column", padding: 20, fontSize: 20 },
      [plain],
    ))

    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("plain div text")
  })

  nativeIt("reports painted bounds and reacts to layout width changes", () => {
    const testRoot = createTestRoot()
    const [width, setWidth] = createSignal(120)
    const child = element("div")

    expect(child.id).toBe(0)

    testRoot.render(() => {
      const root = div({ display: "flex", flexDirection: "column", padding: 20, gap: 10 })
      createRenderEffect(
        () => ({ width: width(), height: 40 }),
        (next, previous) => {
          setProp(child, "style", next, previous)
        },
      )
      insertNode(root, child)
      return root
    })

    expect(child.id).toBeGreaterThan(0)
    const initial = testRoot.renderer.getElementBounds(child.id)
    expect(initial).not.toBeNull()
    expect(initial?.[2]).toBeCloseTo(120, 3)
    expect(initial?.[3]).toBeCloseTo(40, 3)

    testRoot.root.flushSync(() => setWidth(180))
    testRoot.renderer.flush()

    const updated = testRoot.renderer.getElementBounds(child.id)
    expect(updated).not.toBeNull()
    expect(updated?.[2]).toBeCloseTo(180, 3)
    expect(updated?.[3]).toBeCloseTo(40, 3)
  })
})