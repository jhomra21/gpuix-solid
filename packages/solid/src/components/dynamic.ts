import {
  untrack,
  type Element as SolidElement,
} from "solid-js"
import {
  createElement,
  spread,
} from "../host/universal.js"

export type DynamicComponent<Props extends object = object> =
  | string
  | ((props: Props) => SolidElement)

export type DynamicProps<Props extends object = object> =
  Props & {
    component: DynamicComponent<Props> | undefined
  }

function isHostTag<Props extends object>(
  component: DynamicComponent<Props>,
): component is string {
  return typeof component === "string"
}

function omitComponent<Props extends object>(
  props: DynamicProps<Props>,
): Props {
  const proxy = new Proxy(props, {
    ownKeys(target) {
      return Reflect.ownKeys(target).filter((key) => key !== "component")
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "component") return undefined
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
    get(target, key, receiver) {
      if (key === "component") return undefined
      return Reflect.get(target, key, receiver)
    },
  })

  // SAFETY: the proxy preserves every original prop except Dynamic's synthetic
  // component key, so consumers observe the exact Props contract.
  return proxy as Props
}

function createDynamic<Props extends object>(
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
export function Dynamic<Props extends object>(
  props: DynamicProps<Props>,
): SolidElement {
  const componentProps = omitComponent(props)

  // SAFETY: Solid's universal insert path unwraps accessors. Returning this
  // accessor makes component identity changes replace the retained subtree.
  return (() => createDynamic(props.component, componentProps)) as SolidElement
}
