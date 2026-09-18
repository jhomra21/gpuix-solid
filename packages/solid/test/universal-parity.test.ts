import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import type { HostElementNode } from "../src/host/nodes.js"
import {
  createElement,
  createTextNode,
  insert,
  insertNode,
  setProp,
  spread,
} from "../src/host/universal.js"
import { createRoot } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

function element(): HostElementNode {
  const node = createElement("div")
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("Solid universal parity", () => {
  it("reconciles a reactive fragment reorder after a native event", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const parent = element()
    const first = element()
    const second = element()
    const [items, setItems] = createSignal([first, second])
    setProp(parent, "onClick", () => setItems([second, first]))

    root.render(() => {
      insert(parent, items)
      return parent
    })

    expect(parent.children).toEqual([first, second])

    root.dispatch({ elementId: parent.id, eventType: "click" })

    expect(parent.children).toEqual([second, first])
    expect(renderer.batches.at(-1)).toEqual([
      ["insertBefore", parent.id, second.id, first.id],
    ])
  })

  it("accepts a text host node as a reconciliation anchor", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const parent = element()
    const anchor = createTextNode("")
    if (anchor.kind !== "text") throw new TypeError("Expected GPUIX text anchor")
    const inserted = element()

    root.render(() => {
      insertNode(parent, anchor)
      insertNode(parent, inserted, anchor)
      return parent
    })

    expect(parent.children).toEqual([inserted, anchor])
    expect(inserted.parent).toBe(parent)
    expect(anchor.parent).toBe(parent)
  })

  it("updates reactive text after a native event without recreating it", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const parent = element()
    const [label, setLabel] = createSignal("before")
    setProp(parent, "onClick", () => setLabel("after"))

    root.render(() => {
      insert(parent, label)
      return parent
    })

    const text = parent.children[0]
    if (text?.kind !== "text") throw new TypeError("Expected GPUIX text child")
    const textId = text.id

    root.dispatch({ elementId: parent.id, eventType: "click" })

    expect(parent.children[0]).toBe(text)
    expect(text.id).toBe(textId)
    expect(renderer.batches.at(-1)).toEqual([["setText", textId, "after"]])
  })

  it("passes the public host instance to a Solid ref callback", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = element()
    let referenced: HostElementNode | undefined

    root.render(() => {
      spread(node, { ref: (instance: HostElementNode) => { referenced = instance } }, true)
      return node
    })

    expect(referenced).toBe(node)
    expect(referenced?.id).toBe(1)
    expect(referenced?.type).toBe("div")
  })

  it("expands layout shorthands before native style delivery", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = element()

    setProp(node, "style", {
      paddingX: 12,
      paddingY: 6,
      paddingLeft: 14,
      marginX: 8,
      marginY: 4,
      size: "3rem",
      width: 72,
      position: "absolute",
      inset: 10,
      insetX: 20,
      left: 24,
    })

    root.render(() => node)

    expect(node.style).toMatchObject({
      paddingLeft: 14,
      paddingRight: 12,
      paddingTop: 6,
      paddingBottom: 6,
      marginLeft: 8,
      marginRight: 8,
      marginTop: 4,
      marginBottom: 4,
      width: 72,
      height: 48,
      top: 10,
      right: 20,
      bottom: 10,
      left: 24,
    })
    expect("paddingX" in node.style).toBe(false)
    expect("size" in node.style).toBe(false)
    expect("inset" in node.style).toBe(false)

    root.unmount()
  })

})