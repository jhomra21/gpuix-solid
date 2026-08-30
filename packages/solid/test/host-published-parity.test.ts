import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  insertHostNode,
  setHostProperty,
} from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

describe("published GPUIX 0.6 host surface", () => {
  it("forwards highlight from a built-in div and registers published events", () => {
    const renderer = new FakeRenderer()
    const events = new EventRegistry()
    const driver = new MutationDriver(renderer, events)
    const root = new HostRootNode(renderer, events, driver)
    const container = createHostElement("div")
    const highlight = { query: "Solid", activeIndex: 1, matchIndexOffset: 4 }

    setHostProperty(container, "highlight", highlight, undefined)
    setHostProperty(container, "onHighlight", () => undefined, undefined)
    setHostProperty(container, "onAuxClick", () => undefined, undefined)
    insertHostNode(root, container)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["setCustomProp", 1, "highlight", highlight])
    expect(batch).toContainEqual(["setEventListener", 1, "highlight", true])
    expect(batch).toContainEqual(["setEventListener", 1, "auxClick", true])
  })
})
