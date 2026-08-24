import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { EventRegistry } from "../../../../packages/solid/src/host/events.js"
import { MutationDriver } from "../../../../packages/solid/src/host/mutations.js"
import {
  HostRootNode,
  removeHostNode,
} from "../../../../packages/solid/src/host/nodes.js"
import type { NativeRenderer } from "../../../../packages/solid/src/host/types.js"
import { universalRender } from "./universal.js"

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

      dispose = universalRender(code, container)
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
