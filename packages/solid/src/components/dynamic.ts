import {
  createRenderEffect,
  type Component,
  type Element as SolidElement,
} from "solid-js"
import {
  createComponent,
  createElement,
  insert,
  setProp,
} from "../host/universal.js"

export type DynamicComponent<Props extends Record<string, unknown> = Record<string, unknown>> =
  | string
  | Component<Props>

export type DynamicProps<Props extends Record<string, unknown> = Record<string, unknown>> =
  Props & {
    component: DynamicComponent<Props>
    children?: unknown
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

  return (() => {
    const component = props.component

    if (typeof component === "function") {
      return createComponent(component, rest as Props) as SolidElement
    }

    const node = createElement(component)
    const keys = Object.keys(rest).filter((key) => key !== "children")

    createRenderEffect(
      () => {
        const snapshot = new Map<string, unknown>()
        for (const key of keys) snapshot.set(key, rest[key])
        return snapshot
      },
      (next, previous) => {
        for (const [key, value] of next) {
          const prior = previous?.get(key)
          if (previous && Object.is(value, prior)) continue
          setProp(node, key, value, prior)
        }
      },
    )

    insert(node, () => rest.children)
    return node
  }) as unknown as SolidElement
}
