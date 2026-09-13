import type { EventPayload } from "@gpuix/native"
import { createRenderEffect, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import {
  App,
  type AutomationBackend,
  type AutomationTreeNode,
  createTestApp,
} from "../src/automation.js"
import { createElement, insert, insertNode, setProp } from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

class FillBackend implements AutomationBackend {
  readonly keys: Array<[number, string]> = []

  getTree(): AutomationTreeNode {
    return {
      id: 1,
      type: "div",
      children: [{ id: 2, type: "input", testId: "field" }],
    }
  }

  getBounds() { return null }
  click() {}
  mouseMove() {}
  mouseDown() {}
  mouseUp() {}
  scrollWheel() {}
  keystrokes(elementId: number, keys: string) { this.keys.push([elementId, keys]) }
  screenshot() {}
  clockPause() { return 0 }
  clockSet(nowMs: number) { return nowMs }
  clockFastForward(deltaMs: number) { return deltaMs }
  clockResume() { return 0 }
  close() {}
}

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("automation uppercase fill", () => {
  it("encodes uppercase characters as shifted keystrokes", async () => {
    const backend = new FillBackend()
    const app = new App(backend)

    await app.getByTestId("field").fill("DELETE")

    const selectAll = process.platform === "darwin" ? "cmd-a" : "ctrl-a"
    expect(backend.keys).toEqual([[
      2,
      `${selectAll} shift-d shift-e shift-l shift-e shift-t shift-e`,
    ]])
  })

  nativeIt("fills uppercase text through the real controlled native input", async () => {
    const testRoot = createTestRoot()
    const app = createTestApp(testRoot.renderer)
    const [value, setValue] = createSignal("")

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 120 })

      const input = createElement("input")
      setProp(input, "testId", "field")
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onChange", (event: EventPayload) => setValue(event.value ?? ""))
      createRenderEffect(
        () => value(),
        (next, previous) => {
          setProp(input, "value", next, previous)
        },
      )

      const label = createElement("text")
      insert(label, () => `Value: ${value()}`)

      insertNode(root, input)
      insertNode(root, label)
      return root
    })

    await app.getByTestId("field").fill("DELETE")

    expect(await app.getByText("Value: DELETE").count()).toBe(1)
    testRoot.unmount()
  })
})
