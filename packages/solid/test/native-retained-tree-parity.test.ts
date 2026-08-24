import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import type { MutationValue } from "../src/host/mutations.js"
import type { HostElementNode } from "../src/host/nodes.js"
import type { StyleDesc } from "../src/host/types.js"
import { insert, insertNode, setProp } from "../src/host/universal.js"
import {
  createTestRoot,
  hasNativeTestRenderer,
  type TestRenderer,
} from "../src/testing.js"
import {
  createNestedStyleFixture,
  createOrderedTextFixture,
  element,
} from "./native-parity-fixtures.js"

type NativeTree = NonNullable<ReturnType<TestRenderer["toJSON"]>>

interface SnapshotNode {
  type: string
  testId?: string
  style?: StyleDesc
  text?: string
  events?: string[]
  customProps?: Record<string, MutationValue>
  children?: SnapshotNode[]
}

function snapshot(node: NativeTree): SnapshotNode {
  const result: SnapshotNode = { type: node.type }
  if (node.testId !== undefined) result.testId = node.testId
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
    testRoot.render(() => createNestedStyleFixture())

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
        "events": [
          "click",
        ],
        "style": {
          "height": 120,
          "width": 320,
        },
        "testId": "snapshot-root",
        "type": "div",
      }
    `)

    testRoot.unmount()
  })

  nativeIt("preserves native node identity while Solid reorders children", () => {
    const testRoot = createTestRoot()
    const { root, alpha, beta, gamma } = createOrderedTextFixture()
    const [order, setOrder] = createSignal<HostElementNode[]>([alpha, beta, gamma])

    testRoot.render(() => {
      insert(root, order)
      return root
    })

    const ids = [alpha.id, beta.id, gamma.id]
    expect(ids.every((id) => id > 0)).toBe(true)
    expect(testRoot.renderer.getRoot()?.children).toEqual(ids)

    testRoot.root.flushSync(() => setOrder([gamma, alpha, beta]))
    testRoot.renderer.flush()

    expect([alpha.id, beta.id, gamma.id]).toEqual(ids)
    expect(testRoot.renderer.getRoot()?.children).toEqual([gamma.id, alpha.id, beta.id])
    expect(testRoot.renderer.getAllText()).toEqual(["gamma", "alpha", "beta"])

    testRoot.unmount()
  })
})
