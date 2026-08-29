import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { installBrowserElementIdentity } from "./browser-element-identity.js"
import { installBrowserEventCompatibility } from "./browser-event-compat.js"
import { GpuixContext, type ViewportSize } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import { HostRootNode, removeHostNode } from "./host/nodes.js"
import type { DimensionValue, NativeRenderer } from "./host/types.js"
import { universalRender } from "./universal.js"

export interface Root {
  render(code: () => JSX.Element): void
  flush(): void
  flushSync<Value>(fn: () => Value): Value
  dispatch(event: EventPayload): void
  unmount(): void
}

type BoundsRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
}

function numericDimension(value: DimensionValue | undefined): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function elementBounds(renderer: NativeRenderer, elementId: number): number[] | null | undefined {
  // SAFETY: production GPUIX renderers and the native test renderer expose the synchronous getElementBounds capability; it remains optional for older bindings.
  const boundsRenderer = renderer as BoundsRenderer
  return boundsRenderer.getElementBounds?.(elementId)
}

export function createRoot(renderer: NativeRenderer): Root {
  installBrowserElementIdentity()
  installBrowserEventCompatibility()
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  let dispose: (() => void) | undefined

  const flushNative = (): void => driver.flush()
  const getViewportSize = (): ViewportSize => {
    const nativeSize = renderer.getWindowSize?.()
    const mounted = container.children[0]
    const bounds = mounted && mounted.kind === "element"
      ? elementBounds(renderer, mounted.id)
      : undefined
    const styleWidth = mounted && mounted.kind === "element" ? numericDimension(mounted.style.width) : 0
    const styleHeight = mounted && mounted.kind === "element" ? numericDimension(mounted.style.height) : 0
    return {
      width: Math.max(nativeSize?.width ?? 800, bounds?.[2] ?? 0, styleWidth),
      height: Math.max(nativeSize?.height ?? 600, bounds?.[3] ?? 0, styleHeight),
    }
  }

  return {
    render(code) {
      if (dispose) {
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flushNative()
        events.clear()
      }

      dispose = universalRender(
        () => GpuixContext.Provider({
          value: { renderer, getViewportSize },
          get children() {
            return code()
          },
        }),
        container,
      )
      flushNative()
    },
    flush: flushNative,
    flushSync(fn) {
      try {
        return fn()
      } finally {
        flushNative()
      }
    },
    dispatch(event) {
      try {
        events.dispatch(event)
      } finally {
        flushNative()
      }
    },
    unmount() {
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      flushNative()
      events.clear()
      driver.dispose()
    },
  }
}
