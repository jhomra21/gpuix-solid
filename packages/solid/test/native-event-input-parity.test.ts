import type { EventPayload } from "@gpuix/native"
import { createRenderEffect, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import {
  createElement,
  insert,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

function bindValue(
  node: ReturnType<typeof createElement>,
  value: () => string,
): void {
  createRenderEffect(
    value,
    (next, previous) => {
      setProp(node, "value", next, previous)
    },
  )
}

function createReactiveText(value: () => string): ReturnType<typeof createElement> {
  const text = createElement("text")
  insert(text, value)
  return text
}

describe("native event/input parity", () => {
  nativeIt("edits a controlled input and emits the complete value", () => {
    const testRoot = createTestRoot()
    const [value, setValue] = createSignal("")

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 100 })

      const input = createElement("input")
      setProp(input, "placeholder", "Type here...")
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onChange", (event: EventPayload) => {
        setValue(event.value ?? "")
      })
      bindValue(input, value)

      const label = createReactiveText(() => `Value: ${value()}`)
      insertNode(root, input)
      insertNode(root, label)
      return root
    })

    const input = testRoot.renderer.findByType("input")[0]
    expect(input).toBeDefined()
    testRoot.renderer.nativeSimulateKeystrokes(input?.id ?? 0, "h i")

    expect(testRoot.renderer.getAllText()).toContain("Value: hi")
    expect(testRoot.renderer.getPaintedText()).toContain("hi")
    testRoot.unmount()
  })

  nativeIt("gives an unstyled controlled range intrinsic bounds and commits a drag", () => {
    const testRoot = createTestRoot()
    const [value, setValue] = createSignal("0")
    let range: HostElementNode | undefined

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 80 })

      const rangeNode = createElement("input")
      if (rangeNode.kind !== "element") throw new TypeError("Expected host range element")
      range = rangeNode
      setProp(rangeNode, "type", "range")
      setProp(rangeNode, "min", "-60")
      setProp(rangeNode, "max", "6.02")
      setProp(rangeNode, "step", "0.1")
      setProp(rangeNode, "onChange", () => setValue(rangeNode.value))
      bindValue(rangeNode, value)

      insertNode(root, rangeNode)
      return root
    })

    expect(range).toBeDefined()
    const bounds = range?.getBoundingClientRect()
    expect(bounds?.width).toBeGreaterThan(100)
    expect(bounds?.height).toBeGreaterThan(0)

    const startX = (bounds?.left ?? 0) + 4
    const y = (bounds?.top ?? 0) + (bounds?.height ?? 0) / 2
    testRoot.renderer.nativeSimulateMouseDown(startX, y, 0)
    testRoot.renderer.nativeSimulateMouseMove(startX + 20, y, 0)
    testRoot.renderer.nativeSimulateMouseUp(startX + 20, y, 0)

    expect(value()).not.toBe("0")
    expect(Number(value())).toBeGreaterThan(-60)
    testRoot.unmount()
  })

  nativeIt("supports textarea newline editing and submission", () => {
    const testRoot = createTestRoot()
    const [value, setValue] = createSignal("")
    const [submits, setSubmits] = createSignal(0)

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 160 })

      const textarea = createElement("textarea")
      setProp(textarea, "placeholder", "Write a message...")
      setProp(textarea, "minRows", 1)
      setProp(textarea, "maxRows", 4)
      setProp(textarea, "style", { width: 300 })
      setProp(textarea, "onChange", (event: EventPayload) => {
        setValue(event.value ?? "")
      })
      setProp(textarea, "onSubmit", () => {
        setSubmits((count) => count + 1)
      })
      bindValue(textarea, value)

      insertNode(root, textarea)
      insertNode(root, createReactiveText(() => `Value: ${JSON.stringify(value())}`))
      insertNode(root, createReactiveText(() => `Submits: ${submits()}`))
      return root
    })

    const textarea = testRoot.renderer.findByType("textarea")[0]
    expect(textarea).toBeDefined()
    testRoot.renderer.nativeSimulateKeystrokes(
      textarea?.id ?? 0,
      "h i shift-enter t h e r e",
    )

    expect(testRoot.renderer.getAllText()).toContain('Value: "hi\\nthere"')
    expect(testRoot.renderer.getAllText()).toContain("Submits: 0")

    testRoot.renderer.nativeSimulateKeystrokes(textarea?.id ?? 0, "enter")
    expect(testRoot.renderer.getAllText()).toContain("Submits: 1")
    testRoot.unmount()
  })

  nativeIt("focuses a native input from a real mouse click", () => {
    const testRoot = createTestRoot()
    const [value, setValue] = createSignal("")

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 100 })

      const input = createElement("input")
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onChange", (event: EventPayload) => {
        setValue(event.value ?? "")
      })
      bindValue(input, value)

      insertNode(root, input)
      insertNode(root, createReactiveText(() => `Value: ${value()}`))
      return root
    })

    testRoot.renderer.nativeSimulateClick(150, 20)
    testRoot.renderer.simulateKeystrokes("a")

    expect(testRoot.renderer.getAllText()).toContain("Value: a")
    testRoot.unmount()
  })

  nativeIt("keeps click and keyboard handlers available on native inputs", () => {
    const testRoot = createTestRoot()
    const [clicks, setClicks] = createSignal(0)
    const [keys, setKeys] = createSignal(0)

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 100 })

      const input = createElement("input")
      setProp(input, "value", "")
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onClick", () => setClicks((count) => count + 1))
      setProp(input, "onKeyDown", () => setKeys((count) => count + 1))

      insertNode(root, input)
      insertNode(root, createReactiveText(() => `Events: ${clicks()}/${keys()}`))
      return root
    })

    const input = testRoot.renderer.findByType("input")[0]
    expect(input).toBeDefined()
    testRoot.renderer.nativeSimulateClick(150, 20)
    testRoot.renderer.nativeSimulateKeyDown(input?.id ?? 0, "a")

    expect(testRoot.renderer.getAllText()).toContain("Events: 1/1")
    testRoot.unmount()
  })

  nativeIt("preserves granular keyDown/keyUp payloads", () => {
    const testRoot = createTestRoot()
    const events: EventPayload[] = []

    testRoot.render(() => {
      const input = createElement("input")
      setProp(input, "value", "")
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onKeyDown", (event: EventPayload) => events.push(event))
      setProp(input, "onKeyUp", (event: EventPayload) => events.push(event))
      return input
    })

    const input = testRoot.renderer.findByType("input")[0]
    expect(input).toBeDefined()
    testRoot.renderer.nativeSimulateKeyDown(input?.id ?? 0, "a", true)
    testRoot.renderer.nativeSimulateKeyUp(input?.id ?? 0, "a")

    expect(events).toHaveLength(2)
    expect(events[0]?.eventType).toBe("keyDown")
    expect(events[0]?.key).toBe("a")
    expect(events[0]?.isHeld).toBe(true)
    expect(events[1]?.eventType).toBe("keyUp")
    expect(events[1]?.key).toBe("a")
    testRoot.unmount()
  })

  nativeIt("delivers GPUIX 0.7 Tab to the element and window without implicit focus traversal", () => {
    const windowKeys: string[] = []
    const elementKeys: string[] = []
    const testRoot = createTestRoot(undefined, undefined, {
      onKeyDown: (event) => windowKeys.push(event.key ?? ""),
    })

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 120, display: "flex", gap: 8 })

      const first = createElement("div")
      setProp(first, "tabIndex", 0)
      setProp(first, "style", { width: 100, height: 40 })
      setProp(first, "onKeyDown", (event: EventPayload) => {
        elementKeys.push(`first:${event.modifiers?.shift ? "shift-" : ""}${event.key ?? ""}`)
      })

      const second = createElement("div")
      setProp(second, "tabIndex", 0)
      setProp(second, "style", { width: 100, height: 40 })
      setProp(second, "onKeyDown", (event: EventPayload) => {
        elementKeys.push(`second:${event.modifiers?.shift ? "shift-" : ""}${event.key ?? ""}`)
      })

      insertNode(root, first)
      insertNode(root, second)
      return root
    })

    const focusable = testRoot.renderer
      .findByType("div")
      .filter((element) => element.events.has("keyDown"))
    const first = focusable[0]
    const second = focusable[1]
    expect(first).toBeDefined()
    expect(second).toBeDefined()

    testRoot.renderer.focusElement(first?.id ?? 0)
    testRoot.renderer.simulateKeystrokes("tab")
    testRoot.renderer.simulateKeystrokes("a")

    testRoot.renderer.focusElement(second?.id ?? 0)
    testRoot.renderer.simulateKeystrokes("shift-tab")
    testRoot.renderer.simulateKeystrokes("b")

    expect(elementKeys).toEqual([
      "first:tab",
      "first:a",
      "second:shift-tab",
      "second:b",
    ])
    expect(windowKeys).toEqual(["tab", "a", "tab", "b"])
    testRoot.unmount()
  })

  nativeIt("blocks editing when input is readOnly", () => {
    const testRoot = createTestRoot()
    const [value, setValue] = createSignal("locked")

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 100 })

      const input = createElement("input")
      setProp(input, "readOnly", true)
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onChange", (event: EventPayload) => {
        setValue(event.value ?? "")
      })
      bindValue(input, value)

      insertNode(root, input)
      insertNode(root, createReactiveText(() => `Value: ${value()}`))
      return root
    })

    const input = testRoot.renderer.findByType("input")[0]
    expect(input).toBeDefined()
    testRoot.renderer.nativeSimulateKeystrokes(input?.id ?? 0, "backspace a")

    expect(testRoot.renderer.getAllText()).toContain("Value: locked")
    testRoot.unmount()
  })
})
