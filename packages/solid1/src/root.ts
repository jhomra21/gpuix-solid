import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import { HostRootNode, removeHostNode, type HostNode } from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
import { universalRender } from "./universal.js"

type UniversalRenderNode = HostRootNode | HostNode

export interface Root {
  render(code: () => JSX.Element): void
  flush(): void
  flushSync<Value>(fn: () => Value): Value
  dispatch(event: EventPayload): void
  unmount(): void
}

export function createRoot(renderer: NativeRenderer): Root {
  const events = new EventRegistry()
  const driver = new MutationDriver(renderer, events)
  const container = new HostRootNode(renderer, events, driver)
  let dispose: (() => void) | undefined

  const flushNative = (): void => driver.flush()

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

      // Solid's JSX.Element type includes provider/control-flow expressions that are not
      // host nodes until the universal renderer resolves them. The renderer's generic
      // signature only describes the eventual host value, so keep the expression intact
      // and narrow at this boundary instead of eagerly evaluating code().
      // SAFETY: universalRender resolves Solid JSX expressions before inserting them, and
      // this renderer can only materialize HostRootNode/HostNode values into this container.
      dispose = universalRender(code as () => UniversalRenderNode, container)
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
