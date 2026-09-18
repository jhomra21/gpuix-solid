import {
  createElement,
  effect,
  insert,
  setProp,
} from "./host/universal.js"

export type HNode = ReturnType<typeof createElement>

export type HChild =
  | HNode
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly HChild[]
  | (() => HChild)

export type HProps = Record<string, unknown> & {
  children?: HChild
}

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

function bindAccessor(
  node: HNode,
  name: string,
  read: () => unknown,
): void {
  effect(
    read,
    (next, previous) => {
      setProp(node, name, next, previous)
    },
  )
}

function createH(): H {
  return (tag, rawProps, ...children) => {
    const node = createElement(tag)
    const props = rawProps ?? {}

    for (const [name, value] of Object.entries(props)) {
      if (name === "children") continue
      if (ACCESSOR_PROPS.has(name) && typeof value === "function") {
        bindAccessor(node, name, value as () => unknown)
        continue
      }
      setProp(node, name, value)
    }

    const propChildren = props.children
    if (propChildren !== undefined) insert(node, propChildren)
    for (const child of children) insert(node, child)

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
