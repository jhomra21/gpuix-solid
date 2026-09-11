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

  it("does not swallow a later real click at the same coordinates", async () => {
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
})
