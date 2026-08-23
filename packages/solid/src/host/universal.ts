import { createRenderer } from "@solidjs/universal"
import {
  createHostElement,
  createHostText,
  getFirstChild,
  getNextSibling,
  getParentNode,
  insertHostNode,
  isHostTextNode,
  removeHostNode,
  replaceHostText,
  setHostProperty,
  type HostNode,
  type HostParent,
} from "./nodes.js"

const runtime = createRenderer<HostNode | HostParent>({
  createElement(tagName, staticProps) {
    const node = createHostElement(tagName)
    if (staticProps) {
      for (const [name, value] of Object.entries(staticProps)) {
        setHostProperty(node, name, value, undefined)
      }
    }
    return node
  },
  createTextNode(value) {
    return createHostText(value)
  },
  replaceText(node, value) {
    const candidate = node as HostNode
    if (!isHostTextNode(candidate)) throw new TypeError("Expected GPUIX text node")
    replaceHostText(candidate, value)
  },
  setProperty(node, name, value, previous) {
    if ((node as HostParent).kind === "root") return
    setHostProperty(node as HostNode, name, value, previous)
  },
  insertNode(parent, node, anchor) {
    insertHostNode(parent as HostParent, node as HostNode, (anchor as HostNode | undefined) ?? null)
  },
  isTextNode(node) {
    return (node as HostNode).kind === "text"
  },
  removeNode(parent, node) {
    removeHostNode(parent as HostParent, node as HostNode)
  },
  getParentNode(node) {
    return getParentNode(node as HostNode)
  },
  getFirstChild(node) {
    return getFirstChild(node as HostParent)
  },
  getNextSibling(node) {
    return getNextSibling(node as HostNode)
  },
})

export const universalRender = runtime.render
export const effect = runtime.effect
export const memo = runtime.memo
export const createComponent = runtime.createComponent
export const createElement = runtime.createElement
export const createTextNode = runtime.createTextNode
export const insertNode = runtime.insertNode
export const insert = runtime.insert
export const spread = runtime.spread
export const setProp = runtime.setProp
export const mergeProps = runtime.mergeProps
export const use = runtime.use
export const applyRef = runtime.applyRef
export const ref = runtime.ref
