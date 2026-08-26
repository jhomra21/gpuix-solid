import { createComponent, splitProps, type Component, type JSX } from "solid-js"

type SvgComponentProps = JSX.SvgSVGAttributes<SVGSVGElement> & {
  size?: number | string
  class?: string
  title?: string
  ariaLabel?: string
}

type DynamicProps = SvgComponentProps & {
  component: Component<SvgComponentProps>
}

export function Dynamic(props: DynamicProps): JSX.Element {
  const [local, rest] = splitProps(props, ["component"])
  return createComponent(local.component, rest)
}
