import { createRenderer } from "solid-js/universal"
import {
  createHostElement,
  createHostText,
  getFirstChild as getHostFirstChild,
  getNextSibling as getHostNextSibling,
  getParentNode as getHostParentNode,
  insertHostNode,
  isHostTextNode,
  removeHostNode,
  replaceHostText,
  setHostProperty,
  type HostNode,
  type HostParent,
} from "./host/nodes.js"

const runtime = createRenderer<HostNode | HostParent>({
  createElement(tagName) {
    return createHostElement(tagName)
  },
  createTextNode(value) {
    return createHostText(value)
  },
  replaceText(node, value) {
    if (!isHostTextNode(node)) throw new TypeError("Expected GPUIX text node")
    replaceHostText(node, value)
  },
  setProperty(node, name, value, previous) {
    if (node.kind === "root") return
    setHostProperty(node, name, value, previous)
  },
  insertNode(parent, node, anchor) {
    if (parent.kind === "text" || node.kind === "root") {
      throw new TypeError("Expected a GPUIX parent and child host node")
    }
    if (anchor?.kind === "root") throw new TypeError("Expected a GPUIX host node anchor")
    insertHostNode(parent, node, anchor ?? null)
  },
  isTextNode(node) {
    return node.kind === "text"
  },
  removeNode(parent, node) {
    if (parent.kind === "text" || node.kind === "root") {
      throw new TypeError("Expected a GPUIX parent and child host node")
    }
    removeHostNode(parent, node)
  },
  getParentNode(node) {
    return node.kind === "root" ? undefined : getHostParentNode(node)
  },
  getFirstChild(node) {
    return node.kind === "text" ? undefined : getHostFirstChild(node)
  },
  getNextSibling(node) {
    return node.kind === "root" ? undefined : getHostNextSibling(node)
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
