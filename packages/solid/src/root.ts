import type { EventPayload } from "@gpuix/native"
import { flush as flushSolid, type Element as SolidElement } from "solid-js"
import { GpuixContext, type GpuixContextValue } from "./context.js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
import { createComponent, universalRender } from "./host/universal.js"

export interface Root {
  render(code: () => SolidElement): void
  flush(): void
  flushSync<T>(fn: () => T): T
  dispatch(event: EventPayload): void
  unmount(): void
}

export function createRoot(renderer: NativeRenderer): Root {
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  let dispose: (() => void) | undefined

  const flushNative = (): void => driver.flush()
  const flush = (): void => {
    flushSolid()
    flushNative()
  }
  const flushSync = <T,>(fn: () => T): T => {
    try {
      return flushSolid(fn)
    } finally {
      flushNative()
    }
  }
  const contextValue: GpuixContextValue = { renderer, flushSync }

  return {
    render(code) {
      if (dispose) {
        dispose()
        dispose = undefined
        const mounted = container.children[0]
        if (mounted) removeHostNode(container, mounted)
        flush()
        events.clear()
      }

      type UniversalNode = HostRootNode | HostNode
      type ContextProps = { value: GpuixContextValue; readonly children: SolidElement }
      const Context = (props: ContextProps): UniversalNode => {
        // SAFETY: the Solid context provider returns the active renderer's host child.
        return GpuixContext(props) as UniversalNode
      }

      dispose = universalRender(
        () =>
          createComponent(Context, {
            value: contextValue,
            get children() {
              return code()
            },
          }),
        container,
      )
      flush()
    },
    flush,
    flushSync,
    dispatch(event) {
      try {
        flushSolid(() => events.dispatch(event))
      } finally {
        flushNative()
      }
    },
    unmount() {
      dispose?.()
      dispose = undefined
      const mounted = container.children[0]
      if (mounted) removeHostNode(container, mounted)
      flush()
      events.clear()
      driver.dispose()
    },
  }
}
