import {
  splitProps,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js"
import { createElement, spread } from "./universal.js"

export const isServer = false

export type DynamicProps<T extends ValidComponent, P = ComponentProps<T>> = {
  [K in keyof P]: P[K]
} & {
  component: T | undefined
}

export function createDynamic<T extends ValidComponent>(
  component: () => T | undefined,
  props: ComponentProps<T>,
) {
  const current = component()
  if (current === undefined) return undefined
  if (isHostTag(current)) {
    const element = createElement(current)
    installSemanticTagMetadata(element, current)
    spread(element, props)
    return element
  }
  return current(props)
}

export function Dynamic<T extends ValidComponent>(props: DynamicProps<T>) {
  const [, others] = splitProps(props, ["component"])
  // SAFETY: splitProps removes only the synthetic `component` key, leaving the exact ComponentProps<T> payload passed to Dynamic.
  const componentProps = others as ComponentProps<T>
  return createDynamic(() => props.component, componentProps)
}

export function Portal(props: { children: JSX.Element }): JSX.Element {
  return props.children
}

function isHostTag(component: ValidComponent): component is string {
  return typeof component === "string"
}

function installSemanticTagMetadata(element: ReturnType<typeof createElement>, tagName: string): void {
  const localName = tagName.toLowerCase()
  const nodeName = localName.toUpperCase()
  Object.defineProperties(element, {
    tagName: { configurable: true, enumerable: true, value: nodeName },
    nodeName: { configurable: true, enumerable: true, value: nodeName },
    localName: { configurable: true, enumerable: true, value: localName },
    matches: {
      configurable: true,
      enumerable: true,
      value: (selector: string) => selector
        .split(",")
        .map((candidate) => candidate.trim().toLowerCase())
        .includes(localName),
    },
    contains: {
      configurable: true,
      enumerable: true,
      value: (child: ReturnType<typeof createElement> | null) => {
        let current = child
        while (current) {
          if (current === element) return true
          const parent = current.parent
          if (!parent || parent.kind === "root") return false
          current = parent
        }
        return false
      },
    },
  })
}
