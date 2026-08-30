import { type HostElementNode, type HostNode, type HostRootNode } from "./host/nodes.js"

const patchedNodes = new WeakSet<HostElementNode>()
const attributeAliases = new Map<string, string>([
  ["tabindex", "tabIndex"],
  ["contenteditable", "contentEditable"],
])

/**
 * Upstream browser libraries use compound selectors such as
 * `button:not([disabled]):not([hidden])` when deciding whether focus may stay
 * on a newly focused trigger. Semantic host nodes initially expose only their
 * tag identity, so install the browser selector subset those checks require.
 */
export function syncBrowserSelectorCompatibility(root: HostRootNode): void {
  for (const child of root.children) syncSelectorNode(child)
}

function syncSelectorNode(node: HostNode): void {
  if (node.kind === "text") return
  installSelectorCompatibility(node)
  for (const child of node.children) syncSelectorNode(child)
}

function installSelectorCompatibility(node: HostElementNode): void {
  if (patchedNodes.has(node)) return
  patchedNodes.add(node)
  Object.defineProperty(node, "matches", {
    configurable: true,
    enumerable: true,
    value: (selector: string) => selector
      .split(",")
      .some((candidate) => matchesCompoundSelector(node, candidate.trim())),
  })
}

function matchesCompoundSelector(node: HostElementNode, selector: string): boolean {
  if (!selector) return false
  if (selector === "*") return true

  const negativeAttributes = [...selector.matchAll(/:not\((\[[^)]+\])\)/g)]
    .map((match) => match[1])
    .filter((match): match is string => match !== undefined)
  const base = selector.replace(/:not\((\[[^)]+\])\)/g, "")
  const tag = /^[A-Za-z][A-Za-z0-9-]*/.exec(base)?.[0]
  if (tag && node.localName !== tag.toLowerCase()) return false

  for (const attribute of base.match(/\[[^\]]+\]/g) ?? []) {
    if (!matchesAttribute(node, attribute)) return false
  }
  for (const attribute of negativeAttributes) {
    if (matchesAttribute(node, attribute)) return false
  }

  return Boolean(tag) || base.includes("[")
}

function matchesAttribute(node: HostElementNode, selector: string): boolean {
  const expression = selector.slice(1, -1).trim()
  const separator = expression.indexOf("=")
  if (separator < 0) return hostAttribute(node, expression) !== null

  const name = expression.slice(0, separator).trim()
  const expected = unquote(expression.slice(separator + 1).trim())
  return hostAttribute(node, name) === expected
}

function hostAttribute(node: HostElementNode, name: string): string | null {
  const canonicalName = attributeAliases.get(name.toLowerCase()) ?? name
  const value = node.props.get(name) ?? node.props.get(canonicalName)
  if (value === undefined || value === null || value === false) return null
  return value === true ? "" : String(value)
}

function unquote(value: string): string {
  if (value.length < 2) return value
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1)
  }
  return value
}
