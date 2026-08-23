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

  it("changes event closures without toggling an already enabled native listener", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("div")
    const first = () => {}
    const second = () => {}
    setHostProperty(node, "onClick", first, undefined)
    insertHostNode(root, node)
    driver.flush()

    setHostProperty(node, "onClick", second, first)
    driver.flush()

    expect(renderer.batches.at(-1)).not.toContainEqual(["setEventListener", 1, "click", true])
  })
})
