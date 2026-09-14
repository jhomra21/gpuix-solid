import type { HostElementNode } from "./host/nodes.js"
import type { StyleDesc } from "./host/types.js"
import { createElement, createTextNode, insertNode, setProp } from "./host/universal.js"

export interface RuntimeErrorDetails {
  message: string
  stack: string
}

function element(type: string): HostElementNode {
  const node = createElement(type)
  if (node.kind !== "element") throw new TypeError(`Expected GPUIX <${type}> element`)
  return node
}

function text(content: string, style: StyleDesc): HostElementNode {
  const node = element("text")
  setProp(node, "style", style)
  insertNode(node, createTextNode(content))
  return node
}

export function createRuntimeErrorOverlay(
  error: RuntimeErrorDetails,
  onReload: () => void,
): HostElementNode {
  const root = element("div")
  setProp(root, "testId", "runtime-error-overlay")
  setProp(root, "style", {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 32,
    gap: 16,
    backgroundColor: "#1c0b0b",
    pointerEvents: "auto",
  })

  insertNode(root, text("Runtime error", {
    fontSize: 22,
    fontWeight: 700,
    color: "#f87171",
  }))

  const stack = element("div")
  setProp(stack, "testId", "runtime-error-stack")
  setProp(stack, "style", {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minHeight: 0,
    overflowY: "scroll",
    gap: 2,
  })
  const lines = error.stack.length === 0 ? [error.message] : error.stack.split("\n")
  for (const line of lines) {
    insertNode(stack, text(line === "" ? " " : line, {
      fontSize: 13,
      color: "#fecaca",
    }))
  }
  insertNode(root, stack)

  const reload = element("div")
  setProp(reload, "testId", "runtime-error-reload")
  setProp(reload, "onClick", onReload)
  setProp(reload, "style", {
    alignSelf: "flex-start",
    padding: 10,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 8,
    backgroundColor: "#7f1d1d",
    hover: { backgroundColor: "#991b1b" },
  })
  insertNode(reload, text("Reload", {
    fontSize: 14,
    fontWeight: 600,
    color: "#fee2e2",
  }))
  insertNode(root, reload)

  return root
}
