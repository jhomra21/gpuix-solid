import * as base from "./gpuix-solid-canvas"
import {
  parseTwoRowGridDefinition,
  placeTwoRowGridItems,
  twoRowGridItemStyle,
  type TwoRowGridDefinition,
} from "./two-row-grid-layout"

export * from "./gpuix-solid-canvas"

type HostNode = Parameters<typeof base.setProp>[0]
type HostElement = Extract<HostNode, { kind: "element" }>
type SourceStyle = Record<string, unknown>
type SourceClasses = { class?: string; className?: string }

const sourceStyles = new WeakMap<HostElement, SourceStyle>()
const sourceClasses = new WeakMap<HostElement, SourceClasses>()
const gridDefinitions = new WeakMap<HostElement, TwoRowGridDefinition>()
const managedGridChildren = new WeakMap<HostElement, Set<HostElement>>()

export function setProp<T>(node: HostNode, name: string, value: T, previous?: T): void {
  if (node.kind !== "element") {
    base.setProp(node, name, value, previous)
    return
  }

  if (name === "style") {
    const style = readSourceStyle(value)
    if (!style) {
      sourceStyles.delete(node)
      clearGridDefinition(node)
      base.setProp(node, name, value, previous)
      syncParentGrid(node)
      return
    }

    sourceStyles.set(node, style)
    const definition = parseTwoRowGridDefinition(
      optionalStyleText(style, "grid-template-columns"),
      optionalStyleText(style, "grid-template-rows"),
    )
    if (definition) gridDefinitions.set(node, definition)
    else clearGridDefinition(node)

    base.setProp(node, name, nativeSourceStyle(style, definition))
    syncGrid(node)
    syncParentGrid(node)
    return
  }

  if (name === "class" || name === "className") {
    const state = sourceClasses.get(node) ?? {}
    const next = value == null ? undefined : String(value)
    if (name === "class") state.class = next
    else state.className = next
    sourceClasses.set(node, state)
    base.setProp(node, name, value, previous)
    syncParentGrid(node)
    return
  }

  base.setProp(node, name, value, previous)
}

export function insertNode(
  parent: Parameters<typeof base.insertNode>[0],
  node: Parameters<typeof base.insertNode>[1],
  anchor?: Parameters<typeof base.insertNode>[2],
): void {
  base.insertNode(parent, node, anchor)
  if (parent.kind === "element") syncGrid(parent)
}

function readSourceStyle(value: unknown): SourceStyle | undefined {
  if (value === null || Array.isArray(value) || Object(value) !== value) return undefined
  return Object.fromEntries(Object.entries(value))
}

function optionalStyleText(style: SourceStyle, property: string): string | undefined {
  const value = style[property]
  return value === undefined || value === null ? undefined : String(value)
}

function nativeSourceStyle(style: SourceStyle, definition: TwoRowGridDefinition | undefined): SourceStyle {
  const next = Object.fromEntries(
    Object.entries(style).filter(([property]) => property !== "grid-template-rows"),
  )
  if (definition && next.position === undefined) next.position = "relative"
  return next
}

function clearGridDefinition(node: HostElement): void {
  gridDefinitions.delete(node)
  restoreManagedChildren(node)
}

function syncParentGrid(node: HostElement): void {
  const parent = node.parent
  if (parent?.kind === "element") syncGrid(parent)
}

function syncGrid(parent: HostElement): void {
  const definition = gridDefinitions.get(parent)
  if (!definition) return

  const children = parent.children.filter((child): child is HostElement => child.kind === "element")
  const rowSpans = children.map((child): 1 | 2 => hasClassToken(child, "row-span-2") ? 2 : 1)
  const placements = placeTwoRowGridItems(rowSpans)
  if (!placements || placements.length !== children.length) {
    restoreManagedChildren(parent)
    return
  }

  const managed = managedGridChildren.get(parent) ?? new Set<HostElement>()
  managedGridChildren.set(parent, managed)

  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    const placement = placements[index]
    if (!child || !placement) continue
    const authored = sourceStyles.get(child) ?? {}
    base.setProp(child, "style", {
      ...authored,
      ...twoRowGridItemStyle(definition, placement),
    })
    managed.add(child)
  }
}

function restoreManagedChildren(parent: HostElement): void {
  const managed = managedGridChildren.get(parent)
  if (!managed) return
  for (const child of managed) base.setProp(child, "style", sourceStyles.get(child) ?? {})
  managed.clear()
}

function hasClassToken(node: HostElement, token: string): boolean {
  const classes = sourceClasses.get(node)
  const combined = `${classes?.class ?? ""} ${classes?.className ?? ""}`
  return combined.split(/\s+/).includes(token)
}
