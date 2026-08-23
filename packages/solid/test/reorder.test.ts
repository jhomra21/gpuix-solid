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
  replaceHostText,
} from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

function fixture() {
  const renderer = new FakeRenderer()
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const root = new HostRootNode(renderer, events, driver)
  return { renderer, driver, root }
}

describe("text and reorder parity", () => {
  it("updates an adopted text node without recreating it", () => {
    const { renderer, driver, root } = fixture()
    const parent = createHostElement("div")
    const text = createHostText("before")
    insertHostNode(parent, text)
    insertHostNode(root, parent)
    driver.flush()

    replaceHostText(text, "after")
    driver.flush()

    expect(renderer.batches.at(-1)).toEqual([["setText", 2, "after"]])
  })

  it("moves an adopted child between parents without destroying it", () => {
    const { renderer, driver, root } = fixture()
    const outer = createHostElement("div")
    const left = createHostElement("div")
    const right = createHostElement("div")
    const child = createHostElement("div")
    insertHostNode(left, child)
    insertHostNode(outer, left)
    insertHostNode(outer, right)
    insertHostNode(root, outer)
    driver.flush()

    insertHostNode(right, child)
    driver.flush()

    expect(child.id).toBe(3)
    expect(renderer.batches.at(-1)).toEqual([["appendChild", 4, 3]])
  })

  it("emits insertBefore when an adopted sibling is reordered", () => {
    const { renderer, driver, root } = fixture()
    const parent = createHostElement("div")
    const first = createHostElement("div")
    const second = createHostElement("div")
    insertHostNode(parent, first)
    insertHostNode(parent, second)
    insertHostNode(root, parent)
    driver.flush()

    insertHostNode(parent, second, first)
    driver.flush()

    expect(getFirstChild(parent)).toBe(second)
    expect(getNextSibling(second)).toBe(first)
    expect(renderer.batches.at(-1)).toEqual([["insertBefore", 1, 3, 2]])
  })
})
