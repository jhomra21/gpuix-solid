import type { HostEventHandler, HostRef } from "./host/types.js"
import type { MutationValue } from "./host/mutations.js"
import {
  createElement,
  effect,
  insert,
  setProp,
} from "./host/universal.js"

export type HNode = ReturnType<typeof createElement>
export type HAccessorValue = MutationValue | undefined
export type HAccessor = () => HAccessorValue
export type HPropValue =
  | MutationValue
  | HostEventHandler
  | HostRef
  | HAccessor
  | undefined

export type HStaticChild = HNode | string | number | boolean | null | undefined
export type HChildAccessor = () => HStaticChild
export type HChild = HStaticChild | HChildAccessor

export type HProps = Record<string, HPropValue>

export interface H {
  (tag: string, props?: HProps | null, ...children: HChild[]): HNode
}

const ACCESSOR_PROPS = new Set([
  "style",
  "class",
  "className",
  "classList",
  "source",
  "src",
  "value",
  "placeholder",
  "hidden",
  "disabled",
  "checked",
  "selected",
  "testId",
])

function isAccessor(value: HPropValue): value is HAccessor {
  return typeof value === "function"
}

function bindAccessor(
  node: HNode,
  name: string,
  read: HAccessor,
): void {
  effect(
    read,
    (next, previous) => {
      setProp(node, name, next, previous)
    },
  )
}

function isChildAccessor(child: HChild): child is HChildAccessor {
  return typeof child === "function"
}

function insertHChild(node: HNode, child: HChild): void {
  if (isChildAccessor(child)) {
    insert(node, child)
    return
  }
  insert(node, child)
}

function createH(): H {
  return (tag, rawProps, ...children) => {
    const node = createElement(tag)
    const props = rawProps ?? {}

    for (const [name, value] of Object.entries(props)) {
      if (name === "children") continue
      if (ACCESSOR_PROPS.has(name) && isAccessor(value)) {
        bindAccessor(node, name, value)
        continue
      }
      setProp(node, name, value)
    }

    for (const child of children) insertHChild(node, child)

    return node
  }
}

/**
 * Runtime authoring helper for code paths that do not pass through Solid JSX.
 *
 * Event handlers and refs remain ordinary function-valued props. Common
 * data/style props may be accessors, and function-valued children stay
 * reactive through Solid's universal insert path.
 */
export function makeH(): H {
  return createH()
}

/** Default hyperscript helper backed by GPUix Solid's universal renderer. */
export const h: H = createH()
