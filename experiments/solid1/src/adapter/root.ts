import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import {
  GpuixContext,
  type GpuixContextValue,
} from "./context.js"
import { EventRegistry } from "../../../../packages/solid/src/host/events.js"
import { MutationDriver } from "../../../../packages/solid/src/host/mutations.js"
import {
  HostRootNode,
  removeHostNode,
  type HostNode,
} from "../../../../packages/solid/src/host/nodes.js"
import type { NativeRenderer } from "../../../../packages/solid/src/host/types.js"
import { createComponent, universalRender } from "./universal.js"

type UniversalNode = HostRootNode | HostNode

interface ContextProps {
  value: GpuixContextValue
  readonly children: JSX.Element
}

function isUniversalNode(value: unknown): value is UniversalNode {
  if (typeof value !== "object" || value === null) return false
  const kind = Reflect.get(value, "kind")
  return kind === "root" || kind === "element" || kind === "text"
}

function Context(props: ContextProps): UniversalNode {
  const rendered = GpuixContext.Provider(props)
  if (!isUniversalNode(rendered)) {
    throw new TypeError("Solid 1 GPUI context must resolve to one host node")
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

      dispose = universalRender(
        () =>
          createComponent(Context, {
            value: { renderer },
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
