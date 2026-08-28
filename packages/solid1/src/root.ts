import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { GpuixContext, type ViewportSize } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import { HostRootNode, removeHostNode } from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
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

export function createRoot(renderer: NativeRenderer): Root {
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  let dispose: (() => void) | undefined

  const flushNative = (): void => driver.flush()
  const getViewportSize = (): ViewportSize => {
    const nativeSize = renderer.getWindowSize?.()
    const mounted = container.children[0]
    const bounds = mounted && mounted.kind === "element"
      ? (renderer as BoundsRenderer).getElementBounds?.(mounted.id)
      : undefined
    const rootWidth = bounds?.[2] ?? 0
    const rootHeight = bounds?.[3] ?? 0
    return {
      width: Math.max(nativeSize?.width ?? 0, rootWidth, 1),
      height: Math.max(nativeSize?.height ?? 0, rootHeight, 1),
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
