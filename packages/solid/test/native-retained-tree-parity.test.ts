import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import type { MutationValue } from "../src/host/mutations.js"
import type { HostElementNode } from "../src/host/nodes.js"
import type { StyleDesc } from "../src/host/types.js"
import {
  createElement,
  createTextNode,
  insert,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import {
  createTestRoot,
  hasNativeTestRenderer,
  type TestRenderer,
} from "../src/testing.js"

type NativeTree = NonNullable<ReturnType<TestRenderer["toJSON"]>>

interface SnapshotNode {
  type: string
  style?: StyleDesc
  text?: string
  events?: string[]
  customProps?: Record<string, MutationValue>
  children?: SnapshotNode[]
}

function element(type: string): HostElementNode {
  const node = createElement(type)
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

function snapshot(node: NativeTree): SnapshotNode {
  const result: SnapshotNode = { type: node.type }
  if (node.style && Object.keys(node.style).length > 0) result.style = node.style
  if (node.text !== undefined && node.text !== null) result.text = node.text
  if (node.events && node.events.length > 0) result.events = [...node.events].sort()
  if (node.customProps && Object.keys(node.customProps).length > 0) {
    result.customProps = node.customProps
  }
  if (node.children && node.children.length > 0) {
    result.children = node.children.map((child) => snapshot(child))
  }
  return result
}

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native retained-tree parity", () => {
  nativeIt("matches the upstream nested style and text fixture", () => {
    const testRoot = createTestRoot()

    testRoot.render(() => {
      const root = element("div")
      setProp(root, "style", {
        display: "flex",
        flexDirection: "row",
        width: 400,
        height: 200,
        backgroundColor: "#1e1e2e",
        gap: 8,
        padding: 12,
        borderRadius: 8,
      })

      const gutter = element("div")
      setProp(gutter, "style", {
        alignSelf: "stretch",
        width: 50,
        backgroundColor: "#313244",
        flexShrink: 0,
      })
      const gutterText = element("text")
      setProp(gutterText, "style", { color: "#6c7086", fontSize: 12 })
      insertNode(gutterText, createTextNode("01"))
      insertNode(gutter, gutterText)

      const content = element("div")
      setProp(content, "style", {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        gap: 4,
      })
      const first = element("text")
      setProp(first, "style", { color: "#cdd6f4", fontSize: 14 })
      insertNode(first, createTextNode("Line content that may wrap"))
      const second = element("text")
      setProp(second, "style", { color: "#a6adc8", fontSize: 12 })
      insertNode(second, createTextNode("Second line of content"))
      insertNode(content, first)
      insertNode(content, second)

      insertNode(root, gutter)
      insertNode(root, content)
      return root
    })

    const tree = testRoot.renderer.toJSON()
    if (!tree) throw new Error("Expected native retained tree")

    expect(snapshot(tree)).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": [
              {
                "children": [
                  {
                    "text": "01",
                    "type": "text",
                  },
                ],
                "style": {
                  "color": "#6c7086",
                  "fontSize": 12,
                },
                "type": "text",
              },
            ],
            "style": {
              "alignSelf": "stretch",
              "backgroundColor": "#313244",
              "flexShrink": 0,
              "width": 50,
            },
            "type": "div",
          },
          {
            "children": [
              {
                "children": [
                  {
                    "text": "Line content that may wrap",
                    "type": "text",
                  },
                ],
                "style": {
                  "color": "#cdd6f4",
                  "fontSize": 14,
                },
                "type": "text",
              },
              {
                "children": [
                  {
                    "text": "Second line of content",
                    "type": "text",
                  },
                ],
                "style": {
                  "color": "#a6adc8",
                  "fontSize": 12,
                },
                "type": "text",
              },
            ],
            "style": {
              "display": "flex",
              "flexDirection": "column",
              "flexGrow": 1,
              "gap": 4,
            },
            "type": "div",
          },
        ],
        "style": {
          "backgroundColor": "#1e1e2e",
          "borderRadius": 8,
          "display": "flex",
          "flexDirection": "row",
          "gap": 8,
          "height": 200,
          "padding": 12,
          "width": 400,
        },
        "type": "div",
      }
    `)

    testRoot.unmount()
  })

  nativeIt("snapshots native events and custom props without JS handlers", () => {
    const testRoot = createTestRoot()

    testRoot.render(() => {
      const root = element("div")
      setProp(root, "style", { width: 320, height: 120 })
      setProp(root, "onClick", () => {})
      setProp(root, "testId", "snapshot-root")

      const input = element("input")
      setProp(input, "style", { width: 240, height: 40 })
      setProp(input, "value", "hello")
      setProp(input, "placeholder", "Search")
      setProp(input, "onChange", () => {})
      insertNode(root, input)
      return root
    })

    const tree = testRoot.renderer.toJSON()
    if (!tree) throw new Error("Expected native retained tree")

    expect(snapshot(tree)).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "customProps": {
              "placeholder": "Search",
              "value": "hello",
            },
            "events": [
              "change",
            ],
            "style": {
              "height": 40,
              "width": 240,
            },
            "type": "input",
          },
        ],
        "customProps": {
          "testId": "snapshot-root",
        },
        "events": [
          "click",
        ],
        "style": {
          "height": 120,
          "width": 320,
        },
        "type": "div",
      }
    `)

    testRoot.unmount()
  })

  nativeIt("preserves native node identity while Solid reorders children", () => {
    const testRoot = createTestRoot()
    const [order, setOrder] = createSignal<HostElementNode[]>([])
    let alpha!: HostElementNode
    let beta!: HostElementNode
    let gamma!: HostElementNode

    testRoot.render(() => {
      const root = element("div")
      alpha = element("text")
      beta = element("text")
      gamma = element("text")
      insertNode(alpha, createTextNode("alpha"))
      insertNode(beta, createTextNode("beta"))
      insertNode(gamma, createTextNode("gamma"))
      setOrder([alpha, beta, gamma])
      insert(root, order)
      return root
    })

    const ids = [alpha.id, beta.id, gamma.id]
    expect(ids.every((id) => id > 0)).toBe(true)
    expect(testRoot.renderer.getRoot()?.children).toEqual(ids)

    setOrder([gamma, alpha, beta])
    testRoot.root.flush()
    testRoot.renderer.flush()

    expect([alpha.id, beta.id, gamma.id]).toEqual(ids)
    expect(testRoot.renderer.getRoot()?.children).toEqual([gamma.id, alpha.id, beta.id])
    expect(testRoot.renderer.getAllText()).toEqual(["gamma", "alpha", "beta"])

    testRoot.unmount()
  })
})
