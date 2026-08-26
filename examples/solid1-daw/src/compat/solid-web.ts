import { createComponent, splitProps, type Component, type JSX } from "solid-js"

type DynamicProps = {
  component: Component<any>
  [key: string]: unknown
}

export function Dynamic(props: DynamicProps): JSX.Element {
  const [local, rest] = splitProps(props, ["component"])
  return createComponent(local.component, rest)
}
