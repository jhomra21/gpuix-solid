import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  createHostText,
  getFirstChild,
  getNextSibling,
  insertHostNode,
  removeHostNode,
  replaceHostText,
  setHostProperty,
} from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

function fixture() {
  const renderer = new FakeRenderer()
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const root = new HostRootNode(renderer, events, driver)
  return { renderer, events, driver, root }
}

describe("host tree", () => {
  it("keeps detached construction out of native until adoption", () => {
    const { renderer, driver, root } = fixture()
    const parent = createHostElement("div")
    const child = createHostText("hello")
    insertHostNode(parent, child)

    expect(driver.pending).toBe(0)
    insertHostNode(root, parent)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "div"],
      ["createElement", 2, "text"],
      ["setText", 2, "hello"],
      ["appendChild", 1, 2],
      ["setRoot", 1],
    ])
  })

  it("updates sibling order synchronously when nodes move", () => {
    const { driver, root } = fixture()
    const parent = createHostElement("div")
    const a = createHostElement("div")
    const b = createHostElement("div")
    insertHostNode(parent, a)
    insertHostNode(parent, b)
    insertHostNode(root, parent)
    driver.flush()

    insertHostNode(parent, b, a)
    expect(getFirstChild(parent)).toBe(b)
    expect(getNextSibling(b)).toBe(a)
  })

  it("keeps root-scoped ids independent", () => {
    const one = fixture()
    const two = fixture()
    const a = createHostElement("div")
    const b = createHostElement("div")

    insertHostNode(one.root, a)
    insertHostNode(two.root, b)

    expect(a.id).toBe(1)
    expect(b.id).toBe(1)
  })

  it("rejects cross-root adoption", () => {
    const one = fixture()
    const two = fixture()
    const node = createHostElement("div")
    insertHostNode(one.root, node)
    one.driver.flush()

    expect(() => insertHostNode(two.root, node)).toThrow(/different root/)
  })

  it("destroys removed subtrees", () => {
    const { renderer, driver, root } = fixture()
    const parent = createHostElement("div")
    const child = createHostElement("div")
    insertHostNode(parent, child)
    insertHostNode(root, parent)
    driver.flush()

    removeHostNode(parent, child)
    driver.flush()

    expect(renderer.batches.at(-1)).toEqual([
      ["removeChild", 1, 2],
      ["destroyElement", 2],
    ])
  })

  it("recreates a removed subtree with the same root-scoped ids", () => {
    const { renderer, events, driver, root } = fixture()
    const parent = createHostElement("div")
    const child = createHostElement("div")
    const text = createHostText("before")
    const click = () => {}
    setHostProperty(child, "onClick", click, undefined)
    insertHostNode(child, text)
    insertHostNode(parent, child)
    insertHostNode(root, parent)
    driver.flush()

    removeHostNode(parent, child)
    driver.flush()
    expect(events.has(child.id, "click")).toBe(false)

    replaceHostText(text, "after")
    expect(driver.pending).toBe(0)

    insertHostNode(parent, child)
    driver.flush()

    expect(child.id).toBe(2)
    expect(text.id).toBe(3)
    expect(events.has(child.id, "click")).toBe(true)
    expect(renderer.batches.at(-1)).toEqual([
      ["createElement", 2, "div"],
      ["setEventListener", 2, "click", true],
      ["createElement", 3, "text"],
      ["setText", 3, "after"],
      ["appendChild", 2, 3],
      ["appendChild", 1, 2],
    ])
  })

  it("preserves recreated event handlers when destroy and recreate share a batch", () => {
    const { renderer, events, driver, root } = fixture()
    const parent = createHostElement("div")
    const child = createHostElement("div")
    const click = () => {}
    setHostProperty(child, "onClick", click, undefined)
    insertHostNode(parent, child)
    insertHostNode(root, parent)
    driver.flush()

    removeHostNode(parent, child)
    insertHostNode(parent, child)
    renderer.destroyed = [child.id]
    driver.flush()

    expect(events.has(child.id, "click")).toBe(true)
  })

  it("changes event closures without toggling an already enabled native listener", () => {
    const { renderer, events, driver, root } = fixture()
    const node = createHostElement("div")
    let value = 0
    const first = () => { value = 1 }
    const second = () => { value = 2 }
    setHostProperty(node, "onClick", first, undefined)
    insertHostNode(root, node)
    driver.flush()

    setHostProperty(node, "onClick", second, first)
    driver.flush()
    events.dispatch({ elementId: node.id, eventType: "click" })

    expect(value).toBe(2)
    expect(renderer.batches).toHaveLength(1)
  })

  it("forwards only universal custom props on built-ins", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("div")
    setHostProperty(node, "testId", "target", undefined)
    setHostProperty(node, "src", "ignored.png", undefined)
    setHostProperty(node, "className", "ignored", undefined)
    insertHostNode(root, node)
    driver.flush()

    expect(renderer.batches[0]).toContainEqual(["setCustomPropValue", 1, "testId", "target"])
    expect(renderer.batches[0]).not.toContainEqual(["setCustomPropValue", 1, "src", "ignored.png"])
    expect(renderer.batches[0]).not.toContainEqual(["setCustomPropValue", 1, "className", "ignored"])
  })

  it("forwards custom element props and removes them with null", () => {
    const { renderer, driver, root } = fixture()
    const image = createHostElement("img")
    setHostProperty(image, "src", "one.png", undefined)
    insertHostNode(root, image)
    driver.flush()

    setHostProperty(image, "src", undefined, "one.png")
    driver.flush()

    expect(renderer.batches[0]).toContainEqual(["setCustomPropValue", 1, "src", "one.png"])
    expect(renderer.batches.at(-1)).toEqual([["setCustomPropValue", 1, "src", null]])
  })
})
