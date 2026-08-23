import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import type { HostElementNode } from "../src/host/nodes.js"
import { createElement, insert, spread } from "../src/host/universal.js"
import { createRoot } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

function element(): HostElementNode {
  const node = createElement("div")
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("Solid universal parity", () => {
  it("reconciles a reactive fragment reorder through the shadow tree", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const parent = element()
    const first = element()
    const second = element()
    const [items, setItems] = createSignal([first, second])

    root.render(() => {
      insert(parent, items)
      return parent
    })

    expect(parent.children).toEqual([first, second])

    setItems([second, first])
    root.flush()

    expect(parent.children).toEqual([second, first])
    expect(renderer.batches.at(-1)).toEqual([
      ["insertBefore", parent.id, second.id, first.id],
    ])
  })

  it("updates reactive fragment text without recreating the text node", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const parent = element()
    const [label, setLabel] = createSignal("before")

    root.render(() => {
      insert(parent, label)
      return parent
    })

    const text = parent.children[0]
    if (text?.kind !== "text") throw new TypeError("Expected GPUIX text child")
    const textId = text.id

    setLabel("after")
    root.flush()

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
})
