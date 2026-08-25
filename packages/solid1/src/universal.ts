import { createRoot as createSolidRoot, type JSX } from "solid-js"
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
  type HostElementNode,
  type HostNode,
  type HostParent,
} from "./host/nodes.js"
import type { StyleDesc } from "./host/types.js"
import {
  mergeNativeStyles,
  onNativeStyleEnvironmentChange,
  resolveNativeClassStyle,
  type NativeClassList,
} from "./native-style.js"

interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
}

const styleStates = new WeakMap<HostElementNode, NativeStyleState>()
const classStyledNodes = new Set<HostElementNode>()

onNativeStyleEnvironmentChange(() => {
  for (const node of classStyledNodes) {
    if (!node.nativeAlive) {
      classStyledNodes.delete(node)
      continue
    }
    applyNativeStyleState(node)
  }
})

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
    if (node.kind === "element") {
      if (name === "style") {
        setHostProperty(node, name, value, previous)
        setNativeInlineStyle(node, node.style)
        return
      }
      if (name === "class") {
        setNativeClass(node, parseNativeClassName(value))
        return
      }
      if (name === "className") {
        setNativeClassName(node, parseNativeClassName(value))
        return
      }
      if (name === "classList") {
        setNativeClassList(node, parseNativeClassList(value))
        return
      }
    }
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
    if (node.kind === "element") classStyledNodes.delete(node)
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

export function universalRender(code: () => JSX.Element, node: HostNode | HostParent): () => void {
  return createSolidRoot((dispose) => {
    runtime.insert(node, code())
    return dispose
  })
}

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

function parseNativeClassName<T>(value: T): string | undefined {
  return value == null ? undefined : String(value)
}

function parseNativeClassList<T>(value: T): NativeClassList | undefined {
  if (value == null) return undefined
  const parsed: NativeClassList = {}
  for (const [candidate, enabled] of Object.entries(Object(value))) {
    parsed[candidate] = Boolean(enabled)
  }
  return parsed
}

function nativeStyleState(node: HostElementNode): NativeStyleState {
  return styleStates.get(node) ?? {
    class: undefined,
    className: undefined,
    classList: undefined,
    inlineStyle: undefined,
  }
}

function setNativeInlineStyle(node: HostElementNode, style: StyleDesc | undefined): void {
  const state = nativeStyleState(node)
  state.inlineStyle = style
  commitNativeStyleState(node, state)
}

function setNativeClass(node: HostElementNode, className: string | undefined): void {
  const state = nativeStyleState(node)
  state.class = className
  commitNativeStyleState(node, state)
}

function setNativeClassName(node: HostElementNode, className: string | undefined): void {
  const state = nativeStyleState(node)
  state.className = className
  commitNativeStyleState(node, state)
}

function setNativeClassList(node: HostElementNode, classList: NativeClassList | undefined): void {
  const state = nativeStyleState(node)
  state.classList = classList
  commitNativeStyleState(node, state)
}

function commitNativeStyleState(node: HostElementNode, state: NativeStyleState): void {
  styleStates.set(node, state)
  if (hasNativeClasses(state)) classStyledNodes.add(node)
  else classStyledNodes.delete(node)
  applyNativeStyleState(node)
}

function hasNativeClasses(state: NativeStyleState): boolean {
  if (state.class?.trim() || state.className?.trim()) return true
  return Boolean(state.classList && Object.values(state.classList).some(Boolean))
}

function applyNativeStyleState(node: HostElementNode): void {
  const state = styleStates.get(node)
  if (!state) return
  const className = [state.class, state.className].filter(Boolean).join(" ") || undefined
  const classStyle = resolveNativeClassStyle(className, state.classList)
  setHostProperty(node, "style", mergeNativeStyles(classStyle, state.inlineStyle) ?? {})
}
