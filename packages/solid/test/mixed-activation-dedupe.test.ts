import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import { FakeRenderer } from "./fake-renderer.js"

function primaryMouseUp(elementId: number) {
  return {
    elementId,
    eventType: "mouseUp",
    x: 24,
    y: 16,
    button: 0,
  } satisfies NativeEventPayload
}

function primaryClick(elementId: number) {
  return {
    elementId,
    eventType: "click",
    x: 24,
    y: 16,
    button: 0,
    clickCount: 1,
  } satisfies NativeEventPayload
}

function listenerMutations(renderer: FakeRenderer, id: number, type: string) {
  return renderer.batches
    .flat()
    .filter((mutation) => mutation[0] === "setEventListener" && mutation[1] === id && mutation[2] === type)
}

describe("mixed retained/custom activation dedupe", () => {
  it("activates a retained button with a custom SVG child exactly once in either native callback order", async () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 61
    const svgId = 62
    let clicks = 0

    events.activate(parentId)
    events.activate(svgId)
    events.set(parentId, "click", () => {
      clicks += 1
    })

    driver.enqueue("createElement", parentId, "div")
    driver.enqueue("createElement", svgId, "svg")
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("appendChild", parentId, svgId)
    driver.flush()

    expect(listenerMutations(renderer, parentId, "mouseUp")).toContainEqual([
      "setEventListener",
      parentId,
      "mouseUp",
      true,
    ])
    expect(listenerMutations(renderer, svgId, "click")).toContainEqual([
      "setEventListener",
      svgId,
      "click",
      true,
    ])
    expect(listenerMutations(renderer, svgId, "mouseUp")).toHaveLength(0)

    events.dispatch(primaryClick(svgId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(1)

    await Promise.resolve()

    events.dispatch(primaryMouseUp(parentId))
    events.dispatch(primaryClick(svgId))
    expect(clicks).toBe(2)
  })

  it("coalesces retained descendant and owner mouse-up relays from one physical click", async () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 81
    const textId = 82
    let clicks = 0

    events.activate(parentId)
    events.activate(textId)
    events.set(parentId, "click", () => {
      clicks += 1
    })

    driver.enqueue("createElement", parentId, "div")
    driver.enqueue("createElement", textId, "text")
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("appendChild", parentId, textId)
    driver.flush()

    expect(listenerMutations(renderer, textId, "mouseUp")).toContainEqual([
      "setEventListener",
      textId,
      "mouseUp",
      true,
    ])

    events.dispatch(primaryMouseUp(textId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(1)

    await Promise.resolve()

    events.dispatch(primaryMouseUp(parentId))
    events.dispatch(primaryMouseUp(textId))
    expect(clicks).toBe(2)
  })

  it("coalesces every retained source in a deep activation path", () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 101
    const wrapperId = 102
    const leafId = 103
    let clicks = 0

    for (const id of [parentId, wrapperId, leafId]) events.activate(id)
    events.set(parentId, "click", () => {
      clicks += 1
    })

    driver.enqueue("createElement", parentId, "div")
    driver.enqueue("createElement", wrapperId, "div")
    driver.enqueue("createElement", leafId, "div")
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("appendChild", parentId, wrapperId)
    driver.enqueue("appendChild", wrapperId, leafId)
    driver.flush()

    for (const id of [parentId, wrapperId, leafId]) {
      expect(listenerMutations(renderer, id, "mouseUp")).toContainEqual([
        "setEventListener",
        id,
        "mouseUp",
        true,
      ])
    }

    events.dispatch(primaryMouseUp(leafId))
    events.dispatch(primaryMouseUp(wrapperId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(1)

    events.dispatch(primaryMouseUp(leafId))
    events.dispatch(primaryMouseUp(wrapperId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(2)
  })

  it("coalesces a mixed custom and retained relay chain", () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 111
    const wrapperId = 112
    const svgId = 113
    let clicks = 0

    for (const id of [parentId, wrapperId, svgId]) events.activate(id)
    events.set(parentId, "click", () => {
      clicks += 1
    })

    driver.enqueue("createElement", parentId, "div")
    driver.enqueue("createElement", wrapperId, "div")
    driver.enqueue("createElement", svgId, "svg")
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("appendChild", parentId, wrapperId)
    driver.enqueue("appendChild", wrapperId, svgId)
    driver.flush()

    expect(listenerMutations(renderer, wrapperId, "mouseUp")).toHaveLength(1)
    expect(listenerMutations(renderer, svgId, "click")).toHaveLength(1)

    events.dispatch(primaryClick(svgId))
    events.dispatch(primaryMouseUp(wrapperId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(1)
  })

  it("does not swallow repeated clicks at the same coordinates", async () => {
    const events = new EventRegistry()
    const parentId = 71
    const svgId = 72
    let clicks = 0

    events.activate(parentId)
    events.activate(svgId)
    events.setParent(svgId, parentId)
    events.set(parentId, "click", () => {
      clicks += 1
    })

    events.dispatch(primaryClick(svgId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(1)

    await Promise.resolve()

    events.dispatch(primaryClick(svgId))
    events.dispatch(primaryMouseUp(parentId))
    expect(clicks).toBe(2)
  })

  it("preserves consecutive direct activations on the same retained target", () => {
    const events = new EventRegistry()
    const elementId = 91
    let clicks = 0

    events.activate(elementId)
    events.set(elementId, "click", () => {
      clicks += 1
    })

    events.dispatch(primaryMouseUp(elementId))
    events.dispatch(primaryMouseUp(elementId))

    expect(clicks).toBe(2)
  })
})
