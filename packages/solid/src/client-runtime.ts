import { createRenderEffect, createRoot, createSignal, flush } from "solid-js"

export type SolidClientRuntimeCheck = () => boolean

let cachedClientRuntimeReactive: boolean | undefined

/**
 * Verify that the resolved Solid runtime actually reruns reactive effects.
 *
 * Node/Bun can resolve Solid's server build when the browser export condition is
 * missing. That build can render an initial tree but does not provide the live
 * client scheduling GPUix Solid requires.
 */
export function isSolidClientRuntimeReactive(): boolean {
  const [probe, setProbe] = createSignal(0)
  let observed = -1

  const dispose = createRoot((disposeRoot) => {
    createRenderEffect(
      () => probe(),
      (value) => {
        observed = value
      },
    )
    return disposeRoot
  })

  flush()
  setProbe(1)
  flush()
  dispose()

  return observed === 1
}

export function assertSolidClientRuntime(
  check: SolidClientRuntimeCheck = isSolidClientRuntimeReactive,
): void {
  const reactive = check === isSolidClientRuntimeReactive
    ? (cachedClientRuntimeReactive ??= check())
    : check()
  if (reactive) return

  throw new Error(
    "gpuix-solid: solid-js resolved to a non-reactive server runtime. " +
      "Use the browser export condition for native apps; with Vite, use gpuix-solid/vite.",
  )
}
