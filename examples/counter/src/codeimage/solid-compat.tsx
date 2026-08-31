import {
  Suspense as SolidSuspense,
  type Element as SolidElement,
} from "solid-js"

interface SuspenseProps {
  children?: SolidElement | undefined
  fallback?: SolidElement | undefined
}

export function Suspense(props: SuspenseProps) {
  return (
    <SolidSuspense fallback={props.fallback}>
      {props.children}
    </SolidSuspense>
  )
}

export function onMount(effect: () => void): void {
  effect()
}
