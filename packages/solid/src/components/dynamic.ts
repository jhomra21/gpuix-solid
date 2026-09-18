import {
  untrack,
  type Element as SolidElement,
} from "solid-js"
import {
  createElement,
  spread,
} from "../host/universal.js"

export type DynamicComponent<Props extends Record<string, unknown> = Record<string, unknown>> =
  | string
  | ((props: Props) => SolidElement)

export type DynamicProps<Props extends Record<string, unknown> = Record<string, unknown>> =
  Props & {
    component: DynamicComponent<Props> | undefined
    children?: unknown
  }

function isHostTag<Props extends Record<string, unknown>>(
  component: DynamicComponent<Props>,
): component is string {
  return typeof component === "string"
}

function createDynamic<Props extends Record<string, unknown>>(
  component: DynamicComponent<Props> | undefined,
  props: Props,
): SolidElement {
  if (component === undefined) return undefined

  if (isHostTag(component)) {
    const node = createElement(component)
    spread(node, props)
    return node
  }

  return untrack(() => component(props))
}

/**
 * Universal Dynamic helper for switching between intrinsic tags and Solid
 * components without routing through solid-js/web.
 */
export function Dynamic<Props extends Record<string, unknown>>(
  props: DynamicProps<Props>,
): SolidElement {
  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key === "component") continue
    Object.defineProperty(rest, key, {
      enumerable: true,
      configurable: true,
      get: () => props[key],
    })
  }

  // SAFETY: rest is the original Dynamic props object with only the synthetic
  // component key removed; its remaining getters preserve the exact Props contract.
  const componentProps = rest as Props

  // SAFETY: Solid's universal insert path unwraps accessors. Returning this
  // accessor makes component identity changes replace the retained subtree.
  return (() => createDynamic(props.component, componentProps)) as SolidElement
}
