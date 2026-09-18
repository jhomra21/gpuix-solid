import type { Element as SolidElement } from "solid-js"
import {
  createComponent,
  createElement,
  effect,
  insert,
  setProp,
} from "../host/universal.js"

export type DynamicComponent =
  | string
  | ((props: Record<string, unknown>) => SolidElement)

export interface DynamicProps {
  readonly component: DynamicComponent
  readonly children?: unknown
  readonly [key: string]: unknown
}

/**
 * Render the component or intrinsic tag currently named by `component`.
 *
 * The returned accessor is intentional: Solid's universal insert path unwraps
 * it, so changing component identity replaces the rendered host subtree.
 */
export function Dynamic(props: DynamicProps): SolidElement {
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
      const universalComponent = component as Parameters<typeof createComponent>[0]
      return createComponent(universalComponent, rest) as SolidElement
    }

    const element = createElement(component)
    const propNames = Object.keys(rest).filter((key) => key !== "children")
    effect(
      () => {
        const snapshot: Record<string, unknown> = {}
        for (const key of propNames) snapshot[key] = rest[key]
        return snapshot
      },
      (snapshot: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(snapshot)) {
          setProp(element, key, value)
        }
      },
    )

    insert(element, () => rest.children)
    return element
  }) as unknown as SolidElement
}
