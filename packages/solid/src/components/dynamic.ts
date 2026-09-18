import {
  splitProps,
  type ComponentProps,
  type Element as SolidElement,
  type ValidComponent,
} from "solid-js"
import {
  createComponent,
  createElement,
  spread,
} from "../host/universal.js"

export type DynamicProps<T extends ValidComponent, Props = ComponentProps<T>> = {
  [K in keyof Props]: Props[K]
} & {
  component: T | undefined
}

function isHostTag(component: ValidComponent): component is string {
  return typeof component === "string"
}

function createDynamic<T extends ValidComponent>(
  component: T | undefined,
  props: ComponentProps<T>,
) {
  if (component === undefined) return undefined

  if (isHostTag(component)) {
    const node = createElement(component)
    spread(node, props)
    return node
  }

  return createComponent(component, props)
}

/**
 * Universal Dynamic helper for switching between intrinsic tags and Solid
 * components without routing through solid-js/web.
 */
export function Dynamic<T extends ValidComponent>(
  props: DynamicProps<T>,
): SolidElement {
  const [, others] = splitProps(props, ["component"])
  // SAFETY: splitProps removes only Dynamic's synthetic component key, leaving ComponentProps<T>.
  const componentProps = others as ComponentProps<T>

  // SAFETY: Solid's universal insert path unwraps accessors, so reading
  // props.component here makes intrinsic/component identity changes replace
  // the retained subtree without a web renderer.
  return (() => createDynamic(props.component, componentProps)) as SolidElement
}
