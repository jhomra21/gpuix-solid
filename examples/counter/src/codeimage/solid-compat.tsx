import type { Element as SolidElement } from "solid-js"

interface SuspenseProps {
  children?: SolidElement | undefined
  fallback?: SolidElement | undefined
}

export function Suspense(props: SuspenseProps) {
  return <>{props.children}</>
}

export function onMount(effect: () => void): void {
  effect()
}
