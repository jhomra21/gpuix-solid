import type { Element as SolidElement } from "solid-js"

interface SuspenseProps {
  children?: SolidElement | undefined
  fallback?: SolidElement | undefined
}

export function Suspense(props: SuspenseProps) {
  return <>{props.children ?? props.fallback}</>
}

export function onMount(effect: () => void): void {
  effect()
}
