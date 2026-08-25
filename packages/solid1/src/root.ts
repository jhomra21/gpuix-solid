import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import {
  HostElementNode,
  HostRootNode,
  HostTextNode,
  removeHostNode,
  type HostNode,
} from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
import { universalRender } from "./universal.js"

type UniversalNode = HostRootNode | HostNode
type SolidRenderResult = JSX.Element

function isUniversalNode(value: SolidRenderResult | UniversalNode): value is UniversalNode {
  return value instanceof HostRootNode || value instanceof HostElementNode || value instanceof HostTextNode
}

function resolveUniversalNode(code: () => JSX.Element): UniversalNode {
  const rendered = code()
  if (!isUniversalNode(rendered)) {
    throw new TypeError("Solid 1 universal root must resolve to one GPUI host node")
  }
  return rendered
}

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

      dispose = universalRender(() => resolveUniversalNode(code), container)
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
