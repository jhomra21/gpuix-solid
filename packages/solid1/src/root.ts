import type { EventPayload } from "@gpuix/native"
import type { JSX } from "solid-js"
import { EventRegistry } from "./host/events.js"
import { MutationDriver } from "./host/mutations.js"
import {
  createHostElement,
  HostRootNode,
  insertHostNode,
  removeHostNode,
  setHostProperty,
} from "./host/nodes.js"
import type { NativeRenderer } from "./host/types.js"
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

  const shell = createHostElement("div")
  setHostProperty(shell, "style", {
    position: "relative",
    width: "100%",
    height: "100%",
  })
  insertHostNode(container, shell)

  const appContainer = createHostElement("div")
  setHostProperty(appContainer, "style", {
    width: "100%",
    height: "100%",
  })
  insertHostNode(shell, appContainer)

  const portalTarget = createHostElement("div")
  setHostProperty(portalTarget, "style", {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: "none",
  })
  insertHostNode(shell, portalTarget)
  container.portalTarget = portalTarget

  let dispose: (() => void) | undefined

  const flushNative = (): void => driver.flush()
  const clearApp = (): void => {
    for (const mounted of [...appContainer.children]) removeHostNode(appContainer, mounted)
  }

  return {
    render(code) {
      if (dispose) {
        dispose()
        dispose = undefined
        clearApp()
        flushNative()
      }

      dispose = universalRender(code, appContainer)
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
      clearApp()
      removeHostNode(container, shell)
      flushNative()
      events.clear()
      driver.dispose()
    },
  }
}
