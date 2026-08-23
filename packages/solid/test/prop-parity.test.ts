import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  insertHostNode,
  setHostProperty,
} from "../src/host/nodes.js"
import type { StyleDesc } from "../src/host/types.js"
import { FakeRenderer } from "./fake-renderer.js"

function fixture() {
  const renderer = new FakeRenderer()
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const root = new HostRootNode(renderer, events, driver)
  return { renderer, events, driver, root }
}

describe("React host prop forwarding parity", () => {
  it("skips an empty initial style but clears a removed mounted style", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("div")

    setHostProperty<StyleDesc | undefined>(node, "style", {}, undefined)
    insertHostNode(root, node)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "div"],
      ["setRoot", 1],
    ])

    const style: StyleDesc = { padding: 12, opacity: 0.5 }
    setHostProperty<StyleDesc | undefined>(node, "style", style, {})
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([["setStyle", 1, style]])

    setHostProperty<StyleDesc | undefined>(node, "style", undefined, style)
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([["setStyle", 1, {}]])
  })

  it("keeps reserved and event props out of custom-prop forwarding", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("div")
    const click = () => {}

    setHostProperty(node, "className", "ignored", undefined)
    setHostProperty(node, "children", "ignored", undefined)
    setHostProperty(node, "key", "ignored", undefined)
    setHostProperty(node, "ref", () => {}, undefined)
    setHostProperty(node, "onClick", click, undefined)
    insertHostNode(root, node)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "div"],
      ["setEventListener", 1, "click", true],
      ["setRoot", 1],
    ])
  })

  it("forwards only universal props through div and text", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("div")
    const motion = {
      animate: { opacity: 1 },
      transition: { duration: 0.2 },
    }

    setHostProperty(node, "autoFocus", true, undefined)
    setHostProperty(node, "tabIndex", 0, undefined)
    setHostProperty(node, "motion", motion, undefined)
    setHostProperty(node, "testId", "counter", undefined)
    setHostProperty(node, "src", "ignored.png", undefined)
    insertHostNode(root, node)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "div"],
      ["setCustomPropValue", 1, "autoFocus", true],
      ["setCustomPropValue", 1, "tabIndex", 0],
      ["setCustomPropValue", 1, "motion", motion],
      ["setCustomPropValue", 1, "testId", "counter"],
      ["setRoot", 1],
    ])

    setHostProperty(node, "testId", undefined, "counter")
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([["setCustomPropValue", 1, "testId", null]])
  })

  it("forwards custom-element values and serializes unsupported values as null", () => {
    const { renderer, driver, root } = fixture()
    const node = createHostElement("img")
    const metadata = { source: "fixture", scale: 2 }

    setHostProperty(node, "src", "image.png", undefined)
    setHostProperty(node, "objectFit", "contain", undefined)
    setHostProperty(node, "metadata", metadata, undefined)
    setHostProperty(node, "callback", () => "ignored", undefined)
    insertHostNode(root, node)
    driver.flush()

    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "img"],
      ["setCustomPropValue", 1, "src", "image.png"],
      ["setCustomPropValue", 1, "objectFit", "contain"],
      ["setCustomPropValue", 1, "metadata", metadata],
      ["setCustomPropValue", 1, "callback", null],
      ["setRoot", 1],
    ])

    setHostProperty(node, "src", undefined, "image.png")
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([["setCustomPropValue", 1, "src", null]])
  })
})
