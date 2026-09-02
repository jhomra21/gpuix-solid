import { describe, expect, it } from "vitest"
import { createRoot } from "../src/root.js"
import type { EventPayload, LinearGradientBackground } from "../src/host/types.js"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import {
  HostRootNode,
  createHostElement,
  insertHostNode,
  setHostProperty,
} from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

describe("published GPUIX 0.7 host surface", () => {
  it("forwards highlight from a built-in div and registers published events", () => {
    const renderer = new FakeRenderer()
    const events = new EventRegistry()
    const driver = new MutationDriver(renderer, events)
    const root = new HostRootNode(renderer, events, driver)
    const container = createHostElement("div")
    const highlight = { query: "Solid", activeIndex: 1, matchIndexOffset: 4 }
    const gradient: LinearGradientBackground = {
      type: "linear-gradient",
      angle: 90,
      stops: [
        { color: "#7c3aed", position: 0 },
        { color: "#06b6d4", position: 1 },
      ],
      colorSpace: "oklab",
    }

    setHostProperty(container, "style", { background: gradient }, undefined)
    setHostProperty(container, "highlight", highlight, undefined)
    setHostProperty(container, "onHighlight", () => undefined, undefined)
    setHostProperty(container, "onAuxClick", () => undefined, undefined)
    insertHostNode(root, container)
    driver.flush()

    const batch = renderer.batches[0]
    expect(batch).toContainEqual(["setStyle", 1, { background: gradient }])
    expect(batch).toContainEqual(["setCustomProp", 1, "highlight", highlight])
    expect(batch).toContainEqual(["setEventListener", 1, "highlight", true])
    expect(batch).toContainEqual(["setEventListener", 1, "auxClick", true])
  })

  it("routes app-owned window key events through the 0.7 renderer contract", () => {
    const renderer = new FakeRenderer()
    let keyDown = ""
    const root = createRoot(renderer, {
      onKeyDown(event, nativeRenderer) {
        keyDown = event.key ?? ""
        if (event.key === "tab") nativeRenderer.focusNext?.()
      },
    })

    const registration = renderer.windowKeyEvents.at(-1)
    expect(registration?.[0]).toBe(true)
    expect(registration?.[1]).toBe(false)
    const eventId = registration?.[2]
    expect(eventId).toBeTypeOf("number")

    root.dispatch({
      elementId: eventId as number,
      eventType: "windowKeyDown",
      key: "tab",
      modifiers: { shift: false, ctrl: false, alt: false, cmd: false },
    } satisfies EventPayload)

    expect(keyDown).toBe("tab")
    expect(renderer.focusNextCount).toBe(1)
    root.unmount()
    expect(renderer.windowKeyEvents.at(-1)).toEqual([false, false, eventId])
  })
})
