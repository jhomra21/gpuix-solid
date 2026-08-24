import type { HostElementNode } from "../src/host/nodes.js"
import {
  createElement,
  createTextNode,
  insertNode,
  setProp,
} from "../src/host/universal.js"

export function element(type: string): HostElementNode {
  const node = createElement(type)
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

export function createNestedStyleFixture(): HostElementNode {
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
}

export interface OrderedTextFixture {
  root: HostElementNode
  alpha: HostElementNode
  beta: HostElementNode
  gamma: HostElementNode
}

function label(text: string, color: string): HostElementNode {
  const node = element("text")
  setProp(node, "style", { color, fontSize: 18 })
  insertNode(node, createTextNode(text))
  return node
}

export function createOrderedTextFixture(): OrderedTextFixture {
  const root = element("div")
  setProp(root, "style", {
    display: "flex",
    flexDirection: "column",
    width: 320,
    height: 180,
    backgroundColor: "#11111b",
    gap: 12,
    padding: 20,
  })

  return {
    root,
    alpha: label("alpha", "#f38ba8"),
    beta: label("beta", "#a6e3a1"),
    gamma: label("gamma", "#89b4fa"),
  }
}
