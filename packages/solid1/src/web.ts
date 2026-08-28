import {
  createMemo,
  splitProps,
  untrack,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js"
import { createComponent, createElement, spread } from "./universal.js"

export const isServer = false

export type DynamicProps<T extends ValidComponent, P = ComponentProps<T>> = {
  [K in keyof P]: P[K]
} & {
  component: T | undefined
}

export function createDynamic<T extends ValidComponent>(
  component: () => T | undefined,
  props: ComponentProps<T>,
): JSX.Element {
  const currentComponent = createMemo(component)
  const rendered = createMemo(() => {
    const current = currentComponent()
    if (current === undefined) return undefined
    if (isHostTag(current)) {
      const element = createElement(current)
      spread(element, props)
      return element
    }
    return untrack(() => createComponent(current, props))
  })

  // SAFETY: Solid universal renderer insertion accepts reactive accessors as JSX children; this mirrors Solid's own Dynamic return contract.
  return rendered as JSX.Element
}

export function Dynamic<T extends ValidComponent>(props: DynamicProps<T>): JSX.Element {
  const [, others] = splitProps(props, ["component"])
  return createDynamic(() => props.component, others as ComponentProps<T>)
}

export function Portal(props: { children: JSX.Element }): JSX.Element {
  return props.children
}

function isHostTag(component: ValidComponent): component is keyof JSX.IntrinsicElements {
  return typeof component === "string"
}
