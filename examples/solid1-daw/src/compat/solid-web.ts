import { createComponent, splitProps, type Component, type JSX } from "solid-js"

type DynamicProps = {
  component: unknown
  [key: string]: unknown
}

export function Dynamic(props: DynamicProps): JSX.Element {
  const [local, rest] = splitProps(props, ["component"])
  if (typeof local.component !== "function") return null
  return createComponent(
    local.component as Component<Record<string, unknown>>,
    rest,
  )
}
